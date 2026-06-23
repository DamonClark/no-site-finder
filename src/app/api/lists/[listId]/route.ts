import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

async function getDbUserId(clerkId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  return user?.id ?? null;
}

async function verifyListOwnership(userId: string, listId: string): Promise<boolean> {
  const list = await prisma.leadList.findFirst({ where: { id: listId, userId }, select: { id: true } });
  return list !== null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { listId } = await params;
  const owned = await verifyListOwnership(userId, listId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const list = await prisma.leadList.update({
    where: { id: listId },
    data: { name: name.trim() },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({
    list: {
      id: list.id,
      name: list.name,
      leadCount: list._count.items,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { listId } = await params;
  const owned = await verifyListOwnership(userId, listId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.leadList.delete({ where: { id: listId } });

  return NextResponse.json({ success: true });
}
