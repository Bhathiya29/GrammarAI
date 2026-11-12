import React from 'react';
import type { Issue } from '../types';
import { buildSegments } from '../utils/segments';
import { CATEGORY_META } from '../utils/categories';

interface HighlightLayerProps {
  text: string;
  issues: Issue[];
  className: string;
  activeIssueId?: string | null;
}

export const HighlightLayer: React.FC<HighlightLayerProps> = ({
  text,
  issues,
  className,
  activeIssueId = null,
}) => {
  const segments = buildSegments(text, issues);

  return (
    <div className={`pointer-events-none whitespace-pre-wrap break-words ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.issue) {
          const meta = CATEGORY_META[seg.issue.category];
          const isActive = seg.issue.id === activeIssueId;
          return (
            <span
              key={seg.issue.id}
              data-issue-id={seg.issue.id}
              className={`underline decoration-wavy decoration-2 underline-offset-[3px] rounded-xs transition-colors ${meta.underline} ${
                isActive ? meta.tintActive : meta.tint
              }`}
            >
              {seg.text}
            </span>
          );
        }
        return <span key={idx}>{seg.text}</span>;
      })}
      {/* Keeps the last empty line the same height as in the textarea */}
      <span> </span>
    </div>
  );
};