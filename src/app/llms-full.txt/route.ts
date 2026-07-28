import { getHomepageMarkdown } from '@/lib/site-content';

export function GET() {
  return new Response(getHomepageMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
