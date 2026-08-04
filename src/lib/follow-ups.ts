import { prisma } from './db';
import { getStateAbbreviation, STATE_EXAMPLE_CITIES } from './geo-scope';
import type { SearchEvent, FollowUpEmailDraft, User } from '@prisma/client';

const WINDOW_START_HOURS = 48;
const WINDOW_END_HOURS = 24;

const GENERAL_EXAMPLE_CITIES = ['Austin, TX', 'Columbus, OH', 'Charlotte, NC'];

type DraftWithUser = FollowUpEmailDraft & { user: User };

function buildExampleLine(locationRaw: string): string {
  const stateAbbr = getStateAbbreviation(locationRaw);
  const cities = stateAbbr ? STATE_EXAMPLE_CITIES[stateAbbr]?.map((c) => `${c}, ${stateAbbr}`) : null;
  const list = cities && cities.length > 0 ? cities : GENERAL_EXAMPLE_CITIES;
  return `A few good ones to try: ${list.join(' · ')}.`;
}

function buildDraftContent(event: SearchEvent): { subject: string; body: string; emailType: string } {
  const term = event.rawQuery;

  if (event.scope === 'city') {
    return {
      emailType: 'city_no_convert',
      subject: `How did your "${term}" search go?`,
      body: `Hey,

I noticed you searched "${term}" on NoSiteFinder recently — curious how it went.

What were you hoping to find? Just reply with a number:

1) More web design leads
2) Businesses without websites
3) Local prospecting data
4) Something else

Thanks,
[Your Name]`,
    };
  }

  return {
    emailType: 'state_level',
    subject: 'Quick tip to get better results from NoSiteFinder',
    body: `Hey,

I noticed you searched "${term}" on NoSiteFinder — just a quick tip: it works best when you search one city or town at a time. A whole state or the whole country only returns a small, scattered set of results.

${buildExampleLine(event.locationRaw)}

Try running that same search again for one of those and you should see a lot more leads.

Thanks,
[Your Name]`,
  };
}

// Finds SearchEvents from 24-48h ago belonging to free-plan users that don't
// already have a draft, and creates one FollowUpEmailDraft per user (their
// most recent qualifying search in the window, so nobody gets double-emailed
// in one run). Returns only the drafts newly created by this call.
export async function syncPendingFollowUpDrafts(): Promise<DraftWithUser[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_START_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() - WINDOW_END_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.searchEvent.findMany({
    where: {
      createdAt: { gte: windowStart, lte: windowEnd },
      user: { plan: 'free' },
      followUpDraft: null,
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
    include: { user: true },
  });

  const created: DraftWithUser[] = [];

  for (const event of candidates) {
    if (!event.user.email || event.user.email.endsWith('@clerk.placeholder')) continue;

    const { subject, body, emailType } = buildDraftContent(event);
    try {
      const draft = await prisma.followUpEmailDraft.create({
        data: { userId: event.userId, searchEventId: event.id, emailType, subject, body },
        include: { user: true },
      });
      created.push(draft);
    } catch (e) {
      // searchEventId is unique — a concurrent run may have already drafted this one
      console.error('[follow-ups] draft create failed:', e);
    }
  }

  return created;
}

export async function listPendingFollowUpDrafts(): Promise<DraftWithUser[]> {
  return prisma.followUpEmailDraft.findMany({
    where: { status: 'pending' },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
}
