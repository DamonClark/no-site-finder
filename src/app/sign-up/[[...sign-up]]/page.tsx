'use client';

import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { useClerkAvailability } from '@/components/ClerkAvailability';

export default function SignUpPage() {
  const isClerkEnabled = useClerkAvailability();

  if (!isClerkEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Authentication is unavailable locally</h1>
          <p className="mt-3 text-sm text-slate-600">
            Clerk is being bypassed in local development so the app can run without the production-domain error.
          </p>
          <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp />
    </main>
  );
}
