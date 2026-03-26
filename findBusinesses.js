import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { query } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  }

  const searchRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
  );

  const searchData = await searchRes.json();

  if (!searchData.results) {
    return NextResponse.json({ businesses: [] });
  }

  const businesses: any[] = [];

  for (const place of searchData.results) {
    const placeId = place.place_id;
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,website,formatted_address,formatted_phone_number&key=${apiKey}`
    );
    const details = await detailsRes.json();
    const result = details.result;

    if (!result?.website) {
      businesses.push({
        name: result.name,
        address: result.formatted_address,
        phone: result.formatted_phone_number || 'N/A',
      });
    }

    await new Promise((r) => setTimeout(r, 150)); // rate limit safety
  }

  return NextResponse.json({ businesses });
}
