import { currentUser } from '@clerk/nextjs/server';

// Single-owner gate for internal-only routes/pages — no roles system needed
// at this scale, just compare against one configured email.
export async function isOwner(): Promise<boolean> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return false;
  const user = await currentUser().catch(() => null);
  const email = user?.emailAddresses[0]?.emailAddress;
  return !!email && email.toLowerCase() === ownerEmail.toLowerCase();
}
