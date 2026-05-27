import { auth } from '@clerk/nextjs/server';
import { prisma } from './db';

export interface UsageResult {
  allowed: boolean;
  searchCount: number;
  searchLimit: number;
  plan: string;
}

async function ensureUser(clerkId: string) {
  await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: `${clerkId}@clerk.placeholder`,
      plan: 'free',
      searchCount: 0,
      searchLimit: 10,
    },
  });
}

export async function checkAndIncrementUsage(): Promise<UsageResult> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  await ensureUser(userId);

  // Atomic: only increments if searchCount < searchLimit (race-condition safe)
  const affected = await prisma.$executeRaw`
    UPDATE "User"
    SET "searchCount" = "searchCount" + 1
    WHERE "clerkId" = ${userId}
      AND "searchCount" < "searchLimit"
  `;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { searchCount: true, searchLimit: true, plan: true },
  });

  return {
    allowed: (affected as number) > 0,
    searchCount: user!.searchCount,
    searchLimit: user!.searchLimit,
    plan: user!.plan,
  };
}

export async function getUsage(): Promise<{ searchCount: number; searchLimit: number; plan: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { searchCount: true, searchLimit: true, plan: true },
  });

  return user;
}
