'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';
import { UpgradeButton } from './UpgradeButton';
import { openCalendlyPopup } from '@/lib/calendly';

interface UpgradeModalProps {
  title: string;
  body: string;
  benefits: string[];
  onClose: () => void;
  viewEvent: string;
}

export function UpgradeModal({ title, body, benefits, onClose, viewEvent }: UpgradeModalProps) {
  useEffect(() => {
    track(viewEvent);
  }, [viewEvent]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <link rel="stylesheet" href="https://assets.calendly.com/assets/external/widget.css" />
      <script src="https://assets.calendly.com/assets/external/widget.js" async />

      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-500">{body}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <ul className="text-sm text-blue-700 space-y-1">
            {benefits.map((benefit) => (
              <li key={benefit}>✓ {benefit}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <UpgradeButton
            label="Upgrade to Pro"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          />
          <button
            onClick={openCalendlyPopup}
            className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Talk with Damon
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
