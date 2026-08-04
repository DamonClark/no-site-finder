import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { calendlyUrl: true },
  });

  return NextResponse.json({ calendlyUrl: user?.calendlyUrl ?? null });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const raw = typeof body.calendlyUrl === 'string' ? body.calendlyUrl.trim() : '';

  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'Booking URL must start with http:// or https://' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Enter a valid URL' }, { status: 400 });
    }
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: { calendlyUrl: raw || null },
    create: {
      clerkId: userId,
      email: email ?? `${userId}@clerk.placeholder`,
      calendlyUrl: raw || null,
    },
    select: { calendlyUrl: true },
  });

  return NextResponse.json({ calendlyUrl: user.calendlyUrl });
}
