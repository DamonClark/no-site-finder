import { NextResponse } from 'next/server';
import { getUsage } from '@/lib/usage';
import { businessesToCsv } from '@/lib/csv';
import type { Business } from '@/types';

const MAX_EXPORT_ROWS = 500;

export async function POST(req: Request) {
  const usage = await getUsage();
  if (!usage) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (usage.plan !== 'pro') {
    return NextResponse.json(
      { error: 'UPGRADE_REQUIRED', message: 'CSV export is a Pro feature.' },
      { status: 403 }
    );
  }

  const { businesses, filename } = await req.json().catch(() => ({ businesses: null, filename: null }));
  if (!Array.isArray(businesses) || businesses.length === 0) {
    return NextResponse.json({ error: 'businesses array is required' }, { status: 400 });
  }

  const csv = businessesToCsv((businesses as Business[]).slice(0, MAX_EXPORT_ROWS));
  const safeFilename = typeof filename === 'string' && /^[\w.\-]+\.csv$/i.test(filename) ? filename : 'leads.csv';

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
    },
  });
}
