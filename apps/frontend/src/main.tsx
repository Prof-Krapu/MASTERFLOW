import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import App from './App.tsx';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Element #root introuvable dans index.html');
}

async function renderFrontend(container: HTMLElement): Promise<void> {
  const spike = new URLSearchParams(window.location.search).get('ui_spike');
  if (spike === 'mantine') {
    await import('@mantine/core/styles.css');
    const {MantineSpike} = await import('./mantine-spike.tsx');
    createRoot(container).render(
      <StrictMode>
        <MantineSpike />
      </StrictMode>,
    );
    return;
  }
  if (spike === 'current') {
    const {CurrentUiDemo} = await import('./current-ui-demo.tsx');
    createRoot(container).render(
      <StrictMode>
        <CurrentUiDemo />
      </StrictMode>,
    );
    return;
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void renderFrontend(rootElement);
