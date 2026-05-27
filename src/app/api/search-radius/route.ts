import { NextResponse } from 'next/server';
import { processBatch } from '@/lib/places';
import { checkAndIncrementUsage } from '@/lib/usage';
import { makeRadiusCacheKey, getCachedSearch, setCachedSearch } from '@/lib/cache';

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
  let usage;
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
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'LIMIT_REACHED', message: "You've hit your free search limit", upgrade_required: true, usage },
      { status: 402 }
    );
  }

  const { category, baseCity, radiusMiles: rawRadius } = await req.json();
  // Hard cap at 25 miles — beyond that the grid grows to 19 points and Place Details
  // calls can reach 200+, costing $3-7 per search at Google API rates.
  const radiusMiles = Math.min(Number(rawRadius) || 10, 50);
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  if (!category?.trim()) return NextResponse.json({ error: 'category is required' }, { status: 400 });
  if (!baseCity?.trim()) return NextResponse.json({ error: 'baseCity is required' }, { status: 400 });
  if (!rawRadius) return NextResponse.json({ error: 'radiusMiles is required' }, { status: 400 });

  // Check cache before making any Google API calls (non-fatal if DB is unavailable)
  const cacheKey = makeRadiusCacheKey(category, baseCity, radiusMiles);
  let cached = null;
  try {
    cached = await getCachedSearch(cacheKey);
  } catch (e) {
    console.error('[search-radius] cache read failed:', e);
  }
  if (cached) {
    return NextResponse.json({ businesses: cached.results, meta: cached.meta, usage, fromCache: true });
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

  // Step 4: Fetch Place Details + website health checks (shared utility)
  // Cap at 100 to keep Place Details spend bounded (~$1.70 max).
  const businesses = await processBatch(allPlaceIds.slice(0, 100), apiKey);

  // Step 5: Derive towns list from result addresses
  const towns = [
    ...new Set(
      businesses
        .map((b) => extractCity(b.address))
        .filter(Boolean)
    ),
  ].sort();

  const meta = {
    searchPointsUsed: searchPoints.length,
    rawResultsFound: allPlaceIds.length,
    townsFound: towns,
  };

  // Store in cache for future searches (non-blocking)
  setCachedSearch(cacheKey, businesses, meta).catch((e) =>
    console.error('[search-radius] cache write failed:', e)
  );

  return NextResponse.json({ businesses, meta, usage });
}
