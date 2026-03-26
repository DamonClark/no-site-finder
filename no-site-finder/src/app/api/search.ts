// /pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const CLEARBIT_API_KEY = process.env.CLEARBIT_API_KEY!;

type Business = {
  name: string;
  address: string;
  place_id: string;
};

type EnrichedLead = Business & {
  website?: string;
  email?: string;
};

async function searchGooglePlaces(query: string): Promise<Business[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  const response = await axios.get(url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.results.map((r: any) => ({
    name: r.name,
    address: r.formatted_address,
    place_id: r.place_id,
  }));
}

async function enrichLeadByName(name: string): Promise<{ website?: string; email?: string }> {
  try {
    const res = await axios.get(`https://company.clearbit.com/v2/companies/find?name=${encodeURIComponent(name)}`, {
      headers: {
        Authorization: `Bearer ${CLEARBIT_API_KEY}`,
      },
    });
    return {
      website: res.data?.domain,
      email: res.data?.email,
    };
  } catch {
    return {};
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const businesses = await searchGooglePlaces(query);

    const enrichedLeads: EnrichedLead[] = [];
    for (const biz of businesses) {
      const enrichment = await enrichLeadByName(biz.name);
      enrichedLeads.push({ ...biz, ...enrichment });
    }

    // TODO: Save enrichedLeads to DB associated with user (later step)

    return res.status(200).json({ leads: enrichedLeads });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
}
