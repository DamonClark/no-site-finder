import { NextResponse } from 'next/server';
import { processBatch } from '@/lib/places';
import { checkAndIncrementUsage } from '@/lib/usage';

export async function POST(req: Request) {
  let usage;
  try {
    usage = await checkAndIncrementUsage();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[search] checkAndIncrementUsage failed:', msg);
    if (msg === 'Unauthenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'LIMIT_REACHED', message: "You've hit your free search limit", upgrade_required: true, usage },
      { status: 402 }
    );
  }

  const { query } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  }

  // Step 1: Collect place IDs from up to 3 pages of Text Search.
  // Also capture the city center from the first result's geometry so we can
  // run a supplemental Nearby Search that surfaces lower-visibility local businesses.
  const placeIds: string[] = [];
  const seenIds = new Set<string>();
  let cityCenter: { lat: number; lng: number } | null = null;

  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  let pageCount = 0;

  do {
    const searchRes = await fetch(url);
    const searchData = await searchRes.json();
    if (!searchData.results) break;

    for (const place of searchData.results) {
      if (!seenIds.has(place.place_id)) {
        seenIds.add(place.place_id);
        placeIds.push(place.place_id);
        if (!cityCenter && place.geometry?.location) {
          cityCenter = place.geometry.location;
        }
      }
    }

    pageCount++;
    if (searchData.next_page_token && pageCount < 3) {
      await new Promise((r) => setTimeout(r, 2000)); // wait for token to activate
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${searchData.next_page_token}&key=${apiKey}`;
    } else {
      break;
    }
  } while (true);

  // Step 2: Supplemental Nearby Search around the city center (1 extra API call).
  // Text Search returns results ordered by prominence (established businesses with websites).
  // Nearby Search orders by distance, surfacing more local and lower-profile businesses
  // that are more likely to lack a website.
  if (cityCenter) {
    const keyword = query.split(/\s+in\s+/i)[0].trim() || query;
    const nearbyUrl = [
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      `?location=${cityCenter.lat},${cityCenter.lng}`,
      `&radius=20000`,
      `&keyword=${encodeURIComponent(keyword)}`,
      `&key=${apiKey}`,
    ].join('');

    try {
      const nearbyRes = await fetch(nearbyUrl);
      const nearbyData = await nearbyRes.json();
      for (const place of nearbyData.results ?? []) {
        if (!seenIds.has(place.place_id)) {
          seenIds.add(place.place_id);
          placeIds.push(place.place_id);
        }
      }
    } catch {
      // Non-fatal — proceed with text search results only
    }
  }

  // Step 3: Fetch details + website checks for all unique places (capped at 80)
  const businesses = await processBatch(placeIds.slice(0, 80), apiKey);

  return NextResponse.json({ businesses, usage });
}
