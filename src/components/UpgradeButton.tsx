'use client';

import { useState } from 'react';

interface UpgradeButtonProps {
  className?: string;
  label?: string;
}

export function UpgradeButton({ className, label = 'Upgrade to Pro' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className={
        className ??
        'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
      }
    >
      {loading ? 'Redirecting…' : label}
    </button>
  );
}
