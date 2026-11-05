import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Route = 'today' | 'calendar' | 'stats' | 'followed' | 'learn' | 'settings' | 'about';
const ROUTES: Route[] = ['today', 'calendar', 'stats', 'followed', 'learn', 'settings', 'about'];

const read = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'today';
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hash routing with View Transitions where supported (Safari 18+, Chrome). The DOM must update
 * synchronously inside the transition callback, hence flushSync + pushState instead of hashchange.
 */
export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('popstate', onChange);
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener('hashchange', onChange);
    };
  }, []);

  const navigate = (r: Route) => {
    if (r === route) return;
    const update = () => {
      flushSync(() => setRoute(r));
      window.history.pushState(null, '', r === 'today' ? window.location.pathname : `#/${r}`);
      window.scrollTo(0, 0);
    };
    if (document.startViewTransition && !reducedMotion()) {
      // A transition can be skipped (e.g. viewport resize mid-animation); the DOM update still happens.
      const vt = document.startViewTransition(update);
      vt.ready.catch(() => undefined);
      vt.finished.catch(() => undefined);
    } else {
      update();
    }
  };

  return [route, navigate];
}
