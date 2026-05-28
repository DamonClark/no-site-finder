import { NextResponse } from 'next/server';
import { processBatch } from '@/lib/places';
import { checkAndIncrementUsage } from '@/lib/usage';
import { makeKeywordCacheKey, getCachedSearch, setCachedSearch } from '@/lib/cache';

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

  // Check cache before making any Google API calls (non-fatal if DB is unavailable)
  const cacheKey = makeKeywordCacheKey(query);
  let cached = null;
  try {
    cached = await getCachedSearch(cacheKey);
  } catch (e) {
    console.error('[search] cache read failed:', e);
  }
  if (cached) {
    return NextResponse.json({ businesses: cached.results, usage, fromCache: true });
  }

  function extractKeyword(q: string): string {
    return q.split(/\s+in\s+/i)[0].trim();
  }

  function buildVariantQuery(q: string): string {
    const keyword = extractKeyword(q).replace(/s$/, '');
    const city = q.split(/\s+in\s+/i)[1]?.trim() ?? '';
    return city ? `${keyword} ${city}` : keyword;
  }

  const seenIds = new Set<string>();
  const placeIds: string[] = [];
  let cityCenter: { lat: number; lng: number } | null = null;

  // Run three search streams in parallel:
  // 1. Text Search original query (page 1 + optional page 2)
  // 2. Text Search variant query (page 1 only)
  // 3. Nearby Search (fired after we have a city center from stream 1)
  const variantQuery = buildVariantQuery(query);

  const [textData1, textDataVariant] = await Promise.all([
    fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`)
      .then((r) => r.json())
      .catch(() => ({ results: [] })),
    fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(variantQuery)}&key=${apiKey}`)
      .then((r) => r.json())
      .catch(() => ({ results: [] })),
  ]);

  // Merge results from both text searches
  for (const place of [...(textData1.results ?? []), ...(textDataVariant.results ?? [])]) {
    if (!seenIds.has(place.place_id)) {
      seenIds.add(place.place_id);
      placeIds.push(place.place_id);
      if (!cityCenter && place.geometry?.location) {
        cityCenter = place.geometry.location;
      }
    }
  }

  // Fetch page 2 of the original query and Nearby Search in parallel
  const page2Promise = textData1.next_page_token
    ? new Promise((r) => setTimeout(r, 2000)).then(() =>
        fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(textData1.next_page_token)}&key=${apiKey}`)
          .then((r) => r.json())
          .catch(() => ({ results: [] }))
      )
    : Promise.resolve({ results: [] });

  const nearbyPromise = cityCenter
    ? fetch(
        [
          'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
          `?location=${cityCenter.lat},${cityCenter.lng}`,
          `&radius=20000`,
          `&keyword=${encodeURIComponent(extractKeyword(query) || query)}`,
          `&key=${apiKey}`,
        ].join('')
      )
        .then((r) => r.json())
        .catch(() => ({ results: [] }))
    : Promise.resolve({ results: [] });

  const [page2Data, nearbyData] = await Promise.all([page2Promise, nearbyPromise]);

  for (const place of [...(page2Data.results ?? []), ...(nearbyData.results ?? [])]) {
    if (!seenIds.has(place.place_id)) {
      seenIds.add(place.place_id);
      placeIds.push(place.place_id);
    }
  }

  // Step 3: Fetch details + website checks for all unique places (capped at 80)
  const businesses = await processBatch(placeIds.slice(0, 80), apiKey);

  // Store in cache for future searches (non-blocking — don't await)
  setCachedSearch(cacheKey, businesses).catch((e) =>
    console.error('[search] cache write failed:', e)
  );

  return NextResponse.json({ businesses, usage });
}
