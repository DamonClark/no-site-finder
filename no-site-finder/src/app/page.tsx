'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Business } from '@/types';
import { INDUSTRY_GROUPS, recentSearches } from '@/lib/industry-presets';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'leadScore' | 'reviewCount' | 'rating' | 'name';
type WebsiteFilter = 'any' | 'missing' | 'missing_or_broken' | 'broken' | 'slow';
type SearchMode = 'single' | 'radius';

interface Filters {
  minReviews: number;
  minRating: number;
  websiteStatus: WebsiteFilter;
  category: string;
  city: string;
}

interface SearchMeta {
  searchPointsUsed: number;
  rawResultsFound: number;
  townsFound: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGH_VALUE_SCORE = 200; // ~50 reviews × 4.0 stars

const DEFAULT_FILTERS: Filters = {
  minReviews: 0,
  minRating: 0,
  websiteStatus: 'missing',
  category: '',
  city: '',
};

const RADIUS_OPTIONS = [10, 25, 50] as const;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getScoreBadge(score: number, hasWebsite: boolean) {
  if (hasWebsite && score === 0)
    return { label: 'Has Website', className: 'bg-gray-100 text-gray-500 border border-gray-200' };
  if (score >= HIGH_VALUE_SCORE)
    return { label: '🔥 High Opportunity', className: 'bg-red-100 text-red-700 border border-red-200' };
  if (score >= 50)
    return { label: 'Warm Lead', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
  return { label: 'Cool Lead', className: 'bg-blue-100 text-blue-700 border border-blue-200' };
}

function exportCSV(businesses: Business[], filename = 'leads.csv') {
  const headers = [
    'Name', 'Address', 'Phone', 'Rating', 'Reviews', 'Lead Score', 'Category',
    'Has Website', 'Website', 'Website Status', 'Business Status', 'Maps URL', 'Profile URL',
  ];
  const rows = businesses.map((b) => [
    b.name, b.address, b.phone,
    b.rating ?? '', b.reviewCount ?? '', b.leadScore, b.category,
    b.hasWebsite ? 'Yes' : 'No', b.website ?? '', b.websiteStatus,
    b.businessStatus, b.mapsUrl, b.profileUrl,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

function applyFilters(leads: Business[], filters: Filters): Business[] {
  return leads.filter((b) => {
    if (filters.minReviews > 0 && (b.reviewCount ?? 0) < filters.minReviews) return false;
    if (filters.minRating > 0 && (b.rating ?? 0) < filters.minRating) return false;
    if (filters.category && !b.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.city && !b.address.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.websiteStatus === 'missing' && b.hasWebsite) return false;
    if (filters.websiteStatus === 'missing_or_broken' && b.websiteStatus !== 'none' && b.websiteStatus !== 'broken') return false;
    if (filters.websiteStatus === 'broken' && b.websiteStatus !== 'broken') return false;
    if (filters.websiteStatus === 'slow' && b.websiteStatus !== 'slow') return false;
    return true;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Grouped <select> that resets to placeholder after each selection. */
function PresetSelect({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
        // Reset so the same item can be re-selected
        e.target.value = '';
      }}
      className="border rounded px-2 py-1.5 text-sm bg-white text-gray-600 cursor-pointer hover:border-blue-400 transition-colors"
    >
      <option value="" disabled>Industry Presets ▾</option>
      {INDUSTRY_GROUPS.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Clickable chips for recently used searches. */
function RecentChips({ items, onSelect }: { items: string[]; onSelect: (v: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
      <span className="text-xs text-gray-400 shrink-0">Recent:</span>
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onSelect(item)}
          className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 border border-gray-200 hover:border-blue-300 rounded-full px-2.5 py-0.5 transition-colors"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? 'border-blue-200 bg-blue-50' : 'bg-gray-50'}`}>
      <p className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  // Search inputs
  const [searchMode, setSearchMode] = useState<SearchMode>('single');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [baseCity, setBaseCity] = useState('');
  const [radiusMiles, setRadiusMiles] = useState<number>(25);

  // Recent searches (populated from localStorage after mount)
  const [recentQueryList, setRecentQueryList] = useState<string[]>([]);
  const [recentCatList, setRecentCatList] = useState<string[]>([]);

  useEffect(() => {
    setRecentQueryList(recentSearches.getQueries());
    setRecentCatList(recentSearches.getCategories());
  }, []);

  // Results
  const [leads, setLeads] = useState<Business[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Display controls
  const [sortKey, setSortKey] = useState<SortKey>('leadScore');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [topN, setTopN] = useState<number | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // ── Search handlers ──

  const handleSingleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setLeads([]);
    setSearchMeta(null);
    setTopN(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeads(data.businesses ?? []);
        setRecentQueryList(recentSearches.saveQuery(query));
      } else {
        setError(data.error || 'Error fetching leads');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusSearch = async () => {
    if (!category.trim() || !baseCity.trim()) return;
    setLoading(true);
    setError('');
    setLeads([]);
    setSearchMeta(null);
    setTopN(null);
    try {
      const res = await fetch('/api/search-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, baseCity, radiusMiles }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeads(data.businesses ?? []);
        setSearchMeta(data.meta ?? null);
        setRecentCatList(recentSearches.saveCategory(category));
      } else {
        setError(data.error || 'Error fetching leads');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = searchMode === 'single' ? handleSingleSearch : handleRadiusSearch;

  const applyPreset = (preset: Partial<Filters> & { topN?: number | null; sort?: SortKey }) => {
    const { topN: presetTopN, sort, ...filterParts } = preset;
    setFilters({ ...DEFAULT_FILTERS, ...filterParts });
    setTopN(presetTopN ?? null);
    if (sort) setSortKey(sort);
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // ── Derived data ──

  const filtered = useMemo(() => applyFilters(leads, filters), [leads, filters]);

  const sorted = useMemo(() => {
    const s = [...filtered].sort((a, b) => {
      if (sortKey === 'leadScore') return b.leadScore - a.leadScore;
      if (sortKey === 'reviewCount') return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      if (sortKey === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return a.name.localeCompare(b.name);
    });
    return topN ? s.slice(0, topN) : s;
  }, [filtered, sortKey, topN]);

  const stats = useMemo(() => {
    const noWebsite = leads.filter((b) => !b.hasWebsite);
    const highValue = noWebsite.filter((b) => b.leadScore >= HIGH_VALUE_SCORE);
    const avgReviews = noWebsite.length
      ? Math.round(noWebsite.reduce((s, b) => s + (b.reviewCount ?? 0), 0) / noWebsite.length)
      : 0;
    const categoryCounts: Record<string, number> = {};
    for (const b of noWebsite) {
      const cat = b.category.split(',')[0].trim() || 'Unknown';
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    }
    const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total: leads.length, noWebsite: noWebsite.length, highValue: highValue.length, avgReviews, topCategories };
  }, [leads]);

  // ── Render ──

  const loadingMessage = searchMode === 'radius'
    ? `Searching ${category} within ${radiusMiles} miles of ${baseCity}…`
    : 'Searching…';

  return (
    <main className="max-w-3xl mx-auto p-4 pb-16">
      <h1 className="text-2xl font-bold mb-1">No Site Finder</h1>
      <p className="text-gray-500 text-sm mb-5">
        Find local businesses without a website — high-quality leads for web design outreach.
      </p>

      {/* Mode toggle */}
      <div className="flex border rounded-lg overflow-hidden w-fit mb-4">
        {(['single', 'radius'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSearchMode(mode)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              searchMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {mode === 'single' ? 'Single Search' : 'Radius Search'}
          </button>
        ))}
      </div>

      {/* Search form */}
      {searchMode === 'single' ? (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <PresetSelect onSelect={(v) => setQuery(v)} />
            <span className="text-xs text-gray-400">— or type your own below. Add a city: &quot;plumber in Austin&quot;</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. plumbers in New York"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="border rounded p-2 flex-1"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
            >
              {loading ? loadingMessage : 'Search'}
            </button>
          </div>
          <RecentChips items={recentQueryList} onSelect={(v) => setQuery(v)} />
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-700">Business Category</span>
                <PresetSelect onSelect={(v) => setCategory(v)} />
              </div>
              <input
                type="text"
                placeholder="e.g. plumber  — or pick a preset above"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="border rounded p-2 bg-white"
              />
              <RecentChips items={recentCatList} onSelect={(v) => setCategory(v)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Base City</span>
              <input
                type="text"
                placeholder="e.g. Pittsburgh, PA"
                value={baseCity}
                onChange={(e) => setBaseCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="border rounded p-2 bg-white"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Search radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusMiles(r)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  radiusMiles === r
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {r} mi
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-auto">
              {radiusMiles <= 25 ? '~7 search points' : '~19 search points'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Searches multiple grid points within the radius and deduplicates results.
            </p>
            <button
              onClick={handleSearch}
              disabled={loading || !category.trim() || !baseCity.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {loading ? loadingMessage : 'Search Area'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {leads.length > 0 && (
        <>
          {/* Dashboard stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="Total Found" value={stats.total} />
            <StatCard label="No Website" value={stats.noWebsite} highlight />
            <StatCard label="High Opportunity" value={stats.highValue} highlight={stats.highValue > 0} />
            <StatCard label="Avg Reviews" value={stats.avgReviews} />
          </div>

          {/* Radius search metadata */}
          {searchMeta && (
            <div className="border rounded-lg p-3 mb-4 bg-indigo-50 border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  Area Searched — {searchMeta.searchPointsUsed} grid points · {searchMeta.rawResultsFound} raw results
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {searchMeta.townsFound.map((town) => (
                  <button
                    key={town}
                    onClick={() => setFilters((f) => ({ ...f, city: town }))}
                    className="bg-white border border-indigo-200 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs hover:bg-indigo-100 transition-colors"
                  >
                    {town}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Top industries */}
          {stats.topCategories.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-3 mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Top Industries Without Websites
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.topCategories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => setFilters((f) => ({ ...f, category: cat }))}
                    className="bg-white border rounded-full px-3 py-1 text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors capitalize"
                  >
                    {cat} <span className="text-gray-400">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick filter presets */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Filters</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset({ websiteStatus: 'missing', sort: 'leadScore' })}
                className="text-xs bg-white border rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                All No-Website Leads
              </button>
              <button
                onClick={() => applyPreset({ websiteStatus: 'missing', minReviews: 20, sort: 'leadScore' })}
                className="text-xs bg-white border rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                20+ Reviews, No Website
              </button>
              <button
                onClick={() => applyPreset({ websiteStatus: 'missing', minReviews: 50, sort: 'leadScore' })}
                className="text-xs bg-white border rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                50+ Reviews, No Website
              </button>
              <button
                onClick={() => applyPreset({ websiteStatus: 'missing', minRating: 4.5, sort: 'leadScore' })}
                className="text-xs bg-white border rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                Highly Rated (4.5+), No Website
              </button>
              <button
                onClick={() => applyPreset({ websiteStatus: 'missing', sort: 'leadScore', topN: 20 })}
                className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-3 py-1.5 hover:bg-orange-100 transition-colors font-medium"
              >
                🏆 Top 20 Opportunities
              </button>
              <button
                onClick={() => applyPreset({ websiteStatus: 'missing_or_broken', sort: 'leadScore' })}
                className="text-xs bg-white border rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                Missing or Broken Website
              </button>
            </div>
          </div>

          {/* Filters panel */}
          <div className="mb-4">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
            >
              <span>{showFilters ? '▾' : '▸'}</span>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            {showFilters && (
              <div className="border rounded-lg p-4 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="font-medium text-gray-700">Min Reviews</span>
                  <input
                    type="number"
                    min={0}
                    value={filters.minReviews || ''}
                    onChange={(e) => setFilters((f) => ({ ...f, minReviews: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 20"
                    className="border rounded px-2 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-medium text-gray-700">Min Rating</span>
                  <select
                    value={filters.minRating}
                    onChange={(e) => setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))}
                    className="border rounded px-2 py-1.5"
                  >
                    <option value={0}>Any</option>
                    <option value={3.0}>3.0+</option>
                    <option value={3.5}>3.5+</option>
                    <option value={4.0}>4.0+</option>
                    <option value={4.2}>4.2+</option>
                    <option value={4.5}>4.5+</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-medium text-gray-700">Website Status</span>
                  <select
                    value={filters.websiteStatus}
                    onChange={(e) => setFilters((f) => ({ ...f, websiteStatus: e.target.value as WebsiteFilter }))}
                    className="border rounded px-2 py-1.5"
                  >
                    <option value="any">Any</option>
                    <option value="missing">Missing (no website)</option>
                    <option value="missing_or_broken">Missing or Broken</option>
                    <option value="broken">Broken website</option>
                    <option value="slow">Slow website</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-medium text-gray-700">Category</span>
                  <input
                    type="text"
                    value={filters.category}
                    onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. plumber"
                    className="border rounded px-2 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="font-medium text-gray-700">City / Area</span>
                  <input
                    type="text"
                    value={filters.city}
                    onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                    placeholder="e.g. Brooklyn"
                    className="border rounded px-2 py-1.5"
                  />
                </label>
                <button
                  onClick={() => { setFilters(DEFAULT_FILTERS); setTopN(null); }}
                  className="text-xs text-gray-500 underline text-left"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {/* Sort bar + export */}
          <div className="flex flex-wrap items-center gap-3 py-3 border-y mb-4">
            <div className="flex items-center gap-2 text-sm">
              <label className="font-medium text-gray-700">Sort:</label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="border rounded px-2 py-1"
              >
                <option value="leadScore">Lead Score</option>
                <option value="reviewCount">Review Count</option>
                <option value="rating">Rating</option>
                <option value="name">Name</option>
              </select>
            </div>
            <span className="text-sm text-gray-500">
              {sorted.length} lead{sorted.length !== 1 ? 's' : ''}{topN ? ` (top ${topN})` : ''}
            </span>
            <button
              onClick={() => exportCSV(sorted)}
              className="ml-auto bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
            >
              Export CSV
            </button>
          </div>

          {sorted.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No leads match your current filters. Try adjusting the criteria above.
            </p>
          )}

          {/* Lead cards */}
          <ul className="space-y-3">
            {sorted.map((lead) => {
              const badge = getScoreBadge(lead.leadScore, lead.hasWebsite);
              const isHighValue = lead.leadScore >= HIGH_VALUE_SCORE && !lead.hasWebsite;
              return (
                <li
                  key={lead.placeId}
                  className={`border rounded-lg p-4 bg-white shadow-sm ${
                    isHighValue ? 'border-red-200 ring-1 ring-red-100' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-base leading-snug">{lead.name}</h2>
                      <p className="text-gray-500 text-xs mt-0.5 capitalize">
                        {lead.category.split(',')[0].trim()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {lead.businessStatus === 'CLOSED_PERMANENTLY' && (
                        <span className="text-xs bg-gray-100 text-gray-500 border px-2 py-0.5 rounded-full">
                          Closed
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">Score: {lead.leadScore}</span>
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm mb-3">
                    <p className="text-gray-700 truncate">{lead.address}</p>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{lead.phone}</span>
                      {lead.phone !== 'N/A' && (
                        <button
                          onClick={() => copyPhone(lead.phone)}
                          className="text-blue-500 text-xs border border-blue-300 rounded px-1.5 py-0.5 hover:bg-blue-50 transition-colors"
                        >
                          {copiedPhone === lead.phone ? '✓ Copied' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {lead.rating !== null ? (
                      <p className="text-gray-700">
                        ⭐ {lead.rating.toFixed(1)}
                        <span className="text-gray-400 ml-1">({lead.reviewCount?.toLocaleString()} reviews)</span>
                      </p>
                    ) : (
                      <p className="text-gray-400 text-xs">No rating data</p>
                    )}

                    <div>
                      {lead.hasWebsite ? (
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <a
                            href={lead.website!}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline text-xs truncate max-w-[180px] inline-block"
                          >
                            {lead.website}
                          </a>
                          {lead.websiteStatus === 'broken' && (
                            <span className="text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-1 rounded">
                              BROKEN
                            </span>
                          )}
                          {lead.websiteStatus === 'slow' && (
                            <span className="text-yellow-600 text-xs font-semibold bg-yellow-50 border border-yellow-200 px-1 rounded">
                              SLOW
                            </span>
                          )}
                          {lead.websiteStatus === 'ok' && (
                            <span className="text-green-600 text-xs">✓ OK</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-orange-600 font-medium text-sm">No website</span>
                      )}
                    </div>
                  </div>

                  {/* Quick action panel */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
                    {lead.phone !== 'N/A' && (
                      <button
                        onClick={() => copyPhone(lead.phone)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded transition-colors font-medium"
                      >
                        {copiedPhone === lead.phone ? '✓ Copied' : '📋 Copy Phone'}
                      </button>
                    )}
                    <a
                      href={lead.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                    >
                      Open in Maps
                    </a>
                    <a
                      href={lead.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                    >
                      Business Profile
                    </a>
                    <button
                      onClick={() => exportCSV([lead], `${lead.name.replace(/[^a-z0-9]/gi, '_')}.csv`)}
                      className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                    >
                      Export Lead
                    </button>
                    <span className="text-gray-400 ml-auto font-mono truncate">ID: {lead.placeId}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
