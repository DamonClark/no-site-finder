import { NextResponse } from 'next/server';
import { processBatch, countOpportunities } from '@/lib/places';
import { checkAndIncrementUsage, type UsageResult } from '@/lib/usage';
import { makeRadiusCacheKey, getCachedSearch, setCachedSearch } from '@/lib/cache';
import { classifyLocation } from '@/lib/geo-scope';
import { prisma } from '@/lib/db';
import type { Business } from '@/types';

// ─── Geography helpers ────────────────────────────────────────────────────────

const LAT_PER_MILE = 1 / 69;

function lngPerMile(lat: number): number {
  return 1 / (Math.cos((lat * Math.PI) / 180) * 69);
}

/**
 * Generate a set of lat/lng search points and per-point search radii that
 * together cover the full area within `radiusMiles` of the centre.
 *
 *   ≤ 25 mi  →  centre + 6-point inner ring          = 7  points
 *   26–49 mi →  centre + inner ring + 12-point outer  = 19 points
 *   ≥ 50 mi  →  same 19 points, wider local radius
 */
function generateSearchPoints(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): Array<{ lat: number; lng: number; searchRadiusMeters: number }> {
  const lngScale = lngPerMile(centerLat);
  const METERS_PER_MILE = 1609.34;

  // Local search radius per point: enough overlap to avoid gaps
  const localMiles = radiusMiles <= 25 ? 12 : 18;
  const localMeters = Math.round(localMiles * METERS_PER_MILE);

  const points: Array<{ lat: number; lng: number; searchRadiusMeters: number }> = [];

  // Centre point
  points.push({ lat: centerLat, lng: centerLng, searchRadiusMeters: localMeters });

  // Inner ring at 50 % of total radius
  const innerDist = radiusMiles * 0.5;
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    points.push({
      lat: centerLat + Math.cos(angle) * innerDist * LAT_PER_MILE,
      lng: centerLng + Math.sin(angle) * innerDist * lngScale,
      searchRadiusMeters: localMeters,
    });
  }

  // Outer ring for 26 + mile radii (at 83 % of total radius)
  if (radiusMiles >= 26) {
    const outerDist = radiusMiles * 0.83;
    const outerMeters = Math.round(localMiles * 1.3 * METERS_PER_MILE);
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 * Math.PI) / 180;
      points.push({
        lat: centerLat + Math.cos(angle) * outerDist * LAT_PER_MILE,
        lng: centerLng + Math.sin(angle) * outerDist * lngScale,
        searchRadiusMeters: outerMeters,
      });
    }
  }

  return points;
}

// ─── Geocoding ────────────────────────────────────────────────────────────────

/**
 * Geocode using Places Text Search (no separate Geocoding API required).
 * Returns the geometry.location of the first result.
 */
async function geocodeCity(
  city: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results?.[0]) {
    console.error('[geocodeCity] Google API status:', data.status, '| error_message:', data.error_message ?? 'none');
  }
  return data.results?.[0]?.geometry?.location ?? null;
}

// ─── Town extraction ──────────────────────────────────────────────────────────

/**
 * Pull the city/town segment from a formatted address.
 * "123 Main St, Pittsburgh, PA 15213, USA" → "Pittsburgh"
 */
function extractCity(address: string): string {
  const parts = address.split(',').map((s) => s.trim());
  // formatted_address pattern: [street, city, state+zip, country]
  if (parts.length >= 4) return parts[parts.length - 3];
  if (parts.length >= 3) return parts[parts.length - 2];
  return '';
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let usage: UsageResult;
  try {
    usage = await checkAndIncrementUsage();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[search-radius] checkAndIncrementUsage failed:', msg);
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

  const { category, baseCity, radiusMiles: rawRadius } = await req.json();
  // Radius is capped at 50 miles. Place Details spend is separately capped at
  // MAX_DETAILS below regardless of radius, so a wider radius costs only a
  // few extra cheap Nearby Search calls, not more Details calls.
  const radiusMiles = Math.min(Number(rawRadius) || 10, 50);
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  const key: string = apiKey; // fixed string type so nested closures below don't lose narrowing
  if (!category?.trim()) return NextResponse.json({ error: 'category is required' }, { status: 400 });
  if (!baseCity?.trim()) return NextResponse.json({ error: 'baseCity is required' }, { status: 400 });
  if (!rawRadius) return NextResponse.json({ error: 'radiusMiles is required' }, { status: 400 });

  const scope = classifyLocation(baseCity);

  function logSearchEvent(businesses: Business[], escalated = false) {
    prisma.searchEvent
      .create({
        data: {
          userId: usage.dbUserId,
          mode: 'radius',
          rawQuery: `${category} in ${baseCity}`,
          locationRaw: baseCity,
          scope,
          resultCount: businesses.length,
          noWebsiteCount: businesses.filter((b) => !b.hasWebsite).length,
          opportunityCount: countOpportunities(businesses),
          escalated,
        },
      })
      .catch((e) => console.error('[search-radius] SearchEvent write failed:', e));
  }

  const cacheKey = makeRadiusCacheKey(category, baseCity, radiusMiles);
  const cached = await getCachedSearch(cacheKey).catch(() => null);
  if (cached) {
    const cachedMeta = cached.meta as { escalated?: boolean } | null;
    logSearchEvent(cached.results as unknown as Business[], cachedMeta?.escalated ?? false);
    return NextResponse.json({ businesses: cached.results, meta: cached.meta, usage: clientUsage, fromCache: true });
  }

  // Step 1: Geocode the base city
  const center = await geocodeCity(baseCity, apiKey);
  if (!center) {
    return NextResponse.json(
      { error: `Could not geocode "${baseCity}". Check server logs for the Google API status (likely REQUEST_DENIED or billing not enabled).` },
      { status: 400 }
    );
  }

  // Step 2: Generate search grid
  const searchPoints = generateSearchPoints(center.lat, center.lng, radiusMiles);

  // Fire a Text Search for "category in baseCity" in parallel with the grid loop.
  // Nearby Search biases by distance; Text Search biases by prominence — together they surface more leads.
  const textSearchPromise = fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${category} in ${baseCity}`)}&key=${apiKey}`
  )
    .then((r) => r.json())
    .catch(() => ({ results: [] }));

  // Step 3: Run Nearby Search at every grid point, deduplicate by place_id.
  // Collect next_page_tokens so we can fetch page 2 for all points in one parallel
  // batch after a single 2-second wait (vs 2s × N sequential waits).
  const seenPlaceIds = new Set<string>();
  const allPlaceIds: string[] = [];
  const pageTokens: string[] = [];

  for (const point of searchPoints) {
    const url = [
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      `?location=${point.lat},${point.lng}`,
      `&radius=${point.searchRadiusMeters}`,
      `&keyword=${encodeURIComponent(category)}`,
      `&key=${apiKey}`,
    ].join('');

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.results) {
        for (const place of data.results) {
          if (!seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id);
            allPlaceIds.push(place.place_id);
          }
        }
      }
      if (data.next_page_token) {
        pageTokens.push(data.next_page_token);
      }
    } catch {
      // Skip failed grid points rather than aborting the whole request
    }

    // Brief pause between grid-point requests to stay within rate limits
    await new Promise((r) => setTimeout(r, 100));
  }

  // Fetch page 2, then page 3, for all grid points that had more results.
  // Page tokens require ~2s to activate; fetch each page in parallel after one wait.
  let nextPageTokens = pageTokens;
  for (let page = 2; page <= 3; page++) {
    if (nextPageTokens.length === 0) break;
    await new Promise((r) => setTimeout(r, 2000));
    const page3Tokens: string[] = [];
    await Promise.all(
      nextPageTokens.map(async (token) => {
        try {
          const url2 = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${encodeURIComponent(token)}&key=${apiKey}`;
          const res2 = await fetch(url2);
          const data2 = await res2.json();
          for (const place of data2.results ?? []) {
            if (!seenPlaceIds.has(place.place_id)) {
              seenPlaceIds.add(place.place_id);
              allPlaceIds.push(place.place_id);
            }
          }
          if (data2.next_page_token) page3Tokens.push(data2.next_page_token);
        } catch {
          // non-fatal
        }
      })
    );
    nextPageTokens = page3Tokens;
  }

  // Merge Text Search supplement results (fired in parallel with the grid loop)
  const textData = await textSearchPromise;
  for (const place of textData.results ?? []) {
    if (!seenPlaceIds.has(place.place_id)) {
      seenPlaceIds.add(place.place_id);
      allPlaceIds.push(place.place_id);
    }
  }

  // Step 4: Fetch Place Details + website health checks, spent in waves.
  // MAX_DETAILS is the absolute ceiling for this request no matter how many
  // waves run below — total spend stays bounded at ~$2.50, same as before.
  const MAX_DETAILS = 100;
  const FIRST_WAVE = 60;
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

  // Wave 1: spend the first FIRST_WAVE Details calls on the originally
  // discovered candidates.
  await spendDetails(allPlaceIds.slice(0, FIRST_WAVE));

  // Wave 2: if that under-delivers and discovery already found more
  // candidates at this radius, spend the remaining budget on them before
  // widening the geographic net.
  if (countOpportunities(businesses) < OPPORTUNITY_TARGET) {
    await spendDetails(allPlaceIds.slice(FIRST_WAVE, MAX_DETAILS));
  }

  // Wave 3: still short of the target and there's room to widen — re-run
  // cheap Nearby Search discovery at the full 50-mile grid and spend any
  // remaining Details budget on newly found candidates. This only adds a
  // handful of extra Nearby Search calls (~$0.30-0.60), never more Details
  // calls than MAX_DETAILS allows in total.
  let escalated = false;
  let extraPointsUsed = 0;
  if (countOpportunities(businesses) < OPPORTUNITY_TARGET && radiusMiles < 50 && spentIds.size < MAX_DETAILS) {
    escalated = true;
    const widerPoints = generateSearchPoints(center.lat, center.lng, 50);
    extraPointsUsed = widerPoints.length;
    const newIds: string[] = [];
    for (const point of widerPoints) {
      const url = [
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        `?location=${point.lat},${point.lng}`,
        `&radius=${point.searchRadiusMeters}`,
        `&keyword=${encodeURIComponent(category)}`,
        `&key=${key}`,
      ].join('');
      try {
        const res = await fetch(url);
        const data = await res.json();
        for (const place of data.results ?? []) {
          if (!seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id);
            allPlaceIds.push(place.place_id);
            newIds.push(place.place_id);
          }
        }
      } catch {
        // Skip failed grid points rather than aborting the whole request
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    await spendDetails(newIds);
  }

  // Step 5: Derive towns list from result addresses
  const towns = [
    ...new Set(
      businesses
        .map((b) => extractCity(b.address))
        .filter(Boolean)
    ),
  ].sort();

  const meta = {
    searchPointsUsed: searchPoints.length + extraPointsUsed,
    rawResultsFound: allPlaceIds.length,
    townsFound: towns,
    escalated,
  };

  setCachedSearch(cacheKey, businesses, meta).catch((e) => console.error('[search-radius] cache write failed:', e));
  logSearchEvent(businesses, escalated);

  return NextResponse.json({ businesses, meta, usage: clientUsage });
}
