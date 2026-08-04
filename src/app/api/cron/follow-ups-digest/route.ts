import { NextResponse } from 'next/server';
import { syncPendingFollowUpDrafts } from '@/lib/follow-ups';
import { sendOwnerDigest } from '@/lib/mailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const newDrafts = await syncPendingFollowUpDrafts();

  if (newDrafts.length > 0) {
    const lines = newDrafts.map((d) => `- ${d.user.email} — "${d.subject}"`);
    const body = [
      `${newDrafts.length} new follow-up draft${newDrafts.length !== 1 ? 's' : ''} ready to review:`,
      '',
      ...lines,
      '',
      `Review and send at ${APP_URL}/admin/follow-ups`,
    ].join('\n');

    await sendOwnerDigest(`${newDrafts.length} NoSiteFinder follow-up${newDrafts.length !== 1 ? 's' : ''} ready`, body);
  }

  return NextResponse.json({ newDraftCount: newDrafts.length });
}
