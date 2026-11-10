import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { Issue } from '../types';
import { HighlightLayer } from './HighlightLayer';
import { SuggestionCard } from './SuggestionCard';
import { applyFix } from '../utils/applyFix';

interface EditorProps {
  text: string;
  onChange: (val: string) => void;
  issues: Issue[];
  onIssuesUpdate: (newIssues: Issue[]) => void;
}

const EDITOR_CLASSES = "w-full p-4 font-sans text-base leading-relaxed text-slate-800 bg-transparent resize-none overflow-hidden focus:outline-none";

export const Editor: React.FC<EditorProps> = ({ text, onChange, issues, onIssuesUpdate }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | { top: number; left: number } | null>(null);
  
  // Trackign the pending caret position after applying a fix
  const pendingCaretRef = useRef<number | null>(null);

  // Auto-grow textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  // Restoring caret position after React renders the fix
  useLayoutEffect(() => {
    if (pendingCaretRef.current !== null && textareaRef.current) {
      const caret = pendingCaretRef.current;
      textareaRef.current.setSelectionRange(caret, caret);
      pendingCaretRef.current = null;
    }
  }, [text]);

  // Finding active issue object
  const activeIssue = issues.find((i) => i.id === activeIssueId) || null;

  // Updating popover coordinates whenever activeIssue changes
  useEffect(() => {
    if (!activeIssue || !containerRef.current) {
      setPopoverPos(null);
      return;
    }

    const spanEl = containerRef.current.querySelector(`[data-issue-id="${activeIssue.id}"]`);
    if (spanEl) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const spanRect = spanEl.getBoundingClientRect();

      setPopoverPos({
        top: spanRect.bottom - containerRect.top + 8, // 8px below the underline
        left: spanRect.left - containerRect.left,
      });
    }
  }, [activeIssue, text, issues]);

  // Checking caret position to open/close popover
  const handleCaretChange = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const caretPos = textarea.selectionStart;
    const found = issues.find((i) => caretPos >= i.start && caretPos <= i.end);

    if (found) {
      setActiveIssueId(found.id);
    } else {
      setActiveIssueId(null);
    }
  };

  const handleApply = (replacement: string) => {
    if (!activeIssue) return;

    const result = applyFix(text, activeIssue, replacement);
    if (!result) return;

    pendingCaretRef.current = result.caret;
    onChange(result.text);

    // Stretch goal polish: immediately shift remaining issue offsets so underlines don't flash
    const lenDiff = replacement.length - (activeIssue.end - activeIssue.start);
    const updatedIssues = issues
      .filter((i) => i.id !== activeIssue.id)
      .map((i) => {
        if (i.start >= activeIssue.end) {
          return {
            ...i,
            start: i.start + lenDiff,
            end: i.end + lenDiff,
          };
        }
        return i;
      });

    onIssuesUpdate(updatedIssues);
    setActiveIssueId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full border border-slate-200 rounded-2xl bg-white shadow-sm overflow-visible focus-within:ring-2 focus-within:ring-indigo-500"
    >
      {/* Back Layer: Highlights */}
      <div className="absolute inset-0 p-4 font-sans text-base leading-relaxed pointer-events-none select-none overflow-hidden">
        <HighlightLayer text={text} issues={issues} className="text-transparent" />
      </div>

      {/* Front Layer: Transparent Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          onChange(e.target.value);
          handleCaretChange();
        }}
        onClick={handleCaretChange}
        onKeyUp={handleCaretChange}
        onSelect={handleCaretChange}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setActiveIssueId(null);
          }
        }}
        placeholder="Type or paste your text here..."
        rows={4}
        className={`relative z-10 ${EDITOR_CLASSES}`}
      />

      {/* Interactive Suggestion Popover Card */}
      {activeIssue && popoverPos && (
        <SuggestionCard
          issue={activeIssue}
          position={popoverPos}
          onApply={handleApply}
          onDismiss={() => setActiveIssueId(null)}
        />
      )}
    </div>
  );
};