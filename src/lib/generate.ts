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

  const gbpContext = [
    business.editorialSummary ? `Google Business Profile description: ${business.editorialSummary}` : null,
    business.reviewSnippets?.length
      ? `Real customer review excerpts:\n${business.reviewSnippets.map((r) => `- "${r}"`).join('\n')}`
      : null,
  ].filter(Boolean).join('\n\n');

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
${gbpContext ? `\n${gbpContext}\n` : ''}
${gbpContext ? 'Use the description and review excerpts above to make the "services" and "about" fields specific and accurate to this real business, not generic.' : ''}
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

export interface EmailDraft {
  subject: string;
  body: string;
}

export async function generateEmailText(
  business: Business,
  siteUrl: string,
  ownerName: string | null
): Promise<EmailDraft> {
  const reviewCount = business.reviewCount ?? 0;
  const rating = business.rating ? business.rating.toFixed(1) : null;
  const category = business.category.split(',')[0].trim();
  const greeting = ownerName ? `Hi ${ownerName.split(' ')[0]}` : 'Hi there';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a friendly, brief cold outreach EMAIL from a web designer to a local business owner who has no website. Return ONLY valid JSON — no markdown, no explanation.

{
  "subject": "short, non-salesy subject line",
  "body": "email body, 3-4 short sentences, plain text (no HTML)"
}

Business: ${business.name} (${category})${reviewCount ? ` — ${reviewCount} Google reviews${rating ? ` (${rating}★)` : ''}` : ''}
Greeting to use: "${greeting},"
Preview URL to include on its own line near the end of the body: ${siteUrl}

Rules:
- Mention their business name
- Say you built a free website concept for them
- One soft question/call to action
- Sign off with [Your Name]
- Casual, no salesy buzzwords, no HTML tags`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  return JSON.parse(cleaned) as EmailDraft;
}

// Lovable's "Build with URL" feature (docs.lovable.dev/integrations/build-with-url):
// a hash-fragment prompt that opens Lovable's own UI, pre-filled and auto-submitted.
// This is a human-click action under the USER'S OWN Lovable account, not a server-side
// API call — no cost or credentials on our side, and it's the officially documented
// way to do this (as opposed to reverse-engineering an unpublished endpoint).
export function buildLovablePromptUrl(business: Business, siteContent: SiteContent): string {
  const city = business.address.split(',').slice(-3, -2)[0]?.trim() ?? business.address;
  const category = business.category.split(',')[0].trim();

  const context = [
    business.editorialSummary ? `Google Business Profile description: ${business.editorialSummary}` : null,
    business.reviewSnippets?.length
      ? `Real customer review excerpts:\n${business.reviewSnippets.map((r) => `- "${r}"`).join('\n')}`
      : null,
  ].filter(Boolean).join('\n\n');

  const prompt = `Build a professional, mobile-friendly one-page website for a local business.

Business: ${business.name}
Category: ${category}
City: ${city}
Phone: ${business.phone}
Address: ${business.address}
${business.rating ? `Rating: ${business.rating}★ (${business.reviewCount ?? 0} Google reviews)` : ''}
${context ? `\n${context}\n` : ''}
Use this as a starting point for the copy:
Headline: ${siteContent.headline}
Tagline: ${siteContent.tagline}
About: ${siteContent.about}
Services: ${siteContent.services.join(', ')}
Call to action: ${siteContent.ctaText}

Design direction: clean, modern, trustworthy — a ${siteContent.colorScheme}-themed color palette. Include a prominent contact section with the phone number and address above, and a clear call-to-action button.`;

  return `https://lovable.dev/?autosubmit=true#prompt=${encodeURIComponent(prompt)}`;
}
