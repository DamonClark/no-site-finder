'use client';

import { openCalendlyPopup } from '@/lib/calendly';

export function TalkWithFounder() {
  return (
    <>
      <link rel="stylesheet" href="https://assets.calendly.com/assets/external/widget.css" />
      <script src="https://assets.calendly.com/assets/external/widget.js" async />

      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xl shrink-0">👋</span>
          <div>
            <p className="text-sm font-medium text-slate-900">Need help finding better leads?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Book a quick 15-minute chat with Damon feedback and questions welcome, no sales pitch.
            </p>
          </div>
        </div>
        <button
          onClick={openCalendlyPopup}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Talk with the founder
        </button>
      </div>
    </>
  );
}
