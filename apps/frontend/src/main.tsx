import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import App from './App.tsx';
import {CurrentUiDemo} from './current-ui-demo.tsx';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Element #root introuvable dans index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    {window.location.pathname === '/current-ui' ? <CurrentUiDemo /> : <App />}
  </StrictMode>,
);
