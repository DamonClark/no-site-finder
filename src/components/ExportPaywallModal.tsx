'use client';

import { UpgradeModal } from './UpgradeModal';

const BENEFITS = [
  'Export leads as CSV',
  '50 searches per month',
  'Find more businesses that need websites',
];

interface ExportPaywallModalProps {
  onClose: () => void;
}

export function ExportPaywallModal({ onClose }: ExportPaywallModalProps) {
  return (
    <UpgradeModal
      title="Export your leads with Pro"
      body="Your leads are ready. Upgrade to Pro to download your prospect lists and start reaching out."
      benefits={BENEFITS}
      onClose={onClose}
      viewEvent="csv_export_paywall_shown"
    />
  );
}
