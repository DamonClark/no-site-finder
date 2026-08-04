import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './db';
import { FREE_SEARCH_LIMIT } from './stripe';

export interface UsageResult {
  allowed: boolean;
  searchCount: number;
  searchLimit: number;
  plan: string;
  dbUserId: string;
}

async function ensureUser(clerkId: string) {
  const clerkUser = await currentUser().catch(() => null);
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${clerkId}@clerk.placeholder`;

  await prisma.user.upsert({
    where: { clerkId },
    update: { email },
    create: {
      clerkId,
      email,
      plan: 'free',
      searchCount: 0,
      searchLimit: FREE_SEARCH_LIMIT,
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
    select: { id: true, searchCount: true, searchLimit: true, plan: true },
  });

  return {
    allowed: (affected as number) > 0,
    searchCount: user!.searchCount,
    searchLimit: user!.searchLimit,
    plan: user!.plan,
    dbUserId: user!.id,
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
