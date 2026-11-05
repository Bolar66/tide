import { createContext, useContext, useSyncExternalStore } from 'react';
import type { State, Store } from './store';

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext puuttuu');
  return store;
}

/** Subscribe to a slice of state. Selectors must return stable references (state fields, not new objects). */
export function useTide<T>(selector: (s: State) => T): T {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
