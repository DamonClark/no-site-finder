import type { Business } from '@/types';

export type { Business };

export function computeLeadScore(
  rating: number | null,
  reviewCount: number | null,
  websiteStatus: Business['websiteStatus']
): number {
  const base = Math.round((reviewCount ?? 0) * (rating ?? 0));
  if (websiteStatus === 'none') return base;
  if (websiteStatus === 'broken') return Math.round(base * 0.7);
  if (websiteStatus === 'slow') return Math.round(base * 0.4);
  return 0;
}

export async function checkWebsite(url: string): Promise<'ok' | 'broken' | 'slow'> {
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Date.now() - start;
    if (!res.ok) return 'broken';
    if (elapsed > 3000) return 'slow';
    return 'ok';
  } catch {
    return 'broken';
  }
}

export async function fetchDetails(placeId: string, apiKey: string) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,website,formatted_address,formatted_phone_number,rating,user_ratings_total,types,url,business_status&key=${apiKey}`
  );
  const data = await res.json();
  return data.result ?? null;
}

/**
 * Given a list of place IDs, fetches details and runs website checks in parallel batches,
 * then returns fully assembled Business objects.
 */
export async function processBatch(placeIds: string[], apiKey: string): Promise<Business[]> {
  if (placeIds.length === 0) return [];

  // Fetch details in parallel batches of 10
  const DETAIL_BATCH = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawResults: any[] = [];
  for (let i = 0; i < placeIds.length; i += DETAIL_BATCH) {
    const batch = placeIds.slice(i, i + DETAIL_BATCH);
    const results = await Promise.all(batch.map((id) => fetchDetails(id, apiKey)));
    rawResults.push(...results);
    if (i + DETAIL_BATCH < placeIds.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Check website health in parallel batches of 20 (only for those with websites)
  const WEBSITE_BATCH = 20;
  const websiteStatuses: Business['websiteStatus'][] = new Array(rawResults.length).fill('none');
  const websiteIndices = rawResults.map((r, i) => (r?.website ? i : -1)).filter((i) => i !== -1);

  for (let b = 0; b < websiteIndices.length; b += WEBSITE_BATCH) {
    const batchIndices = websiteIndices.slice(b, b + WEBSITE_BATCH);
    const batchResults = await Promise.all(batchIndices.map((i) => checkWebsite(rawResults[i].website)));
    batchIndices.forEach((idx, j) => {
      websiteStatuses[idx] = batchResults[j];
    });
  }

  // Assemble final Business objects
  const businesses: Business[] = [];
  for (let i = 0; i < rawResults.length; i++) {
    const result = rawResults[i];
    if (!result) continue;

    const placeId = placeIds[i];
    const hasWebsite = !!result.website;
    const website: string | null = result.website ?? null;
    const websiteStatus = websiteStatuses[i];

    const types: string[] = result.types ?? [];
    const category =
      types
        .filter((t: string) => !['point_of_interest', 'establishment'].includes(t))
        .map((t: string) => t.replace(/_/g, ' '))
        .join(', ') || 'Unknown';

    const mapsUrl: string = result.url ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    const profileUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    const rating: number | null = result.rating ?? null;
    const reviewCount: number | null = result.user_ratings_total ?? null;

    businesses.push({
      placeId,
      name: result.name,
      address: result.formatted_address ?? 'N/A',
      phone: result.formatted_phone_number ?? 'N/A',
      rating,
      reviewCount,
      category,
      hasWebsite,
      website,
      websiteStatus,
      mapsUrl,
      profileUrl,
      businessStatus: result.business_status ?? 'UNKNOWN',
      leadScore: computeLeadScore(rating, reviewCount, websiteStatus),
    });
  }

  return businesses;
}
