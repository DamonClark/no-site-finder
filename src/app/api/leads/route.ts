import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { PipelineStatus } from '@/types';

async function getOrCreateDbUserId(clerkId: string): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (existing) return existing.id;

  // User hasn't searched yet — create a minimal record so pipeline works immediately
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

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getOrCreateDbUserId(clerkId);
  if (!userId) return NextResponse.json({ leads: [] });

  const leads = await prisma.userLead.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { notes: true } },
      listItems: { select: { listId: true } },
    },
  });

  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      placeId: l.placeId,
      status: l.status as PipelineStatus,
      snapshot: l.snapshot,
      noteCount: l._count.notes,
      listIds: l.listItems.map((li) => li.listId),
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getOrCreateDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });

  const body = await request.json();
  const { placeId, status, snapshot } = body as {
    placeId: string;
    status: PipelineStatus;
    snapshot?: unknown;
  };

  if (!placeId || !status) {
    return NextResponse.json({ error: 'placeId and status are required' }, { status: 400 });
  }

  const snapshotField = snapshot !== undefined
    ? { snapshot: snapshot as Prisma.InputJsonValue }
    : {};

  try {
    const lead = await prisma.userLead.upsert({
      where: { userId_placeId: { userId, placeId } },
      update: { status, ...snapshotField },
      create: { userId, placeId, status, ...snapshotField },
    });

    const [noteCount, listItems] = await Promise.all([
      prisma.leadNote.count({ where: { leadId: lead.id } }),
      prisma.leadListItem.findMany({ where: { leadId: lead.id }, select: { listId: true } }),
    ]);

    return NextResponse.json({
      lead: {
        id: lead.id,
        placeId: lead.placeId,
        status: lead.status as PipelineStatus,
        snapshot: lead.snapshot,
        noteCount,
        listIds: listItems.map((li) => li.listId),
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[leads POST] upsert failed:', err);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}
