import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRO_SEARCH_LIMIT, FREE_SEARCH_LIMIT } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body!.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkId = session.metadata?.clerkId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (!clerkId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items.data[0];
        await prisma.user.update({
          where: { clerkId },
          data: {
            plan: 'pro',
            searchLimit: PRO_SEARCH_LIMIT,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: item?.price.id,
            stripeCurrentPeriodEnd: item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (!user) break;

        const isActive = sub.status === 'active' || sub.status === 'trialing';
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: isActive ? 'pro' : 'free',
            searchLimit: isActive ? PRO_SEARCH_LIMIT : FREE_SEARCH_LIMIT,
            stripePriceId: sub.items.data[0]?.price.id,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            plan: 'free',
            searchLimit: FREE_SEARCH_LIMIT,
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        break;
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
