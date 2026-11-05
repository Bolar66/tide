import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DexiePersistence } from './db/persistence';
import { StoreContext } from './store/context';
import { createStore } from './store/store';
import './styles/tokens.css';
import './styles/global.css';
import './styles/ui.css';

const store = createStore(new DexiePersistence());
void store.load();

// Ask the browser not to evict our IndexedDB data under storage pressure.
void navigator.storage?.persist?.().catch(() => false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  </StrictMode>,
);
