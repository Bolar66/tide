import { useEffect, useRef, useState } from 'react';

/** History entries for in-view pages carry this flag; a back swipe on one steps out of the page. */
export const isSubPageEntry = () => (window.history.state as { tideSub?: boolean } | null)?.tideSub === true;

/**
 * Navigation inside one view (settings pages, Opi sections and articles). Every step forward adds
 * a browser history entry, so the system back gesture and swipe-back return to the previous page
 * instead of jumping to the previously opened tab. Stepping back restores the parent's scroll.
 */
export function useSubPage<T>(root: T, initial: T = root) {
  const [stack, setStack] = useState<T[]>(() => (initial === root ? [root] : [root, initial]));
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const pushedInitial = useRef(false);
  /** Scroll position per depth, saved when leaving that depth forwards. */
  const scrolls = useRef<number[]>([]);
  const prevDepth = useRef(stack.length - 1);

  useEffect(() => {
    // Opened straight on a sub page (e.g. "Valitse seurattavat" from home): back leads to the root.
    if (stack.length > 1 && !pushedInitial.current) {
      pushedInitial.current = true;
      window.history.pushState({ tideSub: true }, '');
    }
    const onPop = () => {
      setDir('back');
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const depth = stack.length - 1;
  useEffect(() => {
    if (depth < prevDepth.current) window.scrollTo(0, scrolls.current[depth] ?? 0);
    else if (depth > prevDepth.current) window.scrollTo(0, 0);
    prevDepth.current = depth;
  }, [depth]);

  return {
    page: stack[depth] as T,
    depth,
    dir,
    go(next: T) {
      scrolls.current[depth] = window.scrollY;
      setDir('forward');
      setStack((s) => [...s, next]);
      window.history.pushState({ tideSub: true }, '');
    },
    back() {
      if (stack.length > 1) window.history.back();
    },
  };
}
