import { useEffect, RefObject } from 'react';

/**
 * Universal mouse wheel handler:
 * 1. Attaches passive global wheel listener to window to eliminate dead zones (header, margins).
 * 2. When hovering directly over the scroll container or its content, native hardware-accelerated
 *    compositor scrolling handles it with zero latency.
 * 3. When hovering over chrome elements (header, margins, outer padding), it routes the wheel delta
 *    to the primary container so scrolling never gets stuck.
 * 4. Strictly passive ({ passive: true }) so the browser never blocks input, drops frames, or halts.
 */
export function useWheelScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // Allow browser zoom (Ctrl+wheel) and horizontal gestures
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      const el = ref.current;
      if (!el) return;

      // Ensure container has scrollable content
      if (el.scrollHeight <= el.clientHeight) {
        return;
      }

      // Check if target under pointer is already inside an independent scroll container
      let cur = e.target as HTMLElement | null;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        if (cur === el) {
          // Hovered directly over or inside our container:
          // Native browser compositor scrolling handles it smoothly with 0 latency.
          return;
        }
        if (cur.scrollHeight > cur.clientHeight) {
          const style = window.getComputedStyle(cur);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            // Hovered over another scrollable container (e.g. modal, code block, drawer):
            // Let that container handle its own scroll.
            return;
          }
        }
        cur = cur.parentElement;
      }

      // Target is in a dead zone (header, side padding, outer margins).
      // Route scroll delta to the active view container.
      el.scrollTop += e.deltaY;
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [ref]);
}
