'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

export function PricingViewTracker() {
  useEffect(() => {
    track('pricing_page_viewed');
  }, []);

  return null;
}
