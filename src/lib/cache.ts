import { prisma } from './db';
import type { Business } from '@/types';

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export function makeKeywordCacheKey(query: string) {
  return `kw:${query.trim().toLowerCase()}`;
}

export function makeRadiusCacheKey(category: string, baseCity: string, radiusMiles: number) {
  return `r:${category.trim().toLowerCase()}:${baseCity.trim().toLowerCase()}:${radiusMiles}`;
}

export async function getCachedSearch(cacheKey: string) {
  const row = await prisma.searchCache.findUnique({ where: { cacheKey } });
  if (!row || row.expiresAt < new Date()) return null;
  return row;
}

export async function setCachedSearch(cacheKey: string, results: Business[], meta?: object) {
  const expiresAt = new Date(Date.now() + TTL_MS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = results as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (meta ?? null) as any;
  await prisma.searchCache.upsert({
    where: { cacheKey },
    update: { results: r, meta: m, expiresAt },
    create: { cacheKey, results: r, meta: m, expiresAt },
  });
}
