import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import './styles.css';
import { applyTheme, getStoredTheme } from './theme/tokens';
import { initializeEntra } from './features/auth/entraAuth';

applyTheme(getStoredTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[main] #root element not found in document');
}

void initializeEntra().then(() => createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
)).catch((error: unknown) => {
  rootElement.textContent = error instanceof Error ? error.message : 'Microsoft sign-in could not start';
});
