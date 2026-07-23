import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { UpgradeButton } from '@/components/UpgradeButton';
import { PricingViewTracker } from '@/components/PricingViewTracker';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </span>
            <span className="font-bold text-lg tracking-tight">NoSiteFinder</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link href="/sign-in" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium hidden sm:block">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Get started free
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/search"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                Open App →
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-blue-50/40 to-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.12),transparent)] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center py-24 px-6 relative">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            The prospecting platform for web designers
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Turn Google Maps<br />
            <span className="text-blue-600">into a client pipeline</span>
          </h1>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            NoSiteFinder finds local businesses without websites, scores them by opportunity,
            and gives you a full prospecting workflow from first search to closed client.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/sign-up"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-md hover:shadow-lg"
            >
              Find my first lead — free
            </Link>
            <a
              href="#pricing"
              className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-sm"
            >
              View pricing
            </a>
          </div>
          <p className="text-sm text-slate-400 mt-5">No credit card required · 3 searches free · Cancel anytime</p>

          {/* Product preview */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            {/* Search results preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Search Results</p>
              <div className="space-y-3">
                {[
                  { name: "Mike's Auto Repair", score: 92, city: 'Scottsdale, AZ' },
                  { name: 'Riverside Plumbing', score: 87, city: 'Tempe, AZ' },
                  { name: 'Peak Landscaping', score: 81, city: 'Mesa, AZ' },
                ].map(({ name, score, city }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{name}</div>
                      <div className="text-xs text-slate-400">{city}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">No site</span>
                      <span className="text-xs font-bold text-emerald-600">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Pipeline preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Your Pipeline</p>
              <div className="space-y-2.5">
                {[
                  { label: 'New', count: 8, color: 'bg-slate-100 text-slate-600' },
                  { label: 'Contacted', count: 5, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Follow Up', count: 3, color: 'bg-amber-50 text-amber-700' },
                  { label: 'Proposal Sent', count: 2, color: 'bg-violet-50 text-violet-700' },
                  { label: 'Won', count: 1, color: 'bg-emerald-50 text-emerald-700' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>{label}</span>
                    <span className="text-xs text-slate-400 font-medium">{count} lead{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value strip */}
      <section className="bg-slate-50 border-y border-slate-200 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">Built for web designers, freelancers &amp; small agencies</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: '🔍', heading: 'Find leads in seconds', body: 'Search any city or radius area for businesses without websites, scored by opportunity.' },
              { icon: '📋', heading: 'Stay organized', body: 'Save leads to named lists, group by campaign or location, and never lose a hot prospect.' },
              { icon: '📊', heading: 'Track your pipeline', body: 'Move leads from New to Won through a 7-stage pipeline built for web design outreach.' },
            ].map(({ icon, heading, body }) => (
              <div key={heading} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="text-2xl mb-3">{icon}</div>
                <p className="text-sm font-semibold text-slate-800 mb-1">{heading}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-24 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500">Three steps from search to client</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Find', desc: 'Search by keyword + city, or run a radius search to cover an entire market area. Filter by opportunity score.', color: 'bg-blue-600' },
              { step: '2', title: 'Score', desc: 'Every lead is automatically scored by review count, rating, and website status so you reach out to the best first.', color: 'bg-indigo-600' },
              { step: '3', title: 'Track', desc: 'Save leads to named lists. Move them through your pipeline from New to Won as you reach out and close deals.', color: 'bg-violet-600' },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${color} text-white rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-5`}>
                  {step}
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">A complete prospecting workflow</h2>
            <p className="text-slate-500">From discovering leads to closing clients — without switching tools.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: '📍', title: 'Radius Search', desc: 'Cover entire markets with a grid-based area search. Never miss a business in your target zone.', bg: 'bg-blue-50', border: 'border-blue-100' },
              { icon: '🔥', title: 'Lead Scoring', desc: 'Automatically ranked by review count, rating, and website status. Reach the best leads first.', bg: 'bg-orange-50', border: 'border-orange-100' },
              { icon: '🌐', title: 'Website Detection', desc: 'See instantly which businesses have no site, a broken site, or an outdated platform.', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { icon: '📋', title: 'Lead Lists', desc: 'Organize leads into named lists by campaign, city, or industry. Search within a list to find the right prospect fast.', bg: 'bg-indigo-50', border: 'border-indigo-100' },
              { icon: '📊', title: 'Contact Pipeline', desc: 'Track every lead from first contact to closed client with a 7-stage pipeline built for web designers.', bg: 'bg-violet-50', border: 'border-violet-100' },
              { icon: '⬇️', title: 'CSV Export', desc: 'Export all filtered leads with full contact and lead data. Drop into your CRM or outreach tool.', bg: 'bg-slate-50', border: 'border-slate-200' },
            ].map(({ icon, title, desc, bg, border }) => (
              <div key={title} className={`${bg} border ${border} rounded-2xl p-6 hover:shadow-sm transition-shadow`}>
                <div className="text-2xl mb-4">{icon}</div>
                <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="bg-slate-900 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-white">
            {[
              { stat: '7', label: 'Pipeline stages — New to Won' },
              { stat: '<60s', label: 'To build a targeted prospect list' },
              { stat: '50', label: 'Searches/month on Pro' },
            ].map(({ stat, label }) => (
              <div key={label}>
                <div className="text-3xl font-extrabold">{stat}</div>
                <div className="text-slate-400 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-24 px-6 border-t border-slate-100">
        <PricingViewTracker />
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Simple pricing</h2>
            <p className="text-slate-500">Find businesses that need websites and discover new client opportunities.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Free */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">$0</span>
                </div>
                <p className="text-slate-400 text-sm mt-1">Try NoSiteFinder with 3 free searches.</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                {[
                  '3 searches total',
                  'Single keyword search',
                  'Lead scoring + filters',
                  'Basic pipeline tracking',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xs font-bold flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block text-center border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="relative bg-blue-600 text-white rounded-2xl p-8 shadow-lg space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Most Popular
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-3">Pro</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold">$29</span>
                  <span className="text-blue-200 text-sm mb-2">/month</span>
                </div>
                <p className="text-blue-200 text-sm mt-1">Billed monthly · Cancel anytime</p>
              </div>
              <ul className="space-y-3 text-sm text-blue-100">
                {[
                  '50 searches/month',
                  'Radius search (any area)',
                  'Website intelligence signals',
                  'All 50+ industry presets',
                  'Contact Pipeline (7 stages)',
                  'Lead Lists & organization',
                  'CSV export',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500 border border-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="block text-center bg-white text-blue-600 hover:bg-blue-50 font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm"
                >
                  Get started
                </Link>
              </SignedOut>
              <SignedIn>
                <UpgradeButton className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm" />
              </SignedIn>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-24 px-6 border-t border-slate-100">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Common questions</h2>
          </div>
          <div className="space-y-8">
            {[
              {
                q: 'Does this work in my city?',
                a: 'Yes. NoSiteFinder searches Google Maps, which covers businesses in every city and country globally. If a business is listed on Google Maps, we can find it.',
              },
              {
                q: 'Do I need a credit card to start?',
                a: 'No. The free plan gives you 3 searches with no payment information required. Upgrade only when you need more.',
              },
              {
                q: 'What happens to my leads if I cancel?',
                a: 'Your saved leads, lists, and pipeline data are retained. You can export everything at any time.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
                <p className="font-semibold text-slate-900 mb-1.5">{q}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Your next client already needs a website.<br />You just haven&apos;t found them yet.
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Start with 3 free searches. No credit card, no commitment.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg"
          >
            Start finding clients — free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </span>
            <span className="text-slate-700 font-medium">NoSiteFinder</span>
          </div>
          <p className="text-slate-400">© 2025 NoSiteFinder · Built for web designers and agencies</p>
        </div>
      </footer>
    </div>
  );
}
