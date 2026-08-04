import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { Business } from '@/types';
import { generateSiteContent, generateSmsText, generateEmailText, buildLovablePromptUrl } from '@/lib/generate';
import { enrichBusiness } from '@/lib/enrich';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let business: Business;
  try {
    const body = await req.json();
    business = body.business;
    if (!business?.placeId) throw new Error('Missing business');
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { calendlyUrl: true },
    });

    const siteContent = await generateSiteContent(business);

    const payload = {
      ...siteContent,
      name: business.name,
      category: business.category.split(',')[0].trim(),
      address: business.address,
      phone: business.phone,
      rating: business.rating,
      reviewCount: business.reviewCount,
      bookingUrl: user?.calendlyUrl ?? null,
    };

    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const host = req.headers.get('host') ?? 'localhost:3000';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const previewUrl = `${proto}://${host}/preview?b=${b64}`;

    // Hybrid channel strategy: prefer email where Hunter can actually find one
    // (requires a domain — broken/slow sites only), fall back to SMS otherwise.
    const [smsText, enrichment] = await Promise.all([
      generateSmsText(business, previewUrl),
      enrichBusiness(business, process.env.HUNTER_API_KEY ?? ''),
    ]);

    let email: { address: string; subject: string; body: string } | null = null;
    if (enrichment.email) {
      const draft = await generateEmailText(business, previewUrl, enrichment.ownerName);
      email = { address: enrichment.email, subject: draft.subject, body: draft.body };
    }

    // No real website, but a Facebook/Instagram/etc. page — surface for manual lookup
    // (Hunter can't use it; it's not the business's own domain).
    const socialUrl = !business.hasWebsite && business.website ? business.website : null;

    const lovableUrl = buildLovablePromptUrl(business, siteContent);

    return NextResponse.json({ previewUrl, smsText, email, socialUrl, lovableUrl });
  } catch (err) {
    console.error('[generate-outreach]', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
