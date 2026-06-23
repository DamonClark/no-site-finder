'use client';

import { useState, useEffect, useMemo } from 'react';
import type { LeadList, Business, PipelineStatus } from '@/types';
import { AppNav } from '@/components/AppNav';
import { PIPELINE_LABELS, PIPELINE_COLORS } from '@/lib/pipeline';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListLead {
  id: string;
  placeId: string;
  status: PipelineStatus;
  snapshot: Business | null;
  noteCount: number;
  addedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function websiteStatusBadge(status: Business['websiteStatus']) {
  if (status === 'none') return <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">No website</span>;
  if (status === 'broken') return <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Broken</span>;
  if (status === 'slow') return <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Slow</span>;
  return <span className="text-xs text-emerald-600">✓ OK</span>;
}

// ─── New List Modal ───────────────────────────────────────────────────────────

function NewListModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">New List</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. Pittsburgh Plumbers Q1"
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Creating…' : 'Create List'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ListsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<LeadList | null>(null);
  const [listLeads, setListLeads] = useState<ListLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingPlaceId, setRemovingPlaceId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/lists')
      .then((r) => r.json())
      .then((d) => { setLists(d.lists ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadListLeads = async (list: LeadList) => {
    setSelectedList(list);
    setSearchQuery('');
    setLeadsLoading(true);
    try {
      const res = await fetch(`/api/lists/${list.id}/leads`);
      const data = await res.json();
      setListLeads(data.leads ?? []);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleCreateList = async (name: string) => {
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) setLists((prev) => [data.list, ...prev]);
  };

  const handleRename = async (listId: string) => {
    if (!renameValue.trim()) return;
    const res = await fetch(`/api/lists/${listId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setLists((prev) => prev.map((l) => l.id === listId ? data.list : l));
      if (selectedList?.id === listId) setSelectedList(data.list);
    }
    setRenamingId(null);
  };

  const handleDelete = async (listId: string) => {
    setDeletingId(listId);
    try {
      const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
      if (res.ok) {
        setLists((prev) => prev.filter((l) => l.id !== listId));
        if (selectedList?.id === listId) { setSelectedList(null); setListLeads([]); }
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveLead = async (placeId: string) => {
    if (!selectedList) return;
    setRemovingPlaceId(placeId);
    try {
      const res = await fetch(`/api/lists/${selectedList.id}/leads/${encodeURIComponent(placeId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setListLeads((prev) => prev.filter((l) => l.placeId !== placeId));
        setLists((prev) => prev.map((l) =>
          l.id === selectedList.id ? { ...l, leadCount: l.leadCount - 1 } : l
        ));
        setSelectedList((prev) => prev ? { ...prev, leadCount: prev.leadCount - 1 } : null);
      }
    } finally {
      setRemovingPlaceId(null);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return listLeads;
    const q = searchQuery.toLowerCase();
    return listLeads.filter((l) => {
      const s = l.snapshot;
      if (!s) return false;
      return (
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
      );
    });
  }, [listLeads, searchQuery]);

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // ── Render ──

  return (
    <div className="min-h-screen bg-slate-50">
      {showNewListModal && (
        <NewListModal
          onClose={() => setShowNewListModal(false)}
          onCreate={handleCreateList}
        />
      )}

      <AppNav />

      <main className="max-w-5xl mx-auto px-4 py-6 pb-16">

        {/* ── List detail view ── */}
        {selectedList ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => { setSelectedList(null); setListLeads([]); setSearchQuery(''); }}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
              >
                ← All Lists
              </button>
              <span className="text-slate-300">·</span>

              {renamingId === selectedList.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(selectedList.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(selectedList.id)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setRenamingId(selectedList.id); setRenameValue(selectedList.name); }}
                  className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-lg"
                  title="Click to rename"
                >
                  {selectedList.name}
                </button>
              )}

              <span className="text-sm text-slate-400">
                {selectedList.leadCount} lead{selectedList.leadCount !== 1 ? 's' : ''}
              </span>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search within list…"
              className="w-full sm:max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            />

            {leadsLoading && (
              <div className="text-center py-10">
                <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}

            {!leadsLoading && listLeads.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
                No leads in this list yet. Add them from the search page.
              </div>
            )}

            {!leadsLoading && listLeads.length > 0 && filteredLeads.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                No leads match &ldquo;{searchQuery}&rdquo;
              </div>
            )}

            <ul className="space-y-3">
              {filteredLeads.map((item) => {
                const s = item.snapshot;
                if (!s) return (
                  <li key={item.placeId} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-sm text-slate-400">
                    Lead data unavailable (snapshot missing)
                  </li>
                );

                return (
                  <li key={item.placeId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 text-base leading-snug">{s.name}</h3>
                          <p className="text-slate-400 text-xs mt-0.5 capitalize">{s.category.split(',')[0].trim()}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${PIPELINE_COLORS[item.status]}`}>
                            {PIPELINE_LABELS[item.status]}
                          </span>
                          {item.noteCount > 0 && (
                            <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                              {item.noteCount} note{item.noteCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                        <div className="text-slate-600 text-xs truncate">{s.address}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 text-xs">{s.phone}</span>
                          {s.phone !== 'N/A' && (
                            <button
                              onClick={() => copyPhone(s.phone)}
                              className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 transition-colors"
                            >
                              {copiedPhone === s.phone ? '✓' : 'Copy'}
                            </button>
                          )}
                        </div>
                        {s.rating !== null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 text-xs">★</span>
                            <span className="text-slate-700 text-xs font-medium">{s.rating.toFixed(1)}</span>
                            <span className="text-slate-400 text-xs">({s.reviewCount?.toLocaleString()})</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          {s.hasWebsite && s.website ? (
                            <a href={s.website} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline truncate max-w-[160px]">
                              {s.website}
                            </a>
                          ) : null}
                          {websiteStatusBadge(s.websiteStatus)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
                        {s.phone !== 'N/A' && (
                          <button
                            onClick={() => copyPhone(s.phone)}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors font-medium"
                          >
                            {copiedPhone === s.phone ? '✓ Copied' : '📋 Copy Phone'}
                          </button>
                        )}
                        <a
                          href={s.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Maps ↗
                        </a>
                        <a
                          href={s.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Profile ↗
                        </a>
                        <button
                          onClick={() => handleRemoveLead(item.placeId)}
                          disabled={removingPlaceId === item.placeId}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ml-auto"
                        >
                          {removingPlaceId === item.placeId ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          /* ── List index view ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">My Lists</h1>
                <p className="text-sm text-slate-500 mt-0.5">Organize leads into named collections.</p>
              </div>
              <button
                onClick={() => setShowNewListModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                + New List
              </button>
            </div>

            {loading && (
              <div className="text-center py-16">
                <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}

            {!loading && lists.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                <p className="text-2xl">📋</p>
                <p className="font-medium text-slate-700">No lists yet</p>
                <p className="text-sm text-slate-400">
                  Save leads to a list from the search page using the &ldquo;Save to List&rdquo; dropdown on each result.
                </p>
                <button
                  onClick={() => setShowNewListModal(true)}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Create your first list
                </button>
              </div>
            )}

            <ul className="space-y-3">
              {lists.map((list) => (
                <li key={list.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    <button
                      onClick={() => loadListLeads(list)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate">
                        {list.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {list.leadCount} lead{list.leadCount !== 1 ? 's' : ''} · Updated {new Date(list.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(list.id)}
                        disabled={deletingId === list.id}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === list.id ? '…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => loadListLeads(list)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        View →
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
