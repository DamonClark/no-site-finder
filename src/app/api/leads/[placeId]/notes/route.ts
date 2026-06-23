import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

async function getDbUserId(clerkId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getDbUserId(clerkId);
  if (!userId) return NextResponse.json({ notes: [] });

  const { placeId } = await params;

  const lead = await prisma.userLead.findUnique({
    where: { userId_placeId: { userId, placeId } },
    select: { id: true },
  });

  if (!lead) return NextResponse.json({ notes: [] });

  const notes = await prisma.leadNote.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { placeId } = await params;
  const { content } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const lead = await prisma.userLead.findUnique({
    where: { userId_placeId: { userId, placeId } },
    select: { id: true },
  });

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const note = await prisma.leadNote.create({
    data: { leadId: lead.id, content: content.trim() },
  });

  return NextResponse.json({
    note: {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    },
  });
}
