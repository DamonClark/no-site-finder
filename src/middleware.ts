import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

const isPublic = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/preview(.*)',
  '/api/webhooks/(.*)',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  '/sitemap.xml',
  '/ai.txt',
  '/sitemap-(.*)',
  '/.well-known/(.*)',
]);

// Fires one background GET per page view to Arrivl's intake endpoint so it can
// classify AI-bot/agent traffic. event.waitUntil keeps the fetch alive after
// the response is returned — a bare un-awaited fetch gets killed by the
// Edge/serverless runtime the instant the response ships.
function trackArrivl(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) return;

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '';
  if (!ip) return;

  const params = new URLSearchParams({
    url: request.url,
    userAgent: request.headers.get('user-agent') || '',
    ref: request.headers.get('referer') || '',
    ip,
    websiteKey: process.env.ARRIVL_WEBSITE_KEY!,
  });

  event.waitUntil(
    fetch(`https://arrivl.ai/api/v1/intake/pageview?${params}`).catch(() => {})
  );
}

// Agents that send `Accept: text/markdown` get the plain-text content dump
// (same content as /llms-full.txt) instead of the rendered HTML page.
function wantsMarkdown(request: NextRequest): boolean {
  return request.nextUrl.pathname === '/' && (request.headers.get('accept') ?? '').includes('text/markdown');
}

export default clerkMiddleware(async (auth, req, event) => {
  if (!isPublic(req)) {
    await auth.protect();
  }
  trackArrivl(req, event);

  if (wantsMarkdown(req)) {
    return NextResponse.rewrite(new URL('/llms-full.txt', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/robots.txt',
    '/llms.txt',
    '/llms-full.txt',
    '/sitemap.xml',
    '/ai.txt',
    '/sitemap-:path*',
    '/.well-known/:path*',
  ],
};
