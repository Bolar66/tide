import type { TouchEvent } from 'react';

export type SwipeDirection = 'left' | 'right';

const MIN_DX = 60;
/** Mostly sideways: vertical scrolling never counts as a swipe. */
const MAX_SLOPE = 0.6;
const MAX_MS = 700;
const EDGE_PX = 24;

interface Start {
  x: number;
  y: number;
  t: number;
}

/**
 * Touch handlers that report a quick horizontal swipe. Swipes that start inside an element
 * marked `data-swipe="own"` (calendar, sliders, horizontal lists) are left to that element.
 */
// One touch at a time, kept outside React so a re-render mid-gesture does not lose it. A nested
// area (calendar) handles touchend first and clears it, so the outer handler then ignores it.
let start: Start | null = null;

export function swipeHandlers(onSwipe: (dir: SwipeDirection, e: TouchEvent) => void, { ownArea = false } = {}) {
  return {
    onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      if (!touch || e.touches.length > 1) return;
      if (!ownArea && target.closest('[data-swipe="own"], input, textarea, select, .sheet')) return;
      // Leave the screen edge to the system back gesture.
      if (!ownArea && (touch.clientX < EDGE_PX || touch.clientX > window.innerWidth - EDGE_PX)) return;
      start = { x: touch.clientX, y: touch.clientY, t: performance.now() };
    },
    onTouchEnd(e: TouchEvent) {
      const s = start;
      start = null;
      const touch = e.changedTouches[0];
      if (!s || !touch) return;
      const dx = touch.clientX - s.x;
      const dy = touch.clientY - s.y;
      if (Math.abs(dx) < MIN_DX || Math.abs(dy) > Math.abs(dx) * MAX_SLOPE || performance.now() - s.t > MAX_MS) return;
      onSwipe(dx < 0 ? 'left' : 'right', e);
    },
  };
}
