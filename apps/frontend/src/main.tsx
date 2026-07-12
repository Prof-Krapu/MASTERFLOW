import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import App from './App.tsx';
import {CurrentUiDemo} from './current-ui-demo.tsx';
import {ComponentLab} from './ui-reset/component-lab.tsx';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Element #root introuvable dans index.html');
}

const isComponentLab = window.location.pathname === '/ui-lab'
  || window.location.pathname.startsWith('/ui-lab/');
const componentLabWorkspace = window.location.pathname.startsWith('/ui-lab/vincent')
  ? 'vincent'
  : 'malex';
const isUiReset = window.location.pathname === '/current-ui'
  || window.location.pathname === '/ui-reset';

createRoot(rootElement).render(
  <StrictMode>
    {isComponentLab
      ? <ComponentLab workspaceId={componentLabWorkspace} />
      : isUiReset
        ? <CurrentUiDemo />
        : <App />}
  </StrictMode>,
);
