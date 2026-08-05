import type { Business } from '@/types';
import { analyzeWebsite } from './website-intelligence';
import { validateWebsite } from './website-validation';

export type { Business };

// Businesses that only have a social/directory listing instead of a real website are still leads
const SOCIAL_DIRECTORY_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'yelp.com', 'linkedin.com', 'nextdoor.com',
  'thumbtack.com', 'angi.com', 'angieslist.com',
  'homeadvisor.com', 'houzz.com', 'bbb.org', 'manta.com',
  'yellowpages.com', 'superpages.com',
];

function isSocialOrDirectory(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return SOCIAL_DIRECTORY_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * A business is an "opportunity" if it has no real website, or its website
 * is broken/slow — mirrors the free/opportunity filter in the search UI.
 */
export function countOpportunities(businesses: Business[]): number {
  return businesses.filter((b) => b.websiteStatus !== 'ok').length;
}

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

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

// A bare Node fetch (no UA, HEAD method) gets blocked or challenged by many
// legitimate small-business hosts (Cloudflare, WAFs, security plugins) that
// let a normal browser straight through — send a real browser UA to avoid
// false "broken" verdicts on sites that actually load fine.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// Statuses where a HEAD request commonly gets treated differently than a real
// page load — worth retrying with GET before concluding anything.
const RETRY_WITH_GET_STATUSES = new Set([403, 404, 405, 406, 429, 500, 501, 503]);

// These specific statuses are classic bot-protection/rate-limiting signatures
// (Cloudflare challenge, WAF block, "too many requests") — they mean the site
// is up and actively guarding against automated traffic, not that it's
// broken for a real visitor. Treat them as "ok" rather than penalizing the
// business for having security in place.
const LIKELY_BOT_BLOCK_STATUSES = new Set([403, 429, 503]);

function classifyResponse(res: Response, elapsedMs: number): 'ok' | 'broken' | 'slow' {
  if (!res.ok) {
    return LIKELY_BOT_BLOCK_STATUSES.has(res.status) ? 'ok' : 'broken';
  }
  if (elapsedMs > 4000) return 'slow';
  return 'ok';
}

async function fetchOnce(url: string, method: 'HEAD' | 'GET') {
  return fetch(url, { method, headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) });
}

export async function checkWebsite(url: string): Promise<'ok' | 'broken' | 'slow'> {
  const normalized = normalizeUrl(url);
  try {
    const start = Date.now();
    let res = await fetchOnce(normalized, 'HEAD');
    if (RETRY_WITH_GET_STATUSES.has(res.status)) {
      res = await fetchOnce(normalized, 'GET');
    }
    return classifyResponse(res, Date.now() - start);
  } catch {
    // One retry with GET — filters out transient network blips and cold
    // starts rather than permanently mislabeling a working site as broken.
    try {
      const start = Date.now();
      const res = await fetchOnce(normalized, 'GET');
      return classifyResponse(res, Date.now() - start);
    } catch {
      return 'broken';
    }
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
    const rawWebsite: string | null = result.website ? normalizeUrl(result.website) : null;
    const socialOnly = rawWebsite ? isSocialOrDirectory(rawWebsite) : false;
    const hasWebsite = !!rawWebsite && !socialOnly;
    const website = rawWebsite;
    const websiteStatus: Business['websiteStatus'] = socialOnly ? 'none' : websiteStatuses[i];

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
      email: null,
      emailSource: null,
      ownerName: null,
      enriched: false,
      websiteConfidence: null,
      websiteValidationReason: null,
    });
  }

  // Gather website intelligence for businesses with real websites (ok status only gets HTML)
  const INTEL_BATCH = 15;
  const intelligenceTargets = businesses
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.website && b.websiteStatus !== 'none');

  for (let x = 0; x < intelligenceTargets.length; x += INTEL_BATCH) {
    const batch = intelligenceTargets.slice(x, x + INTEL_BATCH);
    const results = await Promise.all(
      batch.map(({ b }) => analyzeWebsite(b.website!, b.websiteStatus))
    );
    batch.forEach(({ b }, j) => {
      b.websiteIntelligence = results[j];
    });
  }

  // Validate website determination for non-ok businesses via Claude
  const VALIDATION_BATCH = 10;
  const validationTargets = businesses.filter((b) => b.websiteStatus !== 'ok');

  for (let v = 0; v < validationTargets.length; v += VALIDATION_BATCH) {
    const batch = validationTargets.slice(v, v + VALIDATION_BATCH);
    const results = await Promise.all(batch.map((b) => validateWebsite(b)));
    batch.forEach((b, j) => {
      const result = results[j];
      if (!result) return;
      b.websiteConfidence = result.confidence;
      b.websiteValidationReason = result.reason;
      // If Claude found a real website we missed, update the business
      if (result.has_website && result.website && !b.hasWebsite) {
        const normalized = result.website.startsWith('http') ? result.website : `https://${result.website}`;
        if (!isSocialOrDirectory(normalized)) {
          b.hasWebsite = true;
          b.website = normalized;
          b.websiteStatus = 'ok';
          b.leadScore = 0;
        }
      }
    });
  }

  return businesses;
}
