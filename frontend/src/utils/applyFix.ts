import type { Issue } from '../types';

export function applyFix(
  text: string,
  issue: Issue,
  replacement: string
): { text: string; caret: number } | null {
  // Stale-response safety net: verifying if the text matches the original word
  const slice = text.slice(issue.start, issue.end);
  if (slice !== issue.original) {
    return null;
  }

  const newText = text.slice(0, issue.start) + replacement + text.slice(issue.end);
  const caret = issue.start + replacement.length;
  return { text: newText, caret };
}