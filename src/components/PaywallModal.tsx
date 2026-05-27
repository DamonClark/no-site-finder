'use client';

import { UpgradeButton } from './UpgradeButton';

interface PaywallModalProps {
  onClose: () => void;
}

export function PaywallModal({ onClose }: PaywallModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900">
            You&apos;ve used all 10 free searches
          </h2>
          <p className="text-gray-500">
            Upgrade to Pro for 500 searches/month and unlock unlimited lead finding.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-blue-900">Pro Plan — $29/month</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✓ 500 searches per month</li>
            <li>✓ Radius search across any area</li>
            <li>✓ Email enrichment + AI outreach</li>
            <li>✓ CSV export</li>
          </ul>
        </div>

        <div className="space-y-3">
          <UpgradeButton className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors" />
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
