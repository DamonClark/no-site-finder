'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

const NAV_LINKS = [
  { href: '/search', label: 'Search' },
  { href: '/leads', label: 'My Leads' },
  { href: '/lists', label: 'My Lists' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 sm:gap-4">
        <Link
          href="/search"
          className="font-bold text-slate-900 text-lg tracking-tight shrink-0 flex items-center gap-2"
        >
          <span className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </span>
          <span className="hidden sm:block">NoSiteFinder</span>
        </Link>

        <nav className="flex items-center gap-0.5 flex-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
