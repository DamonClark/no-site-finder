import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

async function getDbUserId(clerkId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  return user?.id ?? null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listId: string; placeId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getDbUserId(clerkId);
  if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { listId, placeId } = await params;

  // Verify list ownership and find the item
  const item = await prisma.leadListItem.findFirst({
    where: {
      listId,
      list: { userId },
      lead: { placeId, userId },
    },
    select: { id: true },
  });

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.leadListItem.delete({ where: { id: item.id } });

  return NextResponse.json({ success: true });
}
