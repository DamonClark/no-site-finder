'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.test') ||
    normalized.includes('lvh.me') ||
    normalized.startsWith('192.') ||
    normalized.startsWith('10.') ||
    normalized.startsWith('172.')
  );
}

export function useClerkAvailability() {
  const [isEnabled, setIsEnabled] = useState(() => process.env.NODE_ENV !== 'development');

  useEffect(() => {
    const hostname = window.location.hostname;
    const shouldUseClerk = process.env.NODE_ENV !== 'development' || !isLocalHostname(hostname);
    setIsEnabled(shouldUseClerk);
  }, []);

  return isEnabled;
}

export function ClerkFallbackLink({ className }: { className?: string }) {
  return (
    <Link href="/sign-in" className={className}>
      Sign in
    </Link>
  );
}
