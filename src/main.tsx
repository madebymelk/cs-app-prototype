import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/roboto-mono/400.css';
import './design/tokens.css';
import './design/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

async function enableMocks() {
  // The prototype always runs on mocks unless explicitly disabled (real adapters replace src/api later).
  if (import.meta.env.VITE_USE_MOCKS === 'false') return;
  if (import.meta.env.VITE_DEMO === 'true') {
    // Static demo: service workers are unavailable, so route /api calls to the same handlers in-page.
    const { installFetchShim } = await import('./api/msw/fetchShim');
    installFetchShim();
    return;
  }
  const { worker } = await import('./api/msw/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

void enableMocks().then(() => {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
