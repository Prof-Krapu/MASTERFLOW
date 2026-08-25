import {useState} from 'react';

import {BrandHeader} from '@/components/BrandHeader';
import {RepubliqueFooter} from '@/components/RepubliqueFooter';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {CORRECTOR_APPS} from '@/lib/apps';
import {apiRegister} from '@/lib/session';

/** Lit `next` (chemin local uniquement, anti open-redirect) ou retombe sur '/'. */
function readNext(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

export function RegisterPage() {
  const initialInvite = new URLSearchParams(window.location.search).get('invite') ?? '';
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [app, setApp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRegister(username, password, inviteCode, app, displayName);
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
              Inscription
            </div>
            <CardTitle className="text-2xl">Créer un compte</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label htmlFor="invite">Code d'invitation</Label>
                <Input
                  id="invite"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.trim())}
                  placeholder="Reçu de votre administrateur"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="display-name">Prénom ou pseudo</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="given-name"
                  maxLength={60}
                  placeholder="Facultatif"
                />
                <p className="text-xs text-muted-foreground">
                  C'est ce nom qui vous accueillera dans votre correcteur, pas votre identifiant.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="username">Identifiant</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  pattern="[A-Za-z0-9._-]{3,40}"
                  title="3-40 caractères, alphanumériques + . _ -"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="app">Votre matière (correcteur)</Label>
                <select
                  id="app"
                  value={app}
                  onChange={(e) => setApp(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled>
                    — Choisissez votre matière —
                  </option>
                  {CORRECTOR_APPS.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.title}
                    </option>
                  ))}
                </select>
                <p className="rounded-sm border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                  <strong>Ce choix est définitif</strong> : votre compte sera rattaché à ce seul
                  correcteur. En cas d'erreur, contactez l'administrateur pour le modifier.
                </p>
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Création…' : 'Créer mon compte'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Déjà un compte ?{' '}
                <a
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  href={`/login${window.location.search}`}
                >
                  Connexion
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
