import { auth, currentUser } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { FREE_SEARCH_LIMIT } from './stripe';

export interface UsageResult {
  allowed: boolean;
  searchCount: number;
  searchLimit: number;
  plan: string;
  dbUserId: string;
}

function isEmailConflictError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    !!(err.meta?.target as string[] | undefined)?.includes('email')
  );
}

async function ensureUser(clerkId: string) {
  const clerkUser = await currentUser().catch(() => null);
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${clerkId}@clerk.placeholder`;

  const existing = await prisma.user.findUnique({ where: { clerkId }, select: { id: true, email: true } });

  if (existing) {
    if (existing.email === email) return; // already in sync, nothing to write

    // Only sync the email if no other account already owns it. Checking
    // first (rather than attempting the write and catching) avoids a write
    // we already know will fail — and the Prisma error log noise that comes
    // with it — for accounts whose real email permanently collides with a
    // separate identity (e.g. a dev/test Clerk user sharing an address with
    // a production account).
    const owner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!owner || owner.id === existing.id) {
      await prisma.user.update({ where: { clerkId }, data: { email } });
    }
    return;
  }

  try {
    await prisma.user.create({
      data: { clerkId, email, plan: 'free', searchCount: 0, searchLimit: FREE_SEARCH_LIMIT },
    });
  } catch (err) {
    if (!isEmailConflictError(err)) throw err;

    // Another row already owns this email. Never touch that row (could
    // merge/hijack unrelated accounts) — just create this clerkId its own
    // row with a collision-free placeholder email instead.
    await prisma.user.create({
      data: {
        clerkId,
        email: `${clerkId}@clerk.placeholder`,
        plan: 'free',
        searchCount: 0,
        searchLimit: FREE_SEARCH_LIMIT,
      },
    });
  }
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
