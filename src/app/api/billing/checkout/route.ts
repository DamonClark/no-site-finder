import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { stripe, PRO_PRICE_ID } from '@/lib/stripe';
import { prisma } from '@/lib/db';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  let customerId = user?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { clerkId: userId },
    });
    customerId = customer.id;
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: { stripeCustomerId: customerId },
      create: {
        clerkId: userId,
        email: email ?? `${userId}@clerk.placeholder`,
        stripeCustomerId: customerId,
      },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/search?upgraded=1`,
    cancel_url: `${appUrl}/search`,
    metadata: { clerkId: userId },
  });

  return NextResponse.json({ url: session.url });
}
