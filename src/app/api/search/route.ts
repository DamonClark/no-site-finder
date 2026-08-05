import { NextResponse } from 'next/server';
import { processBatch, countOpportunities } from '@/lib/places';
import { checkAndIncrementUsage, type UsageResult } from '@/lib/usage';
import { makeKeywordCacheKey, getCachedSearch, setCachedSearch } from '@/lib/cache';
import { classifyLocation } from '@/lib/geo-scope';
import { prisma } from '@/lib/db';
import type { Business } from '@/types';

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
  let usage: UsageResult;
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
  const clientUsage = { searchCount: usage.searchCount, searchLimit: usage.searchLimit, plan: usage.plan };

  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'LIMIT_REACHED', message: "You've hit your free search limit", upgrade_required: true, usage: clientUsage },
      { status: 402 }
    );
  }

  const { query } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  }
  const key: string = apiKey; // fixed string type so nested closures below don't lose narrowing

  function extractKeyword(q: string): string {
    return q.split(/\s+in\s+/i)[0].trim();
  }

  function extractCity(q: string): string {
    return q.split(/\s+in\s+/i)[1]?.trim() ?? '';
  }

  const locationRaw = extractCity(query);
  const scope = classifyLocation(locationRaw);

  function logSearchEvent(businesses: Business[], escalated = false) {
    prisma.searchEvent
      .create({
        data: {
          userId: usage.dbUserId,
          mode: 'keyword',
          rawQuery: query,
          locationRaw,
          scope,
          resultCount: businesses.length,
          noWebsiteCount: businesses.filter((b) => !b.hasWebsite).length,
          opportunityCount: countOpportunities(businesses),
          escalated,
        },
      })
      .catch((e) => console.error('[search] SearchEvent write failed:', e));
  }

  const cacheKey = makeKeywordCacheKey(query);
  const cached = await getCachedSearch(cacheKey).catch(() => null);
  if (cached) {
    const cachedMeta = cached.meta as { escalated?: boolean } | null;
    logSearchEvent(cached.results as unknown as Business[], cachedMeta?.escalated ?? false);
    return NextResponse.json({ businesses: cached.results, meta: cached.meta, usage: clientUsage, fromCache: true });
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

  // Wider 8-point ring (~25 miles out) used only when the initial grid
  // doesn't surface enough no-website/broken-website opportunities.
  function getWideGridPoints(center: { lat: number; lng: number }) {
    const MILES = 25;
    const latDelta = MILES / 69;
    const lngDelta = MILES / (Math.cos((center.lat * Math.PI) / 180) * 69);
    const points: { lat: number; lng: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45 * Math.PI) / 180;
      points.push({
        lat: center.lat + Math.cos(angle) * latDelta,
        lng: center.lng + Math.sin(angle) * lngDelta,
      });
    }
    return points;
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

  // Fetch details + website checks, spent in waves. MAX_DETAILS is the
  // absolute ceiling for this request no matter how many waves run below —
  // total spend stays bounded, same as before.
  const MAX_DETAILS = 150;
  const FIRST_WAVE = 90;
  const OPPORTUNITY_TARGET = 15;

  const spentIds = new Set<string>();
  let businesses: Business[] = [];

  async function spendDetails(ids: string[]) {
    const fresh = ids.filter((id) => !spentIds.has(id)).slice(0, MAX_DETAILS - spentIds.size);
    if (fresh.length === 0) return;
    const batch = await processBatch(fresh, key);
    fresh.forEach((id) => spentIds.add(id));
    businesses = businesses.concat(batch);
  }

  // Wave 1: spend the first FIRST_WAVE Details calls on the originally discovered candidates.
  await spendDetails(placeIds.slice(0, FIRST_WAVE));

  // Wave 2: if that under-delivers and discovery already found more candidates,
  // spend the remaining budget on them before widening the search area.
  if (countOpportunities(businesses) < OPPORTUNITY_TARGET) {
    await spendDetails(placeIds.slice(FIRST_WAVE, MAX_DETAILS));
  }

  // Wave 3: still short of the target and we know the city center — widen
  // the grid to ~25 miles with cheap extra Nearby Search calls and spend any
  // remaining Details budget on newly found candidates. Never exceeds
  // MAX_DETAILS total Details calls.
  let escalated = false;
  if (countOpportunities(businesses) < OPPORTUNITY_TARGET && cityCenter && spentIds.size < MAX_DETAILS) {
    escalated = true;
    const center = cityCenter as { lat: number; lng: number };
    const widePoints = getWideGridPoints(center);
    const wideResults = await Promise.all(
      widePoints.map((point) =>
        fetch(
          [
            'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
            `?location=${point.lat},${point.lng}`,
            `&radius=20000`,
            `&keyword=${encodeURIComponent(keyword)}`,
            `&key=${key}`,
          ].join('')
        )
          .then((r) => r.json())
          .catch(() => ({ results: [] }))
      )
    );
    const newIds: string[] = [];
    for (const data of wideResults as { results?: { place_id: string }[] }[]) {
      for (const place of data.results ?? []) {
        if (!seenIds.has(place.place_id)) {
          seenIds.add(place.place_id);
          newIds.push(place.place_id);
        }
      }
    }
    await spendDetails(newIds);
  }

  const noWebsiteCount = businesses.filter((b) => !b.hasWebsite).length;
  const opportunityCount = countOpportunities(businesses);
  console.log(`[search] "${query}" → ${businesses.length} businesses, ${noWebsiteCount} no-website, ${opportunityCount} opportunities`);

  const meta = { escalated };
  setCachedSearch(cacheKey, businesses, meta).catch((e) => console.error('[search] cache write failed:', e));
  logSearchEvent(businesses, escalated);

  return NextResponse.json({ businesses, meta, usage: clientUsage });
}
