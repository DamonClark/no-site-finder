import { NextResponse } from 'next/server';
import { processBatch } from '@/lib/places';

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
  const { category, baseCity, radiusMiles } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  if (!category?.trim() || !baseCity?.trim() || !radiusMiles) {
    return NextResponse.json({ error: 'category, baseCity, and radiusMiles are required' }, { status: 400 });
  }

  // Step 1: Geocode the base city
  const center = await geocodeCity(baseCity, apiKey);
  if (!center) {
    return NextResponse.json({ error: `Could not geocode: "${baseCity}"` }, { status: 400 });
  }

  // Step 2: Generate search grid
  const searchPoints = generateSearchPoints(center.lat, center.lng, radiusMiles);

  // Step 3: Run Nearby Search at every grid point, deduplicate by place_id
  const seenPlaceIds = new Set<string>();
  const allPlaceIds: string[] = [];

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
    } catch {
      // Skip failed grid points rather than aborting the whole request
    }

    // Brief pause between grid-point requests to stay within rate limits
    await new Promise((r) => setTimeout(r, 100));
  }

  // Step 4: Fetch Place Details + website health checks (shared utility)
  const businesses = await processBatch(allPlaceIds, apiKey);

  // Step 5: Derive towns list from result addresses
  const towns = [
    ...new Set(
      businesses
        .map((b) => extractCity(b.address))
        .filter(Boolean)
    ),
  ].sort();

  return NextResponse.json({
    businesses,
    meta: {
      searchPointsUsed: searchPoints.length,
      rawResultsFound: allPlaceIds.length,
      townsFound: towns,
    },
  });
}
