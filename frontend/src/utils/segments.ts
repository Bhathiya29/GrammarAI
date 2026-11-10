import type { Issue } from '../types';

export type Segment = {
  text: string;
  issue?: Issue;
};

export function buildSegments(text: string, issues: Issue[]): Segment[] {
  if (!text) return [{ text: '' }];

  // 1. Sorting a copy of issues by start position ascending
  const sorted = [...issues].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const issue of sorted) {
    // Validating bounds
    if (issue.start < 0 || issue.end > text.length || issue.start >= issue.end) {
      continue;
    }
    // Validating overlap (skipping if it overlaps with previous token)
    if (issue.start < cursor) {
      continue;
    }
    // Stale-response safety net: verify text matches original word
    const slice = text.slice(issue.start, issue.end);
    if (slice !== issue.original) {
      continue;
    }

    // Emit plain text before the issue
    if (issue.start > cursor) {
      segments.push({ text: text.slice(cursor, issue.start) });
    }

    // Emit the issue segment
    segments.push({ text: slice, issue });
    cursor = issue.end;
  }

  // Emit remaining text after the last issue
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}