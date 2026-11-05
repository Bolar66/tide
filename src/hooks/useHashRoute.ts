import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Route = 'today' | 'calendar' | 'stats' | 'settings' | 'about';
const ROUTES: Route[] = ['today', 'calendar', 'stats', 'settings', 'about'];

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
    if (document.startViewTransition && !reducedMotion()) document.startViewTransition(update);
    else update();
  };

  return [route, navigate];
}
