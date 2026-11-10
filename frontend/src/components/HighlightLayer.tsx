import React from 'react';
import type { Issue } from '../types';
import { buildSegments } from '../utils/segments';

interface HighlightLayerProps {
  text: string;
  issues: Issue[];
  className: string;
}

export const HighlightLayer: React.FC<HighlightLayerProps> = ({ text, issues, className }) => {
  const segments = buildSegments(text, issues);

  return (
    <div className={`pointer-events-none whitespace-pre-wrap break-words ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.issue) {
          return (
            <span
              key={seg.issue.id}
              data-issue-id={seg.issue.id}
              className="underline decoration-wavy decoration-red-500 bg-red-50/50 rounded-xs cursor-pointer"
            >
              {seg.text}
            </span>
          );
        }
        return <span key={idx}>{seg.text}</span>;
      })}
      <span> </span>
    </div>
  );
};