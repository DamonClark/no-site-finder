import { NextResponse } from 'next/server';
import { processBatch } from '@/lib/places';
import { checkAndIncrementUsage } from '@/lib/usage';
// import { makeKeywordCacheKey, getCachedSearch, setCachedSearch } from '@/lib/cache';

// Common trade/service synonyms to broaden search coverage beyond prominent businesses
const SYNONYM_MAP: Record<string, string[]> = {
  roofer: ['roofing contractor', 'roofing company', 'roof repair'],
  plumber: ['plumbing contractor', 'plumbing service', 'plumbing repair'],
  electrician: ['electrical contractor', 'electrical service', 'electrical repair'],
  painter: ['painting contractor', 'painting service', 'house painter'],
  landscaper: ['landscaping company', 'lawn care service', 'lawn maintenance'],
  carpenter: ['carpentry service', 'custom woodwork', 'cabinet maker'],
  hvac: ['heating and cooling', 'air conditioning service', 'hvac contractor'],
  handyman: ['handyman service', 'home repair service', 'general contractor'],
  cleaner: ['cleaning service', 'house cleaning', 'janitorial service'],
  pest: ['pest control service', 'exterminator', 'pest management'],
};

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

  // Cache disabled while usage is low — re-enable (and bump CACHE_VERSION) when traffic grows
  // const cacheKey = makeKeywordCacheKey(query);
  // const cached = await getCachedSearch(cacheKey).catch(() => null);
  // if (cached) return NextResponse.json({ businesses: cached.results, usage, fromCache: true });

  function extractKeyword(q: string): string {
    return q.split(/\s+in\s+/i)[0].trim();
  }

  function extractCity(q: string): string {
    return q.split(/\s+in\s+/i)[1]?.trim() ?? '';
  }

  // Build synonym queries: find matching synonyms for the keyword and append the city
  function buildSynonymQueries(q: string): string[] {
    const keyword = extractKeyword(q).toLowerCase();
    const city = extractCity(q);
    const synonyms =
      SYNONYM_MAP[keyword] ??
      Object.entries(SYNONYM_MAP).find(([k]) => keyword.includes(k))?.[1] ??
      [];
    return synonyms.map((s) => (city ? `${s} in ${city}` : s));
  }

  const seenIds = new Set<string>();
  const placeIds: string[] = [];
  let cityCenter: { lat: number; lng: number } | null = null;

  const synonymQueries = buildSynonymQueries(query);

  // Run all text searches in parallel: original + synonyms
  const allTextQueries = [query, ...synonymQueries];
  const textResults = await Promise.all(
    allTextQueries.map((q) =>
      fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${apiKey}`)
        .then((r) => r.json())
        .catch(() => ({ results: [] }))
    )
  );

  const textData1 = textResults[0];

  // Merge all text search results
  for (const data of textResults) {
    for (const place of data.results ?? []) {
      if (!seenIds.has(place.place_id)) {
        seenIds.add(place.place_id);
        placeIds.push(place.place_id);
        if (!cityCenter && place.geometry?.location) {
          cityCenter = place.geometry.location;
        }
      }
    }
  }

  const keyword = extractKeyword(query) || query;

  // Generate 4 cardinal points ~8 miles from city center to cover suburban areas
  // Small contractors without websites cluster in suburbs, not downtown
  function getGridPoints(center: { lat: number; lng: number }) {
    const MILES = 8;
    const latDelta = MILES / 69;
    const lngDelta = MILES / (Math.cos((center.lat * Math.PI) / 180) * 69);
    return [
      { lat: center.lat + latDelta, lng: center.lng },         // N
      { lat: center.lat - latDelta, lng: center.lng },         // S
      { lat: center.lat, lng: center.lng + lngDelta },         // E
      { lat: center.lat, lng: center.lng - lngDelta },         // W
      { lat: center.lat + latDelta * 0.7, lng: center.lng + lngDelta * 0.7 }, // NE
      { lat: center.lat - latDelta * 0.7, lng: center.lng - lngDelta * 0.7 }, // SW
    ];
  }

  function distanceNearby(loc: { lat: number; lng: number }) {
    return fetch(
      [
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        `?location=${loc.lat},${loc.lng}`,
        `&rankby=distance`,
        `&keyword=${encodeURIComponent(keyword)}`,
        `&key=${apiKey}`,
      ].join('')
    )
      .then((r) => r.json())
      .catch(() => ({ results: [] }));
  }

  // Fetch page 2, prominence-ranked center search, and all distance-ranked grid searches in parallel
  const page2Promise = textData1.next_page_token
    ? new Promise((r) => setTimeout(r, 2000)).then(() =>
        fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(textData1.next_page_token)}&key=${apiKey}`)
          .then((r) => r.json())
          .catch(() => ({ results: [] }))
      )
    : Promise.resolve({ results: [] });

  const nearbyProminencePromise = cityCenter
    ? fetch(
        [
          'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
          `?location=${cityCenter.lat},${cityCenter.lng}`,
          `&radius=20000`,
          `&keyword=${encodeURIComponent(keyword)}`,
          `&key=${apiKey}`,
        ].join('')
      )
        .then((r) => r.json())
        .catch(() => ({ results: [] }))
    : Promise.resolve({ results: [] });

  const gridPoints = cityCenter ? getGridPoints(cityCenter) : [];
  const gridSearches = cityCenter
    ? Promise.all([distanceNearby(cityCenter), ...gridPoints.map(distanceNearby)])
    : Promise.resolve([]);

  const [page2Data, nearbyProminenceData, allGridResults] = await Promise.all([
    page2Promise,
    nearbyProminencePromise,
    gridSearches,
  ]);

  // Fetch page 3 of original text search if available (deeper = less prominent = more no-website)
  const page3Data = (page2Data as { results?: unknown[]; next_page_token?: string }).next_page_token
    ? await new Promise((r) => setTimeout(r, 2000)).then(() =>
        fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent((page2Data as { next_page_token: string }).next_page_token)}&key=${apiKey}`
        )
          .then((r) => r.json())
          .catch(() => ({ results: [] }))
      )
    : { results: [] };

  const gridPlaces = (allGridResults as { results?: { place_id: string }[] }[]).flatMap(
    (d) => d.results ?? []
  );

  for (const place of [
    ...((page2Data as { results?: { place_id: string }[] }).results ?? []),
    ...((page3Data as { results?: { place_id: string }[] }).results ?? []),
    ...((nearbyProminenceData as { results?: { place_id: string }[] }).results ?? []),
    ...gridPlaces,
  ]) {
    if (!seenIds.has(place.place_id)) {
      seenIds.add(place.place_id);
      placeIds.push(place.place_id);
    }
  }

  // Fetch details + website checks for all unique places (capped at 150)
  const businesses = await processBatch(placeIds.slice(0, 150), apiKey);

  const noWebsiteCount = businesses.filter((b) => !b.hasWebsite).length;
  console.log(`[search] "${query}" → ${businesses.length} businesses, ${noWebsiteCount} no-website leads`);

  // Cache write disabled — re-enable alongside cache read above when traffic grows
  // setCachedSearch(cacheKey, businesses).catch((e) => console.error('[search] cache write failed:', e));

  return NextResponse.json({ businesses, usage });
}
