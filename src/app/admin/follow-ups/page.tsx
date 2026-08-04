'use client';

import { useState, useEffect } from 'react';
import { AppNav } from '@/components/AppNav';

interface Draft {
  id: string;
  recipientEmail: string;
  emailType: string;
  subject: string;
  body: string;
  createdAt: string;
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  state_level: 'Searched a state/country',
  city_no_convert: "Searched a city, didn't convert",
};

function DraftCard({ draft, onResolve }: { draft: Draft; onResolve: (id: string, status: 'sent' | 'skipped') => void }) {
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);
  const [resolving, setResolving] = useState(false);

  const copy = (text: string, which: 'subject' | 'body') => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const resolve = async (status: 'sent' | 'skipped') => {
    setResolving(true);
    try {
      const res = await fetch('/api/admin/follow-ups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, status }),
      });
      if (res.ok) onResolve(draft.id, status);
    } finally {
      setResolving(false);
    }
  };

  return (
    <li className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{draft.recipientEmail}</p>
          <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5 mt-1 inline-block">
            {EMAIL_TYPE_LABELS[draft.emailType] ?? draft.emailType}
          </span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">
          {new Date(draft.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 shrink-0">Subject</span>
          <span className="text-sm text-slate-800 truncate">{draft.subject}</span>
          <button
            onClick={() => copy(draft.subject, 'subject')}
            className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 transition-colors shrink-0 ml-auto"
          >
            {copied === 'subject' ? '✓' : 'Copy'}
          </button>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
          {draft.body}
        </div>
        <button
          onClick={() => copy(draft.body, 'body')}
          className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1 transition-colors"
        >
          {copied === 'body' ? '✓ Copied' : '📋 Copy Body'}
        </button>
      </div>

      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => resolve('sent')}
          disabled={resolving}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          ✓ Mark as Sent
        </button>
        <button
          onClick={() => resolve('skipped')}
          disabled={resolving}
          className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Skip
        </button>
      </div>
    </li>
  );
}

export default function FollowUpsAdminPage() {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/follow-ups')
      .then((r) => {
        if (r.status === 403) throw new Error('Unauthorized');
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => setDrafts(d.drafts ?? []))
      .catch((e) => setError(e.message));
  }, []);

  const handleResolve = (id: string, status: 'sent' | 'skipped') => {
    setDrafts((prev) => (prev ? prev.filter((d) => d.id !== id) : prev));
    void status;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-16 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Follow-Up Drafts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Personalized, review-and-send follow-ups for users who searched 24-48h ago and haven&apos;t converted. Nothing here is sent automatically — copy and send from your own email, then mark it.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error === 'Unauthorized' ? "You don't have access to this page." : error}
          </div>
        )}

        {!error && drafts === null && (
          <div className="text-center py-10">
            <span className="inline-block w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {drafts !== null && drafts.length === 0 && !error && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            No pending follow-ups right now.
          </div>
        )}

        {drafts && drafts.length > 0 && (
          <ul className="space-y-3">
            {drafts.map((d) => (
              <DraftCard key={d.id} draft={d} onResolve={handleResolve} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
