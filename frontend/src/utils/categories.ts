import type { Issue } from '../types';

export const CATEGORY_META: Record<
  Issue['category'],
  {
    label: string;
    dot: string;
    underline: string;
    tint: string;
    tintActive: string;
    badge: string;
  }
> = {
  spelling: {
    label: 'Spelling',
    dot: 'bg-red-500',
    underline: 'decoration-red-500',
    tint: 'bg-red-50/60',
    tintActive: 'bg-red-100',
    badge: 'bg-red-50 text-red-700',
  },
  grammar: {
    label: 'Grammar',
    dot: 'bg-blue-500',
    underline: 'decoration-blue-500',
    tint: 'bg-blue-50/60',
    tintActive: 'bg-blue-100',
    badge: 'bg-blue-50 text-blue-700',
  },
  punctuation: {
    label: 'Punctuation',
    dot: 'bg-amber-500',
    underline: 'decoration-amber-500',
    tint: 'bg-amber-50/60',
    tintActive: 'bg-amber-100',
    badge: 'bg-amber-50 text-amber-700',
  },
  style: {
    label: 'Style',
    dot: 'bg-violet-500',
    underline: 'decoration-violet-500',
    tint: 'bg-violet-50/60',
    tintActive: 'bg-violet-100',
    badge: 'bg-violet-50 text-violet-700',
  },
};