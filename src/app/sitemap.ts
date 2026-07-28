import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-content';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: '2026-07-28' },
    { url: `${SITE_URL}/sign-up`, lastModified: '2026-05-27' },
    { url: `${SITE_URL}/sign-in`, lastModified: '2026-05-27' },
  ];
}
