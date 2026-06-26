'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { UserLead, LeadNote, PipelineStatus } from '@/types';
import { AppNav } from '@/components/AppNav';
import { PIPELINE_STATUSES, PIPELINE_LABELS, PIPELINE_COLORS } from '@/lib/pipeline';

// ─── Notes Modal ──────────────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leadMap, setLeadMap] = useState<Map<string, UserLead>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [errorLeadId, setErrorLeadId] = useState<string | null>(null);
  const [notesModalLead, setNotesModalLead] = useState<UserLead | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.ok ? r.json() : { leads: [] })
      .then((d) => {
        const map = new Map<string, UserLead>();
        for (const lead of (d.leads ?? [])) map.set(lead.placeId, lead);
        setLeadMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveStatus = async (lead: UserLead, status: PipelineStatus) => {
    setSavingLeadId(lead.placeId);
    const previous = leadMap.get(lead.placeId);
    setLeadMap((prev) => {
      const next = new Map(prev);
      next.set(lead.placeId, { ...(previous ?? lead), status });
      return next;
    });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: lead.placeId, status, snapshot: lead.snapshot }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeadMap((prev) => {
        const next = new Map(prev);
        next.set(data.lead.placeId, data.lead);
        return next;
      });
      setSavedLeadId(lead.placeId);
      setTimeout(() => setSavedLeadId(null), 2000);
    } catch {
      setLeadMap((prev) => {
        const next = new Map(prev);
        if (previous) next.set(lead.placeId, previous);
        return next;
      });
      setErrorLeadId(lead.placeId);
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

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const pipelineCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PIPELINE_STATUSES.map(({ value }) => [value, 0])
    ) as Record<PipelineStatus, number>;
    for (const lead of leadMap.values()) {
      if (lead.status in counts) counts[lead.status]++;
    }
    return counts;
  }, [leadMap]);

  const filtered = useMemo(() => {
    let result = Array.from(leadMap.values());
    if (pipelineFilter !== 'all') {
      result = result.filter((l) => l.status === pipelineFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => {
        const s = l.snapshot;
        if (!s) return false;
        return (
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
        );
      });
    }
    return result;
  }, [leadMap, pipelineFilter, searchQuery]);

  const totalTracked = leadMap.size;

  return (
    <div className="min-h-screen bg-slate-50">
      {notesModalLead && (
        <NotesModal
          placeId={notesModalLead.placeId}
          businessName={notesModalLead.snapshot?.name ?? 'Lead'}
          onClose={() => setNotesModalLead(null)}
          onNoteCountChange={(count) => handleNoteCountChange(notesModalLead.placeId, count)}
        />
      )}

      <AppNav />

      <main className="max-w-5xl mx-auto px-4 py-6 pb-16 space-y-5">

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Leads</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {totalTracked} lead{totalTracked !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Find More Leads
          </Link>
        </div>

        {/* Pipeline filter strip */}
        {totalTracked > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Pipeline · {totalTracked} lead{totalTracked !== 1 ? 's' : ''} tracked
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

        {/* Search */}
        {totalTracked > 0 && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, city…"
            className="w-full sm:max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && totalTracked === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
            <p className="text-2xl">📊</p>
            <p className="font-medium text-slate-700">No leads tracked yet</p>
            <p className="text-sm text-slate-400">
              Find businesses from the Search page and use the Pipeline dropdown on each card to save them here.
            </p>
            <Link
              href="/search"
              className="inline-block text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Start searching
            </Link>
          </div>
        )}

        {/* No results after filter */}
        {!loading && totalTracked > 0 && filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
            {pipelineFilter !== 'all' ? (
              <>
                <p className="text-slate-600 font-medium">
                  No leads with status &ldquo;{PIPELINE_LABELS[pipelineFilter]}&rdquo;.
                </p>
                <button
                  onClick={() => setPipelineFilter('all')}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Show all leads
                </button>
              </>
            ) : (
              <p className="text-slate-500 text-sm">No leads match your search.</p>
            )}
          </div>
        )}

        {/* Lead cards */}
        {!loading && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((lead) => {
              const s = lead.snapshot;
              if (!s) return null;

              return (
                <li key={lead.placeId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 text-base leading-snug">{s.name}</h3>
                        <p className="text-slate-400 text-xs mt-0.5 capitalize">{s.category.split(',')[0].trim()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${PIPELINE_COLORS[lead.status]}`}>
                          {PIPELINE_LABELS[lead.status]}
                        </span>
                        {lead.noteCount > 0 && (
                          <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                            {lead.noteCount} note{lead.noteCount !== 1 ? 's' : ''}
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
                        {!s.hasWebsite && (
                          <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                            No website{s.websiteConfidence === 'high' ? ' ✓' : s.websiteConfidence === 'low' ? ' ?' : ''}
                          </span>
                        )}
                        {s.hasWebsite && s.websiteStatus === 'broken' && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Broken</span>
                        )}
                        {s.hasWebsite && s.websiteStatus === 'slow' && (
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Slow</span>
                        )}
                        {s.hasWebsite && s.websiteStatus === 'ok' && (
                          <span className="text-xs text-emerald-600">✓ Has website</span>
                        )}
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

                      {/* Pipeline status selector */}
                      <select
                        value={lead.status}
                        onChange={(e) => handleSaveStatus(lead, e.target.value as PipelineStatus)}
                        disabled={savingLeadId === lead.placeId}
                        className={`text-xs border rounded-lg px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all ${
                          savingLeadId === lead.placeId ? 'opacity-50 cursor-wait' : ''
                        }`}
                      >
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
                          lead.noteCount
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {lead.noteCount ? `Notes (${lead.noteCount})` : 'Notes'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
