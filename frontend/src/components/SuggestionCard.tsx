import React from 'react';
import type { Issue } from '../types';
import { CATEGORY_META } from '../utils/categories';

interface SuggestionCardProps {
  issue: Issue;
  position: { top: number; left: number };
  onApply: (replacement: string) => void;
  onDismiss: () => void;
  // Used by the editor so the card stays open while the pointer is on it
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  issue,
  position,
  onApply,
  onDismiss,
  onPointerEnter,
  onPointerLeave,
}) => {
  const meta = CATEGORY_META[issue.category];

  return (
    <div
      role="dialog"
      aria-label={`${meta.label} suggestion`}
      style={{ top: position.top, left: position.left }}
      className="card-in absolute z-50 w-72 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDismiss();
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <button
          onClick={onDismiss}
          aria-label="Close suggestions"
          className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-bold text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-slate-700">{issue.message}</p>

      {issue.replacements.length === 0 ? (
        <p className="text-xs italic text-slate-400">No suggestions available for this one</p>
      ) : (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500">
            Replace <span className="break-all font-semibold text-slate-700">“{issue.original}”</span>{' '}
            with:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {issue.replacements.map((rep, idx) => {
              const isRemoval = rep === '';
              return (
                <button
                  key={idx}
                  onMouseDown={(e) => {
                    // Keep focus in the textarea so the caret isn't lost when clicking a chip
                    e.preventDefault();
                  }}
                  onClick={() => onApply(rep)}
                  className={`cursor-pointer break-words rounded-lg border px-3 py-1 text-left text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isRemoval
                      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200'
                  }`}
                >
                  {isRemoval ? 'Remove' : rep}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};