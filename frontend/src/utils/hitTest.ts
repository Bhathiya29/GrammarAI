// Finds which issue span (if any) is under the pointer.
// `root` is any element that contains the <span data-issue-id="..."> elements.
// getClientRects() returns one rectangle per line box, so a phrase that wraps
// across two lines is still hit-tested correctly.
export function issueIdAtPoint(
    root: HTMLElement,
    x: number,
    y: number,
    pad = 2
  ): string | null {
    const spans = root.querySelectorAll<HTMLElement>('[data-issue-id]');
    for (const span of Array.from(spans)) {
      for (const rect of Array.from(span.getClientRects())) {
        if (
          x >= rect.left - pad &&
          x <= rect.right + pad &&
          y >= rect.top - pad &&
          y <= rect.bottom + pad
        ) {
          return span.dataset.issueId ?? null;
        }
      }
    }
    return null;
  }