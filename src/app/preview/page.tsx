'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface PreviewData {
  headline: string;
  tagline: string;
  services: string[];
  about: string;
  colorScheme: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';
  ctaText: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  rating: number | null;
  reviewCount: number | null;
}

const COLOR_MAP: Record<PreviewData['colorScheme'], { hero: string; btn: string; accent: string }> = {
  blue:   { hero: 'bg-blue-600',   btn: 'bg-blue-600 hover:bg-blue-700',   accent: 'text-blue-600' },
  green:  { hero: 'bg-green-600',  btn: 'bg-green-600 hover:bg-green-700',  accent: 'text-green-600' },
  orange: { hero: 'bg-orange-500', btn: 'bg-orange-500 hover:bg-orange-600', accent: 'text-orange-500' },
  red:    { hero: 'bg-red-600',    btn: 'bg-red-600 hover:bg-red-700',      accent: 'text-red-600' },
  purple: { hero: 'bg-purple-600', btn: 'bg-purple-600 hover:bg-purple-700', accent: 'text-purple-600' },
  teal:   { hero: 'bg-teal-600',   btn: 'bg-teal-600 hover:bg-teal-700',    accent: 'text-teal-600' },
};

function PreviewContent() {
  const params = useSearchParams();
  const b = params.get('b');

  let data: PreviewData | null = null;
  if (b) {
    try {
      data = JSON.parse(Buffer.from(b, 'base64url').toString('utf-8')) as PreviewData;
    } catch {
      // invalid param — show error below
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-2xl font-bold text-gray-700 mb-2">Preview not found</p>
          <p className="text-gray-500 text-sm">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const colors = COLOR_MAP[data.colorScheme] ?? COLOR_MAP.blue;
  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL ?? `mailto:?subject=Website for ${encodeURIComponent(data.name)}`;
  const city = data.address.split(',').slice(-3, -2)[0]?.trim() ?? data.address;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <div className={`${colors.hero} text-white py-16 px-6 text-center`}>
        <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-2">{data.category}</p>
        <h1 className="text-4xl font-bold mb-3">{data.name}</h1>
        <p className="text-xl font-semibold mb-2">{data.headline}</p>
        <p className="text-base opacity-90 mb-6">{data.tagline}</p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block bg-white text-gray-900 font-semibold px-6 py-3 rounded-full shadow hover:shadow-md transition-shadow"
        >
          {data.ctaText}
        </a>
      </div>

      {/* Services + About */}
      <div className="max-w-3xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 gap-10">
        <div>
          <h2 className={`text-lg font-bold mb-4 ${colors.accent}`}>Our Services</h2>
          <ul className="space-y-2">
            {data.services.map((s) => (
              <li key={s} className="flex items-start gap-2 text-gray-700">
                <span className={`mt-1 text-xs ${colors.accent}`}>✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={`text-lg font-bold mb-4 ${colors.accent}`}>About Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">{data.about}</p>
          {data.rating !== null && (
            <p className="text-gray-600 text-sm">
              ⭐ {data.rating.toFixed(1)}
              {data.reviewCount ? (
                <span className="text-gray-400 ml-1">({data.reviewCount.toLocaleString()} Google reviews)</span>
              ) : null}
            </p>
          )}
        </div>
      </div>

      {/* Contact bar */}
      <div className="border-t bg-gray-50 py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-6 text-gray-700 text-sm">
            {data.phone && data.phone !== 'N/A' && (
              <span>📞 {data.phone}</span>
            )}
            {city && <span>📍 {city}</span>}
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noreferrer"
            className={`${colors.btn} text-white font-semibold px-6 py-2.5 rounded-full transition-colors`}
          >
            Book a Free Consultation
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-400 border-t">
        Free website concept — contact us to get started
      </div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading preview…</p>
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
