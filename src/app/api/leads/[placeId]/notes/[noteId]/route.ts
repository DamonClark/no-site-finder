import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

async function getDbUserId(clerkId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  return user?.id ?? null;
}

async function verifyNoteOwnership(
  userId: string,
  placeId: string,
  noteId: string
): Promise<boolean> {
  const note = await prisma.leadNote.findFirst({
    where: {
      id: noteId,
      lead: { userId, placeId },
    },
    select: { id: true },
  });
  return note !== null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ placeId: string; noteId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { placeId, noteId } = await params;
  const { content } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const owned = await verifyNoteOwnership(userId, placeId, noteId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const note = await prisma.leadNote.update({
    where: { id: noteId },
    data: { content: content.trim() },
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ placeId: string; noteId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { placeId, noteId } = await params;

  const owned = await verifyNoteOwnership(userId, placeId, noteId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.leadNote.delete({ where: { id: noteId } });

  return NextResponse.json({ success: true });
}
