import Anthropic from '@anthropic-ai/sdk';
import type { Business } from '@/types';

export interface SiteContent {
  headline: string;
  tagline: string;
  services: string[];
  about: string;
  colorScheme: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';
  ctaText: string;
}

const client = new Anthropic();

export async function generateSiteContent(business: Business): Promise<SiteContent> {
  const city = business.address.split(',').slice(-3, -2)[0]?.trim() ?? business.address;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Generate website copy for a local business. Return ONLY valid JSON — no markdown, no explanation.

{
  "headline": "short punchy headline (max 6 words)",
  "tagline": "one-line tagline",
  "services": ["service 1", "service 2", "service 3"],
  "about": "2-sentence about blurb",
  "colorScheme": "blue",
  "ctaText": "call to action button text"
}

Business:
Name: ${business.name}
Category: ${business.category.split(',')[0].trim()}
City: ${city}
Rating: ${business.rating ?? 'N/A'}
Reviews: ${business.reviewCount ?? 0}

Pick colorScheme from: blue, green, orange, red, purple, teal — match the business type.`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  return JSON.parse(cleaned) as SiteContent;
}

export async function generateSmsText(business: Business, siteUrl: string): Promise<string> {
  const reviewCount = business.reviewCount ?? 0;
  const rating = business.rating ? business.rating.toFixed(1) : null;
  const category = business.category.split(',')[0].trim();

  const repLine = reviewCount > 0
    ? `with ${reviewCount} Google reviews${rating ? ` (${rating}★)` : ''}`
    : 'with a great local reputation';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Write a friendly cold SMS (~160 chars, NOT counting the URL) from a web designer to a local business owner who has no website. Include the preview URL on its own line at the end.

Business: ${business.name} (${category}) — ${repLine}
Preview URL: ${siteUrl}

Rules:
- Mention their business name
- Say you made a free website concept for them
- One soft question (e.g. "Worth a look?")
- Sign off with [Your Name]
- Casual, no salesy buzzwords
- URL goes on its own line at the end, no brackets`,
      },
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}
