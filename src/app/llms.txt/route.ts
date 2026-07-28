import { BRAND_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/site-content';

export function GET() {
  const body = `# ${BRAND_NAME}

> ${SITE_DESCRIPTION}

## Key pages
- [Home](${SITE_URL}/): product overview, how it works, features, pricing, and FAQ
- [Sign up](${SITE_URL}/sign-up): create a free account (3 free searches, no card required)
- [Sign in](${SITE_URL}/sign-in): sign in to an existing account

See ${SITE_URL}/llms-full.txt for the full page content inlined.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
