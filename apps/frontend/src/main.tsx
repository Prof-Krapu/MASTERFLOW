import {StrictMode, useEffect, useState} from 'react';
import type {ReactElement} from 'react';
import {createRoot} from 'react-dom/client';

import App from './App.tsx';
import {getCurrentContext, restoreRuntimeAuthToken} from './api.ts';
import {MasterFlowIntro} from './masterflow-intro.tsx';
import {ComponentLab} from './ui-reset/component-lab.tsx';
import './styles.css';
import './ui-reset/masterflow-ui-tokens.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Element #root introuvable dans index.html');
}

// Le Lab contient des fixtures de profils et de rôles : il reste strictement local.
// Une build preview/production ne doit jamais exposer ces changements d'identité simulés.
const isComponentLab = import.meta.env.DEV && (
  window.location.pathname === '/ui-lab'
  || window.location.pathname.startsWith('/ui-lab/')
);
const componentLabWorkspace = window.location.pathname.startsWith('/ui-lab/vincent')
  ? 'vincent'
  : 'malex';

function GodmodeDebugLab(): ReactElement {
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    const token = restoreRuntimeAuthToken();
    if (!token) {
      setAccess('denied');
      return;
    }
    let cancelled = false;
    void getCurrentContext(token)
      .then((context) => {
        if (!cancelled) setAccess(context.user.role === 'godmode' ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setAccess('denied');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (access === 'allowed') return <ComponentLab workspaceId={componentLabWorkspace} />;
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="eyebrow">Debug local</p>
        <h1>{access === 'checking' ? 'Vérification du compte…' : 'Accès refusé'}</h1>
        <p>Les simulations d’identité sont réservées à une session godmode en développement local.</p>
        {access === 'denied' ? <a href="/">Retour à MasterFlow</a> : null}
      </section>
    </main>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    {isComponentLab
        ? <GodmodeDebugLab key={componentLabWorkspace} />
        : (
          <>
            <div className="masterflow-stage">
              <App />
            </div>
            <MasterFlowIntro />
          </>
        )}
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', {updateViaCache: 'none'})
      .then((registration) => registration.update());
  });
}
