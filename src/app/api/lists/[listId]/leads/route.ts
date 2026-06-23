import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { PipelineStatus } from '@/types';

async function getOrCreateDbUserId(clerkId: string): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (existing) return existing.id;
  try {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${clerkId}@clerk.placeholder`;
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: { clerkId, email },
      select: { id: true },
    });
    return user.id;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getOrCreateDbUserId(clerkId);
  if (!userId) return NextResponse.json({ leads: [] });

  const { listId } = await params;

  const list = await prisma.leadList.findFirst({ where: { id: listId, userId }, select: { id: true } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const items = await prisma.leadListItem.findMany({
    where: { listId },
    orderBy: { createdAt: 'desc' },
    include: {
      lead: {
        include: { _count: { select: { notes: true } } },
      },
    },
  });

  return NextResponse.json({
    leads: items.map((item) => ({
      id: item.lead.id,
      placeId: item.lead.placeId,
      status: item.lead.status as PipelineStatus,
      snapshot: item.lead.snapshot,
      noteCount: item.lead._count.notes,
      addedAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getOrCreateDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });

  const { listId } = await params;

  const list = await prisma.leadList.findFirst({ where: { id: listId, userId }, select: { id: true } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { placeId, snapshot } = await request.json() as { placeId: string; snapshot?: unknown };
  if (!placeId) return NextResponse.json({ error: 'placeId is required' }, { status: 400 });

  const snapshotField = snapshot !== undefined
    ? { snapshot: snapshot as Prisma.InputJsonValue }
    : {};

  // Upsert the UserLead (creates if first time saving this lead)
  const lead = await prisma.userLead.upsert({
    where: { userId_placeId: { userId, placeId } },
    update: snapshotField,
    create: { userId, placeId, status: 'new', ...snapshotField },
  });

  // Add to list (ignore if already a member)
  const item = await prisma.leadListItem.upsert({
    where: { listId_leadId: { listId, leadId: lead.id } },
    update: {},
    create: { listId, leadId: lead.id },
  });

  // Touch list updatedAt so ordering stays fresh
  await prisma.leadList.update({ where: { id: listId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ item: { id: item.id, listId, placeId } });
}
