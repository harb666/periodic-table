import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/press-start-2p/400.css';
import './styles/theme.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const crash = (
  <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#fff' }}>
    <h1>Oops – ATOMIC.EXE hit a glitch.</h1>
    <p>Please reload the page. Your progress is saved on this device.</p>
    <button onClick={() => window.location.reload()} style={{ fontSize: 18, padding: '10px 16px' }}>
      Reload
    </button>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={crash}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
