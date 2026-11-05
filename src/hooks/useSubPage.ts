import { useEffect, useRef, useState } from 'react';

/** History entries for in-view pages carry this flag; a back swipe on one steps out of the page. */
export const isSubPageEntry = () => (window.history.state as { tideSub?: boolean } | null)?.tideSub === true;

/**
 * Navigation inside one view (settings pages, Opi sections and articles). Every step forward adds
 * a browser history entry, so the system back gesture and swipe-back return to the previous page
 * instead of jumping to the previously opened tab.
 */
export function useSubPage<T>(root: T, initial: T = root) {
  const [stack, setStack] = useState<T[]>(() => (initial === root ? [root] : [root, initial]));
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const pushedInitial = useRef(false);

  useEffect(() => {
    // Opened straight on a sub page (e.g. "Valitse seurattavat" from home): back leads to the root.
    if (stack.length > 1 && !pushedInitial.current) {
      pushedInitial.current = true;
      window.history.pushState({ tideSub: true }, '');
    }
    const onPop = () => {
      setDir('back');
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = stack[stack.length - 1] as T;
  return {
    page,
    depth: stack.length - 1,
    dir,
    go(next: T) {
      setDir('forward');
      setStack((s) => [...s, next]);
      window.history.pushState({ tideSub: true }, '');
      window.scrollTo(0, 0);
    },
    back() {
      if (stack.length > 1) window.history.back();
    },
  };
}
