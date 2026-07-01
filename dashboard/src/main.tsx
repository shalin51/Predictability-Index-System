import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import './styles.css';
import { applyTheme, getStoredTheme } from './theme/tokens';

applyTheme(getStoredTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[main] #root element not found in document');
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
