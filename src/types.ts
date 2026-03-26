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
}
