import { useState, useEffect } from 'react';
import { checkText } from '../api/client';
import type { Issue } from '../types';

type Status = "idle" | "checking" | "error";

export function useGrammarCheck(text: string, delayMs = 400) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // 1. If the text is empty or whitespace, clearing issues and reset status
    if (!text.trim()) {
      setIssues([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();

    // 2. Setting debounce timer
    const timer = setTimeout(async () => {
      setStatus("checking");
      try {
        const response = await checkText(text, controller.signal);
        setIssues(response.issues);
        setStatus("idle");
      } catch (err: any) {
        // 3. Ignoring AbortError (we expect cancellation when typing fast)
        if (err.name === 'AbortError') {
          return;
        }
        setStatus("error");
      }
    }, delayMs);

    // 4. Cleanup which clears pending timeout and aborts active fetch if user types again
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, delayMs]);

  return { issues, status };
}