import {useState} from 'react';

import {BrandHeader} from '@/components/BrandHeader';
import {RepubliqueFooter} from '@/components/RepubliqueFooter';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {apiLogin} from '@/lib/session';

/** Récupère le paramètre `next` de l'URL pour rediriger après login. */
function readNext(): string {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next) return '/';
  // Sécurité élémentaire : seuls les chemins locaux sont acceptés (pas d'open-redirect).
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//')) return '/';
  return next;
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiLogin(username, password);
      window.location.href = readNext();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <BrandHeader />

      <main className="flex flex-1 items-center justify-center bg-[#F5F5FE] px-6 py-12 dark:bg-[#1B1B35]">
        <Card className="w-full max-w-md rounded-sm border border-border border-t-2 border-t-primary shadow-sm">
          <CardHeader>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              Connexion
            </div>
            <CardTitle className="text-2xl">Accédez à votre espace</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label htmlFor="username">Identifiant</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Connexion…' : 'Se connecter'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Pas encore de compte ?{' '}
                <a
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  href={`/register${window.location.search}`}
                >
                  Créer un compte avec une invitation
                </a>
                <div className="mt-1">
                  Pas d'invitation ?{' '}
                  <a
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href="/request-access"
                  >
                    Demander un accès au projet en bêta
                  </a>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <RepubliqueFooter />
    </div>
  );
}
