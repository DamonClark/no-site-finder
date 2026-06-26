import Anthropic from '@anthropic-ai/sdk';
import type { Business } from '@/types';

export interface WebsiteValidationResult {
  has_website: boolean;
  website: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

const SYSTEM_PROMPT = `You are validating whether a business has a real, official website.

Return ONLY this JSON:

{
  "has_website": true | false,
  "website": string | null,
  "confidence": "high" | "medium" | "low",
  "reason": string
}
INPUT SIGNALS TO CONSIDER

Use all available sources:

Google Business Profile website field
Google knowledge panel website link
"From the web" / SERP results
Organic Google results for business name + location
Social profiles (only if they contain a primary domain link)
NORMALIZATION RULES
Remove tracking parameters (utm, fbclid, etc.)
Treat www, non-www, and mobile subdomains as the same domain
Extract root domain only
Ignore directory/social platforms as valid websites:
yelp.com
facebook.com
instagram.com
tripadvisor.com
mapquest.com
yellowpages.com
DECISION RULES (STRICT)
HAS WEBSITE = TRUE ONLY IF:

A real, independent domain exists that:

Is NOT a directory or social platform
Appears in at least ONE of:
Google Business Profile website field
Google knowledge panel
Top organic Google results for business name + location
AND the domain is not broken, parked, or placeholder content
OVERRIDE RULES (IMPORTANT)
If GBP shows "no website" BUT a real domain appears in knowledge panel or organic results → has_website = true
If GBP shows a website BUT it is broken, parked, or unrelated → has_website = false
NO WEBSITE CONDITIONS

Set has_website = false if:

No valid domain exists anywhere in search or GBP
Only social media links exist
Only directories exist
Website is parked, expired, or placeholder content
CONFLICT RESOLUTION

If multiple domains exist:

Choose the domain most consistently repeated across sources
Prefer official business domain over directories or aggregators
CONFIDENCE SCORING
high = confirmed across 2+ independent sources
medium = confirmed in 1 strong source (GBP or knowledge panel)
low = weak or ambiguous evidence
OUTPUT RULES
Return JSON only
No markdown
No explanation outside the "reason" field`;

const client = new Anthropic();

export async function validateWebsite(business: Business): Promise<WebsiteValidationResult | null> {
  const userMessage = `Business: ${business.name}
Location: ${business.address}
Phone: ${business.phone}
GBP Website Field: ${business.website ?? 'none'}
Website Status Check: ${business.websiteStatus}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const parsed = JSON.parse(cleaned) as WebsiteValidationResult;

    if (typeof parsed.has_website !== 'boolean' || !parsed.confidence) return null;
    return parsed;
  } catch {
    return null;
  }
}
