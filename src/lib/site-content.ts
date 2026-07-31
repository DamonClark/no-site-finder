export const SITE_URL = 'https://www.nositefinder.com';
export const BRAND_NAME = 'NoSiteFinder';
export const SITE_TAGLINE = 'Find Businesses Without Websites';
export const SITE_DESCRIPTION =
  'Discover high-intent web design leads hidden in Google Maps. Find local businesses without websites in seconds.';

export const FAQ_ITEMS = [
  {
    q: 'Does this work in my city?',
    a: 'Yes. NoSiteFinder searches Google Maps, which covers businesses in every city and country globally. If a business is listed on Google Maps, we can find it.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The free plan gives you 3 searches with no payment information required. Upgrade only when you need more.',
  },
  {
    q: 'What happens to my leads if I cancel?',
    a: 'Your saved leads, lists, and pipeline data are retained. You can export everything at any time.',
  },
] as const;

export function getHomepageMarkdown(): string {
  return `# ${BRAND_NAME} — ${SITE_TAGLINE}

> ${SITE_DESCRIPTION}

## What it does

NoSiteFinder finds local businesses without websites, scores them by opportunity, and gives you a full prospecting workflow from first search to closed client. It's built for web designers, freelancers, and small agencies doing outbound prospecting.

## How it works

1. **Find** — Search by keyword + city, or run a radius search to cover an entire market area. Filter by opportunity score.
2. **Score** — Every lead is automatically scored by review count, rating, and website status so you reach out to the best first.
3. **Track** — Save leads to named lists. Move them through your pipeline from New to Won as you reach out and close deals.

## Features

- **Radius Search** — Cover entire markets with a grid-based area search. Never miss a business in your target zone.
- **Lead Scoring** — Automatically ranked by review count, rating, and website status. Reach the best leads first.
- **Website Detection** — See instantly which businesses have no site, a broken site, or an outdated platform.
- **Lead Lists** — Organize leads into named lists by campaign, city, or industry. Search within a list to find the right prospect fast.
- **Contact Pipeline** — Track every lead from first contact to closed client with a 7-stage pipeline built for web designers.
- **CSV Export** — Export all filtered leads with full contact and lead data. Drop into your CRM or outreach tool. (Pro plan)

## Pricing

**Free — $0**
Try NoSiteFinder with 3 free searches.
- 3 searches total
- Single keyword search
- Lead scoring + filters
- Basic pipeline tracking

**Pro — $29/month**
Find businesses that need websites and discover new client opportunities.
- 20 searches/month
- Radius search (any area)
- Website intelligence signals
- All 50+ industry presets
- Contact Pipeline (7 stages)
- Lead Lists & organization
- CSV export

## FAQ

${FAQ_ITEMS.map(({ q, a }) => `**${q}**\n${a}`).join('\n\n')}

## Links

- Home: ${SITE_URL}/
- Sign up: ${SITE_URL}/sign-up
- Sign in: ${SITE_URL}/sign-in
`;
}
