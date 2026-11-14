import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { Issue } from '../types';
import { HighlightLayer } from './HighlightLayer';
import { SuggestionCard } from './SuggestionCard';
import { applyFix } from '../utils/applyFix';
import { issueIdAtPoint } from '../utils/hitTest';

interface EditorProps {
  text: string;
  onChange: (val: string) => void;
  issues: Issue[];
  onIssuesUpdate: (newIssues: Issue[]) => void;
}

// Both layers MUST share these metrics, otherwise the underlines drift away from the text
const TEXT_METRICS = 'p-4 font-sans text-base leading-relaxed';
const TEXTAREA_CLASSES = `${TEXT_METRICS} w-full min-h-56 text-slate-800 bg-transparent resize-none overflow-hidden focus:outline-none`;

const OPEN_DELAY_MS = 120; // hover this long before a card opens (stops flicker while sweeping)
const CLOSE_DELAY_MS = 220; // grace period so the pointer can travel from the word to the card
const CARD_WIDTH_PX = 288; // keep in sync with w-72 in SuggestionCard
const CARD_MAX_HEIGHT_PX = 200; // rough upper bound, used to decide whether the card fits below the word
const CARD_GAP_PX = 6;

type PopoverPos = { top?: number; bottom?: number; left: number };

export const Editor: React.FC<EditorProps> = ({ text, onChange, issues, onIssuesUpdate }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const [overIssue, setOverIssue] = useState(false);
  const [layoutTick, setLayoutTick] = useState(0); // bumped when the visible area changes (keyboard, scroll)

  // Tracking the pending caret position after applying a fix
  const pendingCaretRef = useRef<number | null>(null);

  // Hover machinery lives in refs so the timer callbacks never see stale state
  const activeIdRef = useRef<string | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOpenIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    activeIdRef.current = activeIssueId;
  }, [activeIssueId]);

  const clearOpenTimer = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
    pendingOpenIdRef.current = null;
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const closeNow = () => {
    clearOpenTimer();
    clearCloseTimer();
    setActiveIssueId(null);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    if (closeTimerRef.current || activeIdRef.current === null) return;
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setActiveIssueId(null);
    }, CLOSE_DELAY_MS);
  };

  const openIssue = (id: string, immediate = false) => {
    clearCloseTimer();
    if (activeIdRef.current === id) {
      clearOpenTimer();
      return;
    }
    if (immediate) {
      clearOpenTimer();
      setActiveIssueId(id);
      return;
    }
    if (pendingOpenIdRef.current === id) return; // already waiting to open this one
    clearOpenTimer();
    pendingOpenIdRef.current = id;
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      pendingOpenIdRef.current = null;
      setActiveIssueId(id);
    }, OPEN_DELAY_MS);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // While a card is open: close it when the user taps or clicks anywhere outside the editor
  // (the card lives inside the container, so taps on the card itself do not count as outside)
  useEffect(() => {
    if (!activeIssueId) return;
    const onDocumentPointerDown = (e: PointerEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) {
        closeNow();
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIssueId]);

  // While a card is open: reposition it when the visible area changes (for example when the
  // on-screen keyboard slides up after tapping the textarea)
  useEffect(() => {
    if (!activeIssueId) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const bump = () => setLayoutTick((t) => t + 1);
    viewport.addEventListener('resize', bump);
    viewport.addEventListener('scroll', bump);
    return () => {
      viewport.removeEventListener('resize', bump);
      viewport.removeEventListener('scroll', bump);
    };
  }, [activeIssueId]);

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
      textareaRef.current.focus({ preventScroll: true });
      textareaRef.current.setSelectionRange(caret, caret);
      pendingCaretRef.current = null;
    }
  }, [text]);

  // Finding the active issue object
  const activeIssue = issues.find((i) => i.id === activeIssueId) || null;

  // Positioning the card next to the word. It goes below the word, or above it when there is
  // not enough room below in the visible area (which shrinks when the keyboard is open).
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!activeIssue || !container) {
      setPopoverPos(null);
      return;
    }

    const spanEl = container.querySelector<HTMLElement>(
      `[data-issue-id="${CSS.escape(activeIssue.id)}"]`
    );
    if (!spanEl) {
      setPopoverPos(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rects = spanEl.getClientRects();
    const firstLine = rects[0] ?? spanEl.getBoundingClientRect();
    const lastLine = rects[rects.length - 1] ?? firstLine;

    const viewport = window.visualViewport;
    const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const roomBelow = viewportBottom - lastLine.bottom;
    const placeAbove = roomBelow < CARD_MAX_HEIGHT_PX + CARD_GAP_PX;

    // Clamp horizontally so the card never overflows the editor on narrow screens
    const maxLeft = Math.max(0, containerRect.width - CARD_WIDTH_PX);
    const left = Math.min(Math.max(0, lastLine.left - containerRect.left), maxLeft);

    if (placeAbove) {
      // `bottom` is measured from the bottom edge of the container
      setPopoverPos({ bottom: containerRect.bottom - firstLine.top + CARD_GAP_PX, left });
    } else {
      setPopoverPos({ top: lastLine.bottom - containerRect.top + CARD_GAP_PX, left });
    }
  }, [activeIssue, text, issues, layoutTick]);

  // Mouse / pen hover: hit-test the pointer against the highlighted spans (throttled to one per frame)
  const handlePointerMove = (e: React.PointerEvent<HTMLTextAreaElement>) => {
    if (e.pointerType === 'touch') return; // touch has no hover, handled on pointer up
    pointRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const point = pointRef.current;
      const root = containerRef.current;
      if (!point || !root) return;

      const id = issueIdAtPoint(root, point.x, point.y);
      setOverIssue(id !== null);
      if (id) {
        openIssue(id);
      } else {
        scheduleClose();
      }
    });
  };

  // Touch: tap a highlighted word to open its card immediately, tap elsewhere in the text to close it
  const handlePointerUp = (e: React.PointerEvent<HTMLTextAreaElement>) => {
    if (e.pointerType !== 'touch') return;
    const root = containerRef.current;
    if (!root) return;
    // A fingertip is much less precise than a mouse pointer, so give it a bigger target
    const id = issueIdAtPoint(root, e.clientX, e.clientY, 8);
    if (id) {
      openIssue(id, true);
    } else {
      closeNow();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      closeNow();
      return;
    }
    // Keyboard route in: Ctrl/Cmd + "." opens the card for the issue under the caret
    if ((e.ctrlKey || e.metaKey) && e.key === '.') {
      e.preventDefault();
      const caret = e.currentTarget.selectionStart;
      const found = issues.find((i) => caret >= i.start && caret <= i.end);
      if (found) openIssue(found.id, true);
    }
  };

  const handleApply = (replacement: string) => {
    if (!activeIssue) return;

    const result = applyFix(text, activeIssue, replacement);
    if (!result) {
      // The text changed since this issue was found, so the fix is stale
      closeNow();
      return;
    }

    pendingCaretRef.current = result.caret;
    onChange(result.text);

    // Shift remaining issue offsets immediately so underlines don't flash while re-checking
    const lenDiff = replacement.length - (activeIssue.end - activeIssue.start);
    const updatedIssues = issues
      .filter((i) => i.id !== activeIssue.id)
      .map((i) => {
        if (i.start >= activeIssue.end) {
          return { ...i, start: i.start + lenDiff, end: i.end + lenDiff };
        }
        return i;
      });

    onIssuesUpdate(updatedIssues);
    closeNow();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-visible bg-white"
    >
      {/* Back layer: highlights */}
      <div className={`pointer-events-none absolute inset-0 select-none overflow-hidden ${TEXT_METRICS}`}>
        <HighlightLayer
          text={text}
          issues={issues}
          activeIssueId={activeIssueId}
          className="text-transparent"
        />
      </div>

      {/* Front layer: transparent textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          closeNow(); // the old issue offsets are about to be stale
          onChange(e.target.value);
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={(e) => {
          // Touch fires pointerleave right after pointerup, which would close a card we just opened
          if (e.pointerType === 'touch') return;
          setOverIssue(false);
          scheduleClose();
        }}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        spellCheck={false} // the browser's own red squiggles would double up with ours
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="Text to check"
        placeholder="Type or paste your text here..."
        rows={4}
        className={`relative z-10 ${TEXTAREA_CLASSES} ${overIssue ? 'cursor-pointer' : 'cursor-text'}`}
      />

      {/* Suggestion card */}
      {activeIssue && popoverPos && (
        <SuggestionCard
          issue={activeIssue}
          position={popoverPos}
          onApply={handleApply}
          onDismiss={() => {
            closeNow();
            textareaRef.current?.focus({ preventScroll: true });
          }}
          onPointerEnter={(e) => {
            if (e.pointerType !== 'touch') clearCloseTimer();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== 'touch') scheduleClose();
          }}
        />
      )}
    </div>
  );
};