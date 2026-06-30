import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { applyTheme, getStoredTheme } from './theme/tokens';

applyTheme(getStoredTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[main] #root element not found in document');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
