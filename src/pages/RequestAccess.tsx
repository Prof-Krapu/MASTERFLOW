import {useState} from 'react';
import {CheckCircle2} from 'lucide-react';

import {BrandHeader} from '@/components/BrandHeader';
import {RepubliqueFooter} from '@/components/RepubliqueFooter';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {submitAccessRequest} from '@/lib/access';

/** Formulaire public de demande d'accès à la bêta (aucune session requise). */
export function RequestAccessPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [mailingOptIn, setMailingOptIn] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot anti-bot, invisible pour un humain
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitAccessRequest({email, name, message, mailingOptIn, website});
      setSent(true);
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        msg.includes('429')
          ? 'Trop de demandes envoyées, réessayez plus tard.'
          : msg.includes('400')
            ? 'Adresse email invalide.'
            : `Erreur : ${msg}`,
      );
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
              Accès bêta
            </div>
            <CardTitle className="text-2xl">Demander un accès au projet</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <p className="text-sm text-foreground">
                  Demande envoyée. Si elle est retenue, vous recevrez par email une invitation
                  pour créer votre compte.
                </p>
                <a
                  className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href="/login"
                >
                  Retour à la connexion
                </a>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <p className="text-sm text-muted-foreground">
                  Le projet CORRECTORS est en bêta sur invitation. Laissez vos coordonnées :
                  votre demande sera examinée par l'administrateur.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="req-email">Adresse email</Label>
                  <Input
                    id="req-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="req-name">Nom et prénom</Label>
                  <Input
                    id="req-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="req-message">Message / motivation (facultatif)</Label>
                  <textarea
                    id="req-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Matière enseignée, établissement, besoin…"
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                {/* Honeypot : caché aux humains, rempli par les bots. */}
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={mailingOptIn}
                    onChange={(e) => setMailingOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input"
                  />
                  Je souhaite être informé(e) des évolutions du projet par email
                </label>
                {error && <div className="text-sm text-destructive">{error}</div>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Envoi…' : 'Envoyer ma demande'}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Déjà une invitation ?{' '}
                  <a
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href="/register"
                  >
                    Créer un compte
                  </a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      <RepubliqueFooter />
    </div>
  );
}
