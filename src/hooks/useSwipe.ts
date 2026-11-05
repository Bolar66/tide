import type { TouchEvent } from 'react';

export type SwipeDirection = 'left' | 'right';

const MIN_DX = 70;
const MAX_MS = 600;
/** Leave the screen edges to the system back gesture. */
const EDGE_PX = 24;
/** Movement before deciding whether the gesture is a scroll or a swipe. */
const LOCK_PX = 12;

interface Gesture {
  x: number;
  y: number;
  t: number;
  /** Decided from the first movement: vertical gestures are scrolls and never become swipes. */
  axis: 'x' | 'y' | null;
  scrollY: number;
}

// One touch at a time, kept outside React so a re-render mid-gesture does not lose it. A nested
// area (calendar) handles touchend first and clears it, so the outer handler then ignores it.
let gesture: Gesture | null = null;

/** Elements that scroll sideways themselves never start a page swipe. */
function scrollsSideways(el: HTMLElement | null): boolean {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
  }
  return false;
}

/**
 * Touch handlers that report a quick, clearly horizontal swipe. Swipes that start inside an element
 * marked `data-swipe="own"` (calendar), a sideways scroller, a form field or a sheet are ignored.
 */
export function swipeHandlers(onSwipe: (dir: SwipeDirection, e: TouchEvent) => void, { ownArea = false } = {}) {
  return {
    onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      if (!touch || e.touches.length > 1) {
        gesture = null;
        return;
      }
      if (!ownArea) {
        if (target.closest('[data-swipe="own"], input, textarea, select, .sheet')) return;
        if (touch.clientX < EDGE_PX || touch.clientX > window.innerWidth - EDGE_PX) return;
        if (scrollsSideways(target)) return;
      }
      gesture = { x: touch.clientX, y: touch.clientY, t: performance.now(), axis: null, scrollY: window.scrollY };
    },
    onTouchMove(e: TouchEvent) {
      const g = gesture;
      const touch = e.touches[0];
      if (!g || !touch || g.axis) return;
      const dx = Math.abs(touch.clientX - g.x);
      const dy = Math.abs(touch.clientY - g.y);
      if (dx > LOCK_PX || dy > LOCK_PX) g.axis = dx > dy * 1.5 ? 'x' : 'y';
    },
    onTouchEnd(e: TouchEvent) {
      const g = gesture;
      gesture = null;
      const touch = e.changedTouches[0];
      if (!g || !touch || g.axis !== 'x') return;
      // The page scrolled during the gesture: it was a (diagonal) scroll, not a swipe.
      if (Math.abs(window.scrollY - g.scrollY) > 8) return;
      const dx = touch.clientX - g.x;
      const dy = touch.clientY - g.y;
      if (Math.abs(dx) < MIN_DX || Math.abs(dy) > Math.abs(dx) * 0.5 || performance.now() - g.t > MAX_MS) return;
      onSwipe(dx < 0 ? 'left' : 'right', e);
    },
    onTouchCancel() {
      gesture = null;
    },
  };
}
