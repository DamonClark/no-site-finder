'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Business, UserLead, LeadNote, PipelineStatus, LeadList } from '@/types';
import { INDUSTRY_GROUPS, recentSearches } from '@/lib/industry-presets';
import { UsageBar } from '@/components/UsageBar';
import { PaywallModal } from '@/components/PaywallModal';
import { UpgradeButton } from '@/components/UpgradeButton';
import { AppNav } from '@/components/AppNav';

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

interface UsageState {
  searchCount: number;
  searchLimit: number;
  plan: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGH_VALUE_SCORE = 200;

const DEFAULT_FILTERS: Filters = {
  minReviews: 0,
  minRating: 0,
  websiteStatus: 'missing',
  category: '',
  city: '',
};

const RADIUS_OPTIONS = [10, 25, 50] as const;

const PIPELINE_STATUSES: { value: PipelineStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

// ─── Website intelligence helpers ────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  wordpress: 'WordPress',
  wix: 'Wix',
  squarespace: 'Squarespace',
  webflow: 'Webflow',
  shopify: 'Shopify',
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getScoreBadge(score: number, hasWebsite: boolean) {
  if (hasWebsite && score === 0)
    return { label: 'Has Website', className: 'bg-slate-100 text-slate-500 border border-slate-200' };
  if (score >= HIGH_VALUE_SCORE)
    return { label: '🔥 High Value', className: 'bg-red-50 text-red-700 border border-red-200' };
  if (score >= 50)
    return { label: 'Warm Lead', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: 'Cool Lead', className: 'bg-blue-50 text-blue-700 border border-blue-200' };
}

function exportCSV(businesses: Business[], filename = 'leads.csv') {
  const headers = [
    'Name', 'Address', 'Phone', 'Rating', 'Reviews', 'Lead Score', 'Category',
    'Has Website', 'Website', 'Website Status', 'Business Status', 'Maps URL', 'Profile URL',
    'Email', 'Email Source', 'Owner Name',
  ];
  const rows = businesses.map((b) => [
    b.name, b.address, b.phone,
    b.rating ?? '', b.reviewCount ?? '', b.leadScore, b.category,
    b.hasWebsite ? 'Yes' : 'No', b.website ?? '', b.websiteStatus,
    b.businessStatus, b.mapsUrl, b.profileUrl,
    b.email ?? '', b.emailSource ?? '', b.ownerName ?? '',
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

function PresetSelect({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
        e.target.value = '';
      }}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-600 cursor-pointer hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    >
      <option value="" disabled>Industry Presets ▾</option>
      {INDUSTRY_GROUPS.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.items.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function RecentChips({ items, onSelect }: { items: string[]; onSelect: (v: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      <span className="text-xs text-slate-400 shrink-0">Recent:</span>
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onSelect(item)}
          className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 hover:border-blue-300 rounded-full px-2.5 py-0.5 transition-colors"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, highlight = false, icon }: { label: string; value: number; highlight?: boolean; icon: string }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${highlight ? 'border-blue-200 bg-blue-50' : 'bg-white border-slate-200'}`}>
      <div className="text-xl mb-1">{icon}</div>
      <p className={`text-2xl font-bold tracking-tight ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function NotesModal({
  placeId,
  businessName,
  onClose,
  onNoteCountChange,
}: {
  placeId: string;
  businessName: string;
  onClose: () => void;
  onNoteCountChange: (count: number) => void;
}) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/leads/${encodeURIComponent(placeId)}/notes`)
      .then((r) => r.json())
      .then((d) => { setNotes(d.notes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [placeId]);

  const handleAdd = async () => {
    if (!newContent.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(placeId)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const updated = [data.note, ...notes];
      setNotes(updated);
      setNewContent('');
      onNoteCountChange(updated.length);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (noteId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(placeId)}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === noteId ? data.note : n)));
      setEditingId(null);
      setEditContent('');
    } catch {}
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(placeId)}/notes/${noteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) return;
      const updated = notes.filter((n) => n.id !== noteId);
      setNotes(updated);
      onNoteCountChange(updated.length);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-900 leading-snug">{businessName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Notes</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
          {loading && (
            <div className="text-center py-6">
              <span className="inline-block w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          {!loading && notes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No notes yet. Add one below.</p>
          )}
          {notes.map((note) => (
            <div key={note.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(note.id)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditContent(''); }}
                      className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deletingId === note.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-2 shrink-0">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add a note…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none placeholder:text-slate-400"
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleAdd(); }}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newContent.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const [searchMode, setSearchMode] = useState<SearchMode>('single');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [baseCity, setBaseCity] = useState('');
  const [radiusMiles, setRadiusMiles] = useState<number>(25);

  const [recentQueryList, setRecentQueryList] = useState<string[]>([]);
  const [recentCatList, setRecentCatList] = useState<string[]>([]);

  useEffect(() => {
    setRecentQueryList(recentSearches.getQueries());
    setRecentCatList(recentSearches.getCategories());
  }, []);

  const [leads, setLeads] = useState<Business[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const [enriching, setEnriching] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const [usage, setUsage] = useState<UsageState | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [upgradedBanner, setUpgradedBanner] = useState(false);

  // ── Pipeline state ──
  const [leadMap, setLeadMap] = useState<Map<string, UserLead>>(new Map());
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [errorLeadId, setErrorLeadId] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineStatus | 'all'>('all');
  const [notesModalLead, setNotesModalLead] = useState<Business | null>(null);

  // ── Lists state ──
  const [lists, setLists] = useState<LeadList[]>([]);
  const [savingListLeadId, setSavingListLeadId] = useState<string | null>(null);
  const [newListModalBusiness, setNewListModalBusiness] = useState<Business | null>(null);

  useEffect(() => {
    fetch('/api/usage').then((r) => r.ok ? r.json() : null).then((d) => { if (d) setUsage(d); });
    if (window.location.search.includes('upgraded=1')) {
      setUpgradedBanner(true);
      window.history.replaceState({}, '', '/search');
      setTimeout(() => setUpgradedBanner(false), 4000);
    }
  }, []);

  // Load pipeline statuses + lists on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then((r) => r.ok ? r.json() : { leads: [] }),
      fetch('/api/lists').then((r) => r.ok ? r.json() : { lists: [] }),
    ]).then(([leadsData, listsData]) => {
      const map = new Map<string, UserLead>();
      for (const lead of leadsData.leads ?? []) map.set(lead.placeId, lead);
      setLeadMap(map);
      setLists(listsData.lists ?? []);
    }).catch(() => {});
  }, []);

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
    setFromCache(false);
    setPipelineFilter('all');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setShowPaywall(true);
        if (data.usage) setUsage(data.usage);
      } else if (res.ok) {
        setLeads(data.businesses ?? []);
        if (data.usage) setUsage(data.usage);
        setFromCache(!!data.fromCache);
        setRecentQueryList(recentSearches.saveQuery(query));
        setSearchPerformed(true);
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
    setFromCache(false);
    setPipelineFilter('all');
    try {
      const res = await fetch('/api/search-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, baseCity, radiusMiles }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setShowPaywall(true);
        if (data.usage) setUsage(data.usage);
      } else if (res.ok) {
        setLeads(data.businesses ?? []);
        setSearchMeta(data.meta ?? null);
        if (data.usage) setUsage(data.usage);
        setFromCache(!!data.fromCache);
        setRecentCatList(recentSearches.saveCategory(category));
        setSearchPerformed(true);
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

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleEnrich = async () => {
    const targets = leads.filter((b) => b.websiteStatus !== 'ok');
    if (targets.length === 0 || enriching) return;
    setEnriching(true);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businesses: targets }),
      });
      if (!res.ok) return;
      const data = await res.json();
      type EnrichRow = { placeId: string; email: string | null; emailSource: Business['emailSource']; ownerName: string | null };
      const resultMap = new Map<string, EnrichRow>(
        (data.results ?? []).map((r: EnrichRow) => [r.placeId, r])
      );
      setLeads((prev) =>
        prev.map((b) => {
          const enrichment = resultMap.get(b.placeId);
          if (!enrichment) return b;
          return { ...b, email: enrichment.email, emailSource: enrichment.emailSource, ownerName: enrichment.ownerName, enriched: true };
        })
      );
    } finally {
      setEnriching(false);
    }
  };

  // ── Pipeline handlers ──

  const handleSaveStatus = async (business: Business, status: PipelineStatus) => {
    setSavingLeadId(business.placeId);
    const previous = leadMap.get(business.placeId);
    // Optimistic update
    setLeadMap((prev) => {
      const next = new Map(prev);
      next.set(business.placeId, {
        ...(previous ?? { id: '', noteCount: 0, snapshot: null, listIds: [], createdAt: '', updatedAt: '' }),
        placeId: business.placeId,
        status,
      });
      return next;
    });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: business.placeId, status, snapshot: business }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      setLeadMap((prev) => {
        const next = new Map(prev);
        next.set(data.lead.placeId, data.lead);
        return next;
      });
      setSavedLeadId(business.placeId);
      setTimeout(() => setSavedLeadId(null), 2000);
    } catch {
      // Revert optimistic update on failure
      setLeadMap((prev) => {
        const next = new Map(prev);
        if (previous) next.set(business.placeId, previous);
        else next.delete(business.placeId);
        return next;
      });
      setErrorLeadId(business.placeId);
      setTimeout(() => setErrorLeadId(null), 3000);
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleNoteCountChange = (placeId: string, count: number) => {
    setLeadMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(placeId);
      if (existing) next.set(placeId, { ...existing, noteCount: count });
      return next;
    });
  };

  // ── List handlers ──

  const handleToggleList = async (business: Business, listId: string) => {
    const currentLead = leadMap.get(business.placeId);
    const alreadyIn = currentLead?.listIds.includes(listId) ?? false;
    setSavingListLeadId(business.placeId);

    if (alreadyIn) {
      // Remove from list
      const res = await fetch(`/api/lists/${listId}/leads/${encodeURIComponent(business.placeId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLeadMap((prev) => {
          const next = new Map(prev);
          const lead = next.get(business.placeId);
          if (lead) next.set(business.placeId, { ...lead, listIds: lead.listIds.filter((id) => id !== listId) });
          return next;
        });
        setLists((prev) => prev.map((l) => l.id === listId ? { ...l, leadCount: Math.max(0, l.leadCount - 1) } : l));
      }
    } else {
      // Add to list
      const res = await fetch(`/api/lists/${listId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: business.placeId, snapshot: business }),
      });
      if (res.ok) {
        setLeadMap((prev) => {
          const next = new Map(prev);
          const lead = next.get(business.placeId);
          if (lead) {
            next.set(business.placeId, { ...lead, listIds: [...lead.listIds, listId] });
          } else {
            next.set(business.placeId, {
              id: '', placeId: business.placeId, status: 'new',
              snapshot: business, noteCount: 0, listIds: [listId],
              createdAt: '', updatedAt: '',
            });
          }
          return next;
        });
        setLists((prev) => prev.map((l) => l.id === listId ? { ...l, leadCount: l.leadCount + 1 } : l));
      }
    }
    setSavingListLeadId(null);
  };

  const handleCreateAndAddToList = async (name: string, business: Business) => {
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const newList: LeadList = data.list;
    setLists((prev) => [newList, ...prev]);
    // Add lead to the new list
    await handleToggleList(business, newList.id);
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

  const pipelineFiltered = useMemo(() => {
    if (pipelineFilter === 'all') return sorted;
    return sorted.filter((b) => leadMap.get(b.placeId)?.status === pipelineFilter);
  }, [sorted, pipelineFilter, leadMap]);

  const enrichableCount = useMemo(
    () => leads.filter((b) => b.websiteStatus === 'broken' || b.websiteStatus === 'slow').length,
    [leads]
  );

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

  // Pipeline counts across all tracked leads
  const pipelineCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PIPELINE_STATUSES.map(({ value }) => [value, 0])
    ) as Record<PipelineStatus, number>;
    for (const lead of leadMap.values()) {
      if (lead.status in counts) counts[lead.status]++;
    }
    return counts;
  }, [leadMap]);

  const totalTracked = useMemo(() => leadMap.size, [leadMap]);

  const loadingMessage = searchMode === 'radius'
    ? `Searching ${category} within ${radiusMiles} miles of ${baseCity}…`
    : 'Searching…';

  // ── Render ──

  return (
    <div className="min-h-screen bg-slate-50">
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

      {notesModalLead && (
        <NotesModal
          placeId={notesModalLead.placeId}
          businessName={notesModalLead.name}
          onClose={() => setNotesModalLead(null)}
          onNoteCountChange={(count) => handleNoteCountChange(notesModalLead.placeId, count)}
        />
      )}

      {newListModalBusiness && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">New List</h3>
            <p className="text-xs text-slate-400">Adding: {newListModalBusiness.name}</p>
            <input
              id="new-list-name"
              type="text"
              placeholder="e.g. Pittsburgh Plumbers Q1"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    const biz = newListModalBusiness;
                    setNewListModalBusiness(null);
                    await handleCreateAndAddToList(val, biz);
                  }
                }
                if (e.key === 'Escape') setNewListModalBusiness(null);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const input = document.getElementById('new-list-name') as HTMLInputElement;
                  const val = input?.value.trim();
                  if (val) {
                    const biz = newListModalBusiness;
                    setNewListModalBusiness(null);
                    await handleCreateAndAddToList(val, biz!);
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Create &amp; Add
              </button>
              <button
                onClick={() => setNewListModalBusiness(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <AppNav />

      <main className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">

        {/* Usage strip */}
        {usage && (
          <div className="flex items-center justify-between gap-3">
            <UsageBar
              searchCount={usage.searchCount}
              searchLimit={usage.searchLimit}
              plan={usage.plan}
            />
            {usage.plan !== 'pro' && (
              <UpgradeButton
                label={usage.searchCount >= usage.searchLimit ? 'Upgrade to Search More' : 'Upgrade'}
                className={
                  usage.searchCount >= usage.searchLimit
                    ? 'bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap'
                    : 'bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap'
                }
              />
            )}
          </div>
        )}

        {upgradedBanner && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            🎉 Welcome to Pro! You now have 150 searches/month.
          </div>
        )}

        {fromCache && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl px-4 py-2 flex items-center gap-2">
            ⚡ Results loaded from cache · Refreshed within 48 hours
          </div>
        )}

        {/* Search card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">

          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 w-fit mb-5">
            {(['single', 'radius'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSearchMode(mode)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  searchMode === mode
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode === 'single' ? 'Keyword Search' : 'Radius Search'}
              </button>
            ))}
          </div>

          {searchMode === 'single' ? (
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <PresetSelect onSelect={(v) => setQuery(v)} />
                <span className="text-xs text-slate-400">or type below — e.g. &quot;plumber in Austin&quot;</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. plumbers in New York"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="border border-slate-200 rounded-lg px-3 py-2.5 flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Searching…
                    </span>
                  ) : 'Search'}
                </button>
              </div>
              <RecentChips items={recentQueryList} onSelect={(v) => setQuery(v)} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Business Category</span>
                    <PresetSelect onSelect={(v) => setCategory(v)} />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. plumber"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                  <RecentChips items={recentCatList} onSelect={(v) => setCategory(v)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-slate-700">Base City</span>
                  <input
                    type="text"
                    placeholder="e.g. Pittsburgh, PA"
                    value={baseCity}
                    onChange={(e) => setBaseCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-700">Radius:</span>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadiusMiles(r)}
                    className={`text-sm px-3.5 py-1.5 rounded-full border font-medium transition-colors ${
                      radiusMiles === r
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {r} mi
                  </button>
                ))}
                <span className="text-xs text-slate-400 ml-auto">
                  {radiusMiles <= 25 ? '~7 search points' : '~19 search points'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-400">
                  Covers the full area with overlapping grid points, deduplicated.
                </p>
                <button
                  onClick={handleSearch}
                  disabled={loading || !category.trim() || !baseCity.trim()}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {loadingMessage}
                    </span>
                  ) : 'Search Area'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline summary strip */}
        {totalTracked > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                My Pipeline · {totalTracked} lead{totalTracked !== 1 ? 's' : ''} tracked
              </p>
              {pipelineFilter !== 'all' && (
                <button
                  onClick={() => setPipelineFilter('all')}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STATUSES.map(({ value, label }) => {
                const count = pipelineCounts[value];
                if (count === 0) return null;
                const isActive = pipelineFilter === value;
                return (
                  <button
                    key={value}
                    onClick={() => setPipelineFilter(isActive ? 'all' : value)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label} <span className={isActive ? 'text-blue-100' : 'text-slate-400'}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Results */}
        {leads.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="📍" label="Total Found" value={stats.total} />
              <StatCard icon="🚫" label="No Website" value={stats.noWebsite} highlight />
              <StatCard icon="🔥" label="High Opportunity" value={stats.highValue} highlight={stats.highValue > 0} />
              <StatCard icon="⭐" label="Avg Reviews" value={stats.avgReviews} />
            </div>

            {/* Radius meta */}
            {searchMeta && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                  Area Searched — {searchMeta.searchPointsUsed} grid points · {searchMeta.rawResultsFound} raw results
                </p>
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
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Top Industries Without Websites
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.topCategories.map(([cat, count]) => (
                    <button
                      key={cat}
                      onClick={() => setFilters((f) => ({ ...f, category: cat }))}
                      className="bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors capitalize"
                    >
                      {cat} <span className="text-slate-400">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Filters</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'All No-Website Leads', preset: { websiteStatus: 'missing' as WebsiteFilter, sort: 'leadScore' as SortKey } },
                  { label: '20+ Reviews', preset: { websiteStatus: 'missing' as WebsiteFilter, minReviews: 20, sort: 'leadScore' as SortKey } },
                  { label: '50+ Reviews', preset: { websiteStatus: 'missing' as WebsiteFilter, minReviews: 50, sort: 'leadScore' as SortKey } },
                  { label: '4.5+ Rating', preset: { websiteStatus: 'missing' as WebsiteFilter, minRating: 4.5, sort: 'leadScore' as SortKey } },
                  { label: 'Missing or Broken', preset: { websiteStatus: 'missing_or_broken' as WebsiteFilter, sort: 'leadScore' as SortKey } },
                ].map(({ label, preset }) => (
                  <button
                    key={label}
                    onClick={() => applyPreset(preset)}
                    className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-full px-3 py-1.5 transition-colors"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => applyPreset({ websiteStatus: 'missing', sort: 'leadScore', topN: 20 })}
                  className="text-xs bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 rounded-full px-3 py-1.5 font-medium transition-colors"
                >
                  🏆 Top 20 Opportunities
                </button>
              </div>
            </div>

            {/* Filters panel */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium">Advanced Filters</span>
                <span className="text-slate-400 text-xs">{showFilters ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {showFilters && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-medium text-slate-700">Min Reviews</span>
                    <input
                      type="number"
                      min={0}
                      value={filters.minReviews || ''}
                      onChange={(e) => setFilters((f) => ({ ...f, minReviews: Number(e.target.value) || 0 }))}
                      placeholder="e.g. 20"
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-medium text-slate-700">Min Rating</span>
                    <select
                      value={filters.minRating}
                      onChange={(e) => setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))}
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value={0}>Any</option>
                      <option value={3.0}>3.0+</option>
                      <option value={3.5}>3.5+</option>
                      <option value={4.0}>4.0+</option>
                      <option value={4.2}>4.2+</option>
                      <option value={4.5}>4.5+</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-medium text-slate-700">Website Status</span>
                    <select
                      value={filters.websiteStatus}
                      onChange={(e) => setFilters((f) => ({ ...f, websiteStatus: e.target.value as WebsiteFilter }))}
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="any">Any</option>
                      <option value="missing">No website</option>
                      <option value="missing_or_broken">Missing or Broken</option>
                      <option value="broken">Broken website</option>
                      <option value="slow">Slow website</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-medium text-slate-700">Pipeline Status</span>
                    <select
                      value={pipelineFilter}
                      onChange={(e) => setPipelineFilter(e.target.value as PipelineStatus | 'all')}
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">All</option>
                      {PIPELINE_STATUSES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-medium text-slate-700">Category</span>
                    <input
                      type="text"
                      value={filters.category}
                      onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. plumber"
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-medium text-slate-700">City / Area</span>
                    <input
                      type="text"
                      value={filters.city}
                      onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. Brooklyn"
                      className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <button
                    onClick={() => { setFilters(DEFAULT_FILTERS); setTopN(null); setPipelineFilter('all'); }}
                    className="text-xs text-slate-400 hover:text-slate-600 underline text-left"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Sort</span>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="leadScore">Lead Score</option>
                  <option value="reviewCount">Review Count</option>
                  <option value="rating">Rating</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <span className="text-sm text-slate-500">
                {pipelineFiltered.length} lead{pipelineFiltered.length !== 1 ? 's' : ''}{topN ? ` (top ${topN})` : ''}
                {pipelineFilter !== 'all' && (
                  <span className="text-blue-600 ml-1">· {PIPELINE_STATUSES.find(s => s.value === pipelineFilter)?.label}</span>
                )}
              </span>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {enrichableCount > 0 && (
                  <button
                    onClick={handleEnrich}
                    disabled={enriching}
                    className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {enriching ? (
                      <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Finding contacts…</>
                    ) : `Find Contacts (${enrichableCount})`}
                  </button>
                )}

                <button
                  onClick={() => exportCSV(pipelineFiltered)}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {pipelineFiltered.length === 0 && searchPerformed && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                {pipelineFilter !== 'all' ? (
                  <>
                    <p className="text-slate-600 font-medium">No leads with status &ldquo;{PIPELINE_STATUSES.find(s => s.value === pipelineFilter)?.label}&rdquo; in these results.</p>
                    <button
                      onClick={() => setPipelineFilter('all')}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      Show all leads
                    </button>
                  </>
                ) : leads.length > 0 ? (
                  <>
                    <p className="text-slate-600 font-medium">No leads match your current filters.</p>
                    <p className="text-slate-400 text-sm">
                      Found {leads.length} business{leads.length !== 1 ? 'es' : ''} total — none had missing or broken websites in this area.
                    </p>
                    <button
                      onClick={() => setFilters((f) => ({ ...f, websiteStatus: 'any' }))}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      Show all {leads.length} businesses
                    </button>
                    <p className="text-xs text-slate-400">Tip: Try a smaller city — towns of 50k–300k population tend to have more businesses without websites.</p>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">No results found. Try a different keyword or city.</p>
                )}
              </div>
            )}

            {/* Lead cards */}
            <ul className="space-y-3">
              {pipelineFiltered.map((lead) => {
                const badge = getScoreBadge(lead.leadScore, lead.hasWebsite);
                const isHighValue = lead.leadScore >= HIGH_VALUE_SCORE && !lead.hasWebsite;
                const currentLead = leadMap.get(lead.placeId);

                return (
                  <li
                    key={lead.placeId}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                      isHighValue ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4">
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-semibold text-slate-900 text-base leading-snug">{lead.name}</h2>
                            {lead.businessStatus === 'CLOSED_PERMANENTLY' && (
                              <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200">
                                Closed
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5 capitalize">
                            {lead.category.split(',')[0].trim()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-slate-300 font-mono hidden sm:block">#{lead.leadScore}</span>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                        <div className="text-slate-600 text-xs truncate">{lead.address}</div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 text-xs">{lead.phone}</span>
                          {lead.phone !== 'N/A' && (
                            <button
                              onClick={() => copyPhone(lead.phone)}
                              className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 transition-colors"
                            >
                              {copiedPhone === lead.phone ? '✓' : 'Copy'}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {lead.rating !== null ? (
                            <>
                              <span className="text-amber-400 text-xs">★</span>
                              <span className="text-slate-700 text-xs font-medium">{lead.rating.toFixed(1)}</span>
                              <span className="text-slate-400 text-xs">({lead.reviewCount?.toLocaleString()})</span>
                            </>
                          ) : (
                            <span className="text-slate-300 text-xs">No rating</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {lead.hasWebsite ? (
                            <>
                              <a
                                href={lead.website!}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 text-xs underline truncate max-w-[160px]"
                              >
                                {lead.website}
                              </a>
                              {lead.websiteStatus === 'broken' && (
                                <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Broken</span>
                              )}
                              {lead.websiteStatus === 'slow' && (
                                <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Slow</span>
                              )}
                              {lead.websiteStatus === 'ok' && (
                                <span className="text-xs text-emerald-600">✓ OK</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                              No website{lead.websiteConfidence === 'high' ? ' ✓' : lead.websiteConfidence === 'low' ? ' ?' : ''}
                            </span>
                          )}
                        </div>

                        {/* Website intelligence */}
                        {lead.websiteIntelligence && lead.hasWebsite && (
                          <div className="sm:col-span-2 flex items-center flex-wrap gap-1.5">
                            {lead.websiteIntelligence.platform.platform !== 'unknown' && (
                              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                                {PLATFORM_LABELS[lead.websiteIntelligence.platform.platform] ?? lead.websiteIntelligence.platform.platform}
                              </span>
                            )}
                            {lead.websiteIntelligence.age.estimated_launch_year !== null &&
                              lead.websiteIntelligence.age.confidence >= 0.35 && (
                              <span className="text-xs text-slate-400">
                                ~{new Date().getFullYear() - lead.websiteIntelligence.age.estimated_launch_year}yr old
                              </span>
                            )}
                            {lead.websiteIntelligence.outdated.is_outdated && (
                              <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                                Possibly outdated
                              </span>
                            )}
                          </div>
                        )}

                        {/* Email row */}
                        {lead.websiteStatus !== 'ok' && lead.enriched && (
                          <div className="flex items-center gap-2 sm:col-span-2">
                            {lead.email ? (
                              <>
                                <span className="text-slate-700 text-xs">{lead.email}</span>
                                <button
                                  onClick={() => copyEmail(lead.email!)}
                                  className="text-xs text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded px-1.5 py-0.5 transition-colors"
                                >
                                  {copiedEmail === lead.email ? '✓' : 'Copy'}
                                </button>
                                {lead.ownerName && <span className="text-xs text-slate-400">· {lead.ownerName}</span>}
                              </>
                            ) : lead.websiteStatus === 'none' ? (
                              <span className="text-slate-400 text-xs italic">Use phone for outreach</span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No email found publicly</span>
                            )}
                          </div>
                        )}

                      </div>

                      {/* Action row */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
                        {lead.phone !== 'N/A' && (
                          <button
                            onClick={() => copyPhone(lead.phone)}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors font-medium"
                          >
                            {copiedPhone === lead.phone ? '✓ Copied' : '📋 Copy Phone'}
                          </button>
                        )}
                        <a
                          href={lead.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Maps ↗
                        </a>
                        <a
                          href={lead.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Profile ↗
                        </a>
                        <button
                          onClick={() => exportCSV([lead], `${lead.name.replace(/[^a-z0-9]/gi, '_')}.csv`)}
                          className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Export
                        </button>

                        {/* Pipeline status selector */}
                        <select
                          value={currentLead?.status ?? ''}
                          onChange={(e) => {
                            if (e.target.value) handleSaveStatus(lead, e.target.value as PipelineStatus);
                          }}
                          disabled={savingLeadId === lead.placeId}
                          className={`text-xs border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer ${
                            savingLeadId === lead.placeId ? 'opacity-50 cursor-wait border-slate-200 text-slate-700' : ''
                          } ${currentLead?.status && savingLeadId !== lead.placeId ? 'border-blue-200 text-blue-700 bg-blue-50' : ''} ${
                            !currentLead?.status && savingLeadId !== lead.placeId ? 'border-slate-200 text-slate-700' : ''
                          }`}
                        >
                          <option value="">— Pipeline —</option>
                          {PIPELINE_STATUSES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {savedLeadId === lead.placeId && (
                          <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>
                        )}
                        {errorLeadId === lead.placeId && (
                          <span className="text-xs text-red-500 font-medium">⚠ Failed</span>
                        )}

                        {/* Notes button */}
                        <button
                          onClick={() => setNotesModalLead(lead)}
                          className={`text-xs border px-2.5 py-1 rounded-lg transition-colors ${
                            currentLead?.noteCount
                              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {currentLead?.noteCount ? `Notes (${currentLead.noteCount})` : 'Notes'}
                        </button>

                        {/* Save to List dropdown */}
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            e.target.value = '';
                            if (val === '__new__') {
                              setNewListModalBusiness(lead);
                            } else if (val) {
                              handleToggleList(lead, val);
                            }
                          }}
                          disabled={savingListLeadId === lead.placeId}
                          className={`text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-opacity ${
                            savingListLeadId === lead.placeId ? 'opacity-50 cursor-wait' : ''
                          } ${currentLead?.listIds.length ? 'border-green-200 bg-green-50 text-green-700' : ''}`}
                        >
                          <option value="">
                            {currentLead?.listIds.length
                              ? `In ${currentLead.listIds.length} list${currentLead.listIds.length !== 1 ? 's' : ''}`
                              : '— Save to List —'}
                          </option>
                          {lists.map((list) => (
                            <option key={list.id} value={list.id}>
                              {currentLead?.listIds.includes(list.id) ? '✓ ' : ''}
                              {list.name}
                            </option>
                          ))}
                          <option value="__new__">+ New List…</option>
                        </select>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
