import { NextResponse } from 'next/server';
import { getUsage } from '@/lib/usage';

export async function GET() {
  const usage = await getUsage();
  if (!usage) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(usage);
}
