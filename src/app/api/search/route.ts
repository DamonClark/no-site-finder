import { NextResponse } from 'next/server';
import { processBatch } from '@/lib/places';

export async function POST(req: Request) {
  const { query } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  }

  // Step 1: Collect all place IDs across up to 3 pages (max 60 results)
  const placeIds: string[] = [];
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  let pageCount = 0;

  do {
    const searchRes = await fetch(url);
    const searchData = await searchRes.json();
    if (!searchData.results) break;

    for (const place of searchData.results) {
      placeIds.push(place.place_id);
    }

    pageCount++;
    if (searchData.next_page_token && pageCount < 3) {
      await new Promise((r) => setTimeout(r, 2000)); // wait for token to activate
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${searchData.next_page_token}&key=${apiKey}`;
    } else {
      break;
    }
  } while (true);

  // Step 2: Fetch details + website checks for all unique places
  const businesses = await processBatch(placeIds, apiKey);

  return NextResponse.json({ businesses });
}
