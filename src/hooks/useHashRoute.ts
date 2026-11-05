import { useEffect, useState } from 'react';

export type Route = 'today' | 'calendar' | 'stats' | 'settings';
const ROUTES: Route[] = ['today', 'calendar', 'stats', 'settings'];

const read = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'today';
};

export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = (r: Route) => {
    window.location.hash = r === 'today' ? '' : `/${r}`;
    window.scrollTo(0, 0);
  };
  return [route, navigate];
}
