import type { Business } from '@/types';

export interface EnrichmentResult {
  placeId: string;
  email: string | null;
  emailSource: Business['emailSource'];
  ownerName: string | null;
  enriched: true;
}

function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    // Strip www. prefix
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export async function enrichBusiness(
  business: Business,
  hunterApiKey: string
): Promise<EnrichmentResult> {
  const base = { placeId: business.placeId, email: null, emailSource: null, ownerName: null, enriched: true } as const;

  // No domain to search — phone is the contact method for these leads
  if (business.websiteStatus === 'none' || !business.website) {
    return base;
  }

  const domain = extractDomain(business.website);
  if (!domain) return base;

  try {
    const url =
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterApiKey}&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return base;

    const json = await res.json();
    const emails: Array<{ value: string; confidence: number; first_name?: string; last_name?: string }> =
      json?.data?.emails ?? [];

    const hit = emails.find((e) => e.confidence >= 50);
    if (!hit) return base;

    const ownerName =
      hit.first_name && hit.last_name
        ? `${hit.first_name} ${hit.last_name}`
        : hit.first_name ?? null;

    return { placeId: business.placeId, email: hit.value, emailSource: 'hunter', ownerName, enriched: true };
  } catch {
    return base;
  }
}
