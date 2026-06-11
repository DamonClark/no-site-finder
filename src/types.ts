export type WebsitePlatform = 'wordpress' | 'wix' | 'squarespace' | 'webflow' | 'shopify' | 'unknown';

export interface WebsiteIntelligence {
  platform: { platform: WebsitePlatform; confidence: number };
  age: { estimated_launch_year: number | null; confidence: number };
  outdated: { is_outdated: boolean; reasons: string[] };
}

export interface Business {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  rating: number | null;
  reviewCount: number | null;
  category: string;
  hasWebsite: boolean;
  website: string | null;
  websiteStatus: 'ok' | 'broken' | 'slow' | 'none';
  mapsUrl: string;
  profileUrl: string;
  businessStatus: string;
  leadScore: number;
  // Contact enrichment (populated on demand)
  email: string | null;
  emailSource: 'hunter' | null;
  ownerName: string | null;
  enriched: boolean;
  // Website intelligence (populated during batch processing)
  websiteIntelligence?: WebsiteIntelligence | null;
}
