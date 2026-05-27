'use client';

interface UsageBarProps {
  searchCount: number;
  searchLimit: number;
  plan: string;
}

export function UsageBar({ searchCount, searchLimit, plan }: UsageBarProps) {
  const remaining = Math.max(0, searchLimit - searchCount);
  const pct = Math.min(100, (searchCount / searchLimit) * 100);
  const isWarning = remaining <= 2 && remaining > 0;
  const isExhausted = remaining === 0;

  if (plan === 'pro') {
    return (
      <span className="text-xs text-gray-400">
        {searchCount.toLocaleString()} / {searchLimit.toLocaleString()} searches
      </span>
    );
  }

  return (
    <div className="space-y-1 min-w-[160px]">
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          {isExhausted
            ? 'Limit reached'
            : `${remaining} free search${remaining !== 1 ? 'es' : ''} left`}
        </span>
        <span>{searchCount}/{searchLimit}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isExhausted ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
