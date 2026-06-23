import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

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

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getOrCreateDbUserId(clerkId);
  if (!userId) return NextResponse.json({ lists: [] });

  const lists = await prisma.leadList.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      leadCount: l._count.items,
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

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const list = await prisma.leadList.create({
    data: { userId, name: name.trim() },
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
