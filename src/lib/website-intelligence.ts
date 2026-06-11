import type { WebsiteIntelligence, WebsitePlatform } from '@/types';

function detectPlatform(html: string): { platform: WebsitePlatform; confidence: number } {
  if (/wp-content\//i.test(html) || /wp-includes\//i.test(html) || /name="generator"[^>]*content="WordPress/i.test(html)) {
    return { platform: 'wordpress', confidence: 0.95 };
  }
  if (/wixstatic\.com/i.test(html) || /static\.wixstatic/i.test(html)) {
    return { platform: 'wix', confidence: 0.95 };
  }
  if (/squarespace\.com/i.test(html) || /name="generator"[^>]*content="Squarespace/i.test(html)) {
    return { platform: 'squarespace', confidence: 0.9 };
  }
  if (
    /data-wf-page/i.test(html) ||
    /webflow\.io/i.test(html) ||
    /assets\.website-files\.com/i.test(html) ||
    /uploads\.webflow\.com/i.test(html) ||
    /name="generator"[^>]*content="Webflow/i.test(html)
  ) {
    return { platform: 'webflow', confidence: 0.9 };
  }
  if (/cdn\.shopify\.com/i.test(html) || /Shopify\.theme/i.test(html)) {
    return { platform: 'shopify', confidence: 0.95 };
  }
  return { platform: 'unknown', confidence: 1.0 };
}

function estimateAge(html: string): { estimated_launch_year: number | null; confidence: number } {
  const currentYear = new Date().getFullYear();

  // High confidence: explicit published_time meta tag (any attribute order)
  const publishedMatch =
    html.match(/published_time[^>]+content="(\d{4})/i) ||
    html.match(/content="(\d{4})[^"]*"[^>]*published_time/i);
  if (publishedMatch) {
    const year = parseInt(publishedMatch[1]);
    if (year >= 1995 && year <= currentYear) {
      return { estimated_launch_year: year, confidence: 0.65 };
    }
  }

  // Low confidence: copyright year in the last 6000 chars
  const tail = html.slice(Math.max(0, html.length - 6000));
  const copyrightMatch = tail.match(/©\s*(\d{4})\b/) || tail.match(/copyright[^©\n]*?(\d{4})\b/i);
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1]);
    if (year >= 1995 && year <= currentYear) {
      return { estimated_launch_year: year, confidence: 0.35 };
    }
  }

  return { estimated_launch_year: null, confidence: 0 };
}

function assessOutdated(
  url: string,
  html: string | null,
  platform: { platform: WebsitePlatform; confidence: number },
  age: { estimated_launch_year: number | null; confidence: number }
): { is_outdated: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (url.startsWith('http://')) {
    reasons.push('no_https');
  }

  if (html) {
    if (!/name="viewport"/i.test(html)) {
      reasons.push('no_viewport');
    }
    if (platform.platform === 'wordpress') {
      const versionMatch = html.match(/name="generator"[^>]*content="WordPress\s+([\d.]+)/i);
      if (versionMatch && parseFloat(versionMatch[1]) < 5) {
        reasons.push('old_wordpress');
      }
    }
  }

  if (age.estimated_launch_year !== null && age.estimated_launch_year < 2018 && age.confidence >= 0.35) {
    reasons.push('old_domain');
  }

  return { is_outdated: reasons.length > 0, reasons };
}

export async function analyzeWebsite(
  url: string,
  websiteStatus: 'ok' | 'broken' | 'slow' | 'none'
): Promise<WebsiteIntelligence> {
  let html: string | null = null;

  // Only attempt GET for ok sites; broken/slow sites won't return useful HTML
  if (websiteStatus === 'ok') {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(2500),
        headers: { Accept: 'text/html,*/*' },
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      // timeout or network error — proceed with URL-only signals
    }
  }

  const platform = html ? detectPlatform(html) : { platform: 'unknown' as WebsitePlatform, confidence: 0 };
  const age = html ? estimateAge(html) : { estimated_launch_year: null, confidence: 0 };
  const outdated = assessOutdated(url, html, platform, age);

  return { platform, age, outdated };
}
