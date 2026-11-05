import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Backdrop } from './components/Backdrop';
import { Root } from './session/Root';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/palettes.css';
import './styles/global.css';
import './styles/ui.css';

// Ask the browser not to evict our IndexedDB data under storage pressure.
void navigator.storage?.persist?.().catch(() => false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Backdrop />
    <Root />
  </StrictMode>,
);
