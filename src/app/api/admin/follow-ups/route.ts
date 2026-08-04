import { NextResponse } from 'next/server';
import { isOwner } from '@/lib/admin';
import { syncPendingFollowUpDrafts, listPendingFollowUpDrafts } from '@/lib/follow-ups';
import { prisma } from '@/lib/db';

export async function GET() {
  if (!(await isOwner())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await syncPendingFollowUpDrafts();
  const drafts = await listPendingFollowUpDrafts();

  return NextResponse.json({
    drafts: drafts.map((d) => ({
      id: d.id,
      recipientEmail: d.user.email,
      emailType: d.emailType,
      subject: d.subject,
      body: d.body,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id, status } = await req.json();
  if (!id || !['sent', 'skipped'].includes(status)) {
    return NextResponse.json({ error: 'id and a valid status ("sent" | "skipped") are required' }, { status: 400 });
  }

  const draft = await prisma.followUpEmailDraft.update({
    where: { id },
    data: { status, sentAt: status === 'sent' ? new Date() : null },
  });

  return NextResponse.json({ draft: { id: draft.id, status: draft.status } });
}
