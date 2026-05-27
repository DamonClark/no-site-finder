import { NextRequest, NextResponse } from 'next/server';
import type { Business } from '@/types';
import { enrichBusiness } from '@/lib/enrich';

const BATCH_SIZE = 5;

export async function POST(req: NextRequest) {
  const hunterApiKey = process.env.HUNTER_API_KEY ?? '';

  let businesses: Business[];
  try {
    const body = await req.json();
    businesses = body.businesses ?? [];
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Only enrich leads that have a domain to search (broken/slow have a website URL)
  const targets = businesses.filter((b) => b.websiteStatus !== 'ok');

  const results = [];

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((b) => enrichBusiness(b, hunterApiKey)));
    results.push(...batchResults);
  }

  return NextResponse.json({ results });
}
