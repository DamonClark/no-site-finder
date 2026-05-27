import { NextRequest, NextResponse } from 'next/server';
import type { Business } from '@/types';
import { generateSiteContent, generateSmsText } from '@/lib/generate';

export async function POST(req: NextRequest) {
  let business: Business;
  try {
    const body = await req.json();
    business = body.business;
    if (!business?.placeId) throw new Error('Missing business');
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const siteContent = await generateSiteContent(business);

    const payload = {
      ...siteContent,
      name: business.name,
      category: business.category.split(',')[0].trim(),
      address: business.address,
      phone: business.phone,
      rating: business.rating,
      reviewCount: business.reviewCount,
    };

    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const host = req.headers.get('host') ?? 'localhost:3000';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const previewUrl = `${proto}://${host}/preview?b=${b64}`;

    const smsText = await generateSmsText(business, previewUrl);

    return NextResponse.json({ previewUrl, smsText });
  } catch (err) {
    console.error('[generate-outreach]', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
