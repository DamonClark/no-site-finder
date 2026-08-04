'use client';

import { useState, useEffect } from 'react';
import { AppNav } from '@/components/AppNav';

export default function SettingsPage() {
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setCalendlyUrl(d.calendlyUrl ?? ''))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendlyUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      setCalendlyUrl(data.calendlyUrl ?? '');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-sm text-slate-500 mb-6">Manage your outreach preferences.</p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div>
            <label htmlFor="calendly-url" className="font-medium text-slate-700 text-sm">Booking link</label>
            <p className="text-xs text-slate-400 mt-0.5">
              Shown to prospects on your generated preview sites (e.g. your Calendly link). Leave blank to omit a booking CTA.
            </p>
          </div>
          {loading ? (
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <input
              id="calendly-url"
              type="text"
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/your-name/discovery-call"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
            />
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </main>
    </div>
  );
}
