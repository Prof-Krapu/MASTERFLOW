import {useSession} from '@/lib/session';

import {Landing} from './pages/Landing';
import {LoginPage} from './pages/Login';
import {RegisterPage} from './pages/Register';
import {RequestAccessPage} from './pages/RequestAccess';
import {AdminLayout} from './pages/admin/AdminLayout';

/**
 * Routing client minimal basé sur window.location.pathname.
 * - /login, /register, /request-access : pages publiques (anonymes autorisés)
 * - /admin            : nécessite session admin
 * - /                 : landing (nécessite session)
 *
 * Pas de react-router : 5 vues, navigation par window.location.href = '/…'.
 * Les /app/* sont gérés côté Express (reverse proxy) et n'atteignent jamais le SPA.
 */
export default function App() {
  const session = useSession();
  const path = window.location.pathname;

  if (path.startsWith('/login')) return <LoginPage />;
  if (path.startsWith('/register')) return <RegisterPage />;
  if (path.startsWith('/request-access')) return <RequestAccessPage />;

  if (session.status === 'loading') {
    return <CenterMessage text="Chargement…" />;
  }
  if (session.status === 'error') {
    return <CenterMessage text={`Erreur : ${session.message}`} />;
  }
  if (session.status === 'anon') {
    const next = encodeURIComponent(path + window.location.search);
    window.location.href = `/login?next=${next}`;
    return <CenterMessage text="Redirection…" />;
  }

  if (path.startsWith('/admin')) {
    if (session.user.role !== 'admin') {
      window.location.href = '/';
      return <CenterMessage text="Redirection…" />;
    }
    return <AdminLayout currentUser={session.user} />;
  }

  return <Landing user={session.user} />;
}

function CenterMessage({text}: {text: string}) {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      {text}
    </div>
  );
}
