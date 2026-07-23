'use client';

import { UpgradeModal } from './UpgradeModal';

const BENEFITS = [
  'Continue finding businesses without websites',
  'Get more monthly searches',
  'Build your prospect list faster',
];

interface PaywallModalProps {
  onClose: () => void;
}

export function PaywallModal({ onClose }: PaywallModalProps) {
  return (
    <UpgradeModal
      title="You've used your 3 free searches"
      body="Upgrade to Pro for $29/month and continue finding businesses that need websites."
      benefits={BENEFITS}
      onClose={onClose}
      viewEvent="search_limit_reached"
    />
  );
}
