import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { UpgradeButton } from '@/components/UpgradeButton';

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
            <span className="font-bold text-lg tracking-tight">No-Site Finder</span>
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
        <div className="max-w-4xl mx-auto text-center py-24 px-6 relative">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Built for web designers &amp; freelancers
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Find businesses<br />
            <span className="text-blue-600">without websites</span><br />
            in seconds
          </h1>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Discover high-intent web design leads hidden in Google Maps. Search by keyword or radius,
            score leads automatically, and send AI-generated outreach.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/sign-up"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-md hover:shadow-lg"
            >
              Start for free →
            </Link>
            <Link
              href="#how-it-works"
              className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-sm"
            >
              See how it works
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-5">10 free searches · No credit card required</p>

          {/* Product mock card */}
          <div className="mt-16 bg-white rounded-2xl border border-slate-200 shadow-xl p-6 text-left max-w-md mx-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-semibold text-slate-900">Mike&apos;s Auto Repair</div>
                <div className="text-sm text-slate-500 mt-0.5">Scottsdale, AZ · Auto Repair</div>
              </div>
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-orange-200 flex-shrink-0">
                No website
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>⭐ 4.8 · 312 reviews</span>
              <span>📞 (480) 555-0192</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-xs text-slate-500">Score: <span className="font-semibold text-slate-700">92</span> · High intent lead</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-50 py-24 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500">Three steps from search to client</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Search', desc: 'Enter any keyword + city, or run a radius search across an entire area.', color: 'bg-blue-600' },
              { step: '2', title: 'Score', desc: 'Leads are automatically scored by review count, rating, and website status.', color: 'bg-indigo-600' },
              { step: '3', title: 'Outreach', desc: 'Generate a personalized microsite preview + AI cold outreach in one click.', color: 'bg-violet-600' },
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
      <section className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need to find leads</h2>
            <p className="text-slate-500">All the tools to turn Google Maps into a client pipeline</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: '📍', title: 'Radius Search', desc: 'Cover entire markets with a grid-based area search up to 50+ miles.', bg: 'bg-blue-50', border: 'border-blue-100' },
              { icon: '🔥', title: 'Lead Scoring', desc: 'Automatically ranked by review count, rating, and website status.', bg: 'bg-orange-50', border: 'border-orange-100' },
              { icon: '📧', title: 'Email Enrichment', desc: 'Find owner contact emails via Hunter.io for high-value leads.', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { icon: '🤖', title: 'AI Outreach', desc: 'Generate a custom microsite preview and SMS cold outreach message.', bg: 'bg-violet-50', border: 'border-violet-100' },
              { icon: '📊', title: 'CSV Export', desc: 'Export all filtered leads with full contact and lead data.', bg: 'bg-slate-50', border: 'border-slate-200' },
              { icon: '🏷️', title: 'Industry Presets', desc: '40+ preset categories across 7 industries for fast searches.', bg: 'bg-amber-50', border: 'border-amber-100' },
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
      <section className="bg-blue-600 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-white">
            {[
              { stat: '50+', label: 'Industry presets' },
              { stat: '500', label: 'Searches/month on Pro' },
              { stat: '1-click', label: 'AI outreach generation' },
            ].map(({ stat, label }) => (
              <div key={label}>
                <div className="text-3xl font-extrabold">{stat}</div>
                <div className="text-blue-200 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 py-24 px-6 border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Simple pricing</h2>
            <p className="text-slate-500">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Free */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">$0</span>
                </div>
                <p className="text-slate-400 text-sm mt-1">forever</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                {['10 searches/month', 'Single keyword search', 'Lead scoring + filters', 'CSV export'].map((f) => (
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
                  '500 searches/month',
                  'Radius search (any area)',
                  'Email enrichment',
                  'AI outreach generation',
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

      {/* Dark CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Your next 10 clients are on Google Maps
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            They just don&apos;t have a website yet. Start finding them today — free, no credit card needed.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg"
          >
            Start free — 10 searches on us
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </span>
            <span className="text-slate-300 font-medium">No-Site Finder</span>
          </div>
          <p className="text-slate-500">Built for web designers and agencies</p>
        </div>
      </footer>
    </div>
  );
}
