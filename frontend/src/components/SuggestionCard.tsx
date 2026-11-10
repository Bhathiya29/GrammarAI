import React from 'react';
import type { Issue } from '../types';

interface SuggestionCardProps {
  issue: Issue;
  position: { top: number; left: number };
  onApply: (replacement: string) => void;
  onDismiss: () => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  issue,
  position,
  onApply,
  onDismiss,
}) => {
  return (
    <div
      style={{ top: position.top, left: position.left }}
      className="absolute z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
          {issue.category}
        </span>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>

      <p className="text-sm font-medium text-slate-700">{issue.message}</p>

      <div className="space-y-1">
        <div className="text-xs font-semibold text-slate-400">Suggestions:</div>
        {issue.replacements.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No suggestions available</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {issue.replacements.map((rep, idx) => (
              <button
                key={idx}
                onMouseDown={(e) => {
                  // Prevent textarea blur and caret loss when clicking chip
                  e.preventDefault();
                }}
                onClick={() => onApply(rep)}
                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer shadow-xs"
              >
                {rep}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
