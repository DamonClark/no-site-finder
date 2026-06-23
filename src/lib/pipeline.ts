import type { PipelineStatus } from '@/types';

export const PIPELINE_STATUSES: { value: PipelineStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  meeting_scheduled: 'Meeting Scheduled',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
};

export const PIPELINE_COLORS: Record<PipelineStatus, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  follow_up: 'bg-amber-50 text-amber-700 border-amber-200',
  meeting_scheduled: 'bg-violet-50 text-violet-700 border-violet-200',
  proposal_sent: 'bg-orange-50 text-orange-700 border-orange-200',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-500 border-slate-200',
};
