export type WebsitePlatform = 'wordpress' | 'wix' | 'squarespace' | 'webflow' | 'shopify' | 'unknown';

export interface WebsiteIntelligence {
  platform: { platform: WebsitePlatform; confidence: number };
  age: { estimated_launch_year: number | null; confidence: number };
  outdated: { is_outdated: boolean; reasons: string[] };
}

export type PipelineStatus =
  | 'new'
  | 'message_drafted'
  | 'contacted'
  | 'follow_up'
  | 'meeting_scheduled'
  | 'proposal_sent'
  | 'won'
  | 'lost';

export interface UserLead {
  id: string;
  placeId: string;
  status: PipelineStatus;
  snapshot: Business | null;
  noteCount: number;
  listIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadList {
  id: string;
  name: string;
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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
  // Website confidence validation (populated during batch processing)
  websiteConfidence: 'high' | 'medium' | 'low' | null;
  websiteValidationReason: string | null;
  // Website intelligence (populated during batch processing)
  websiteIntelligence?: WebsiteIntelligence | null;
  // Google Business Profile content (used to enrich AI-generated outreach/site copy)
  editorialSummary: string | null;
  reviewSnippets: string[] | null;
}
