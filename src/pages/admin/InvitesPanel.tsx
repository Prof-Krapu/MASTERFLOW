import {useEffect, useState} from 'react';
import {Check, Copy, MailPlus, Trash2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

interface Invite {
  code: string;
  created_at: number;
  expires_at: number | null;
  max_uses: number;
  used_count: number;
  revoked: number;
}

async function listInvites(): Promise<Invite[]> {
  const r = await fetch('/api/v1/admin/invites', {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {invites: Invite[]}).invites;
}

async function createInvite(maxUses: number, expiresInDays: number | null): Promise<string> {
  const r = await fetch('/api/v1/admin/invites', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({maxUses, expiresInDays}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {code: string}).code;
}

async function revokeInvite(code: string): Promise<void> {
  const r = await fetch(`/api/v1/admin/invites/${encodeURIComponent(code)}/revoke`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export function InvitesPanel() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState<number | ''>(30);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function refresh() {
    listInvites()
      .then(setInvites)
      .catch((e) => setError((e as Error).message));
  }

  useEffect(refresh, []);

  async function onCreate() {
    setError(null);
    try {
      const code = await createInvite(maxUses, expiresInDays === '' ? null : expiresInDays);
      setJustCreated(code);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
    } catch {
      // Pas de retour si le clipboard est indisponible (HTTP non sécurisé p. ex.).
    }
  }

  const shareUrl = (code: string) => {
    const base = `${window.location.origin}/register`;
    return `${base}?invite=${encodeURIComponent(code)}`;
  };

  return (
    <Card className="rounded-sm border border-border border-t-2 border-t-primary">
      <CardHeader>
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Codes d'accès
        </div>
        <CardTitle>Invitations</CardTitle>
        <p className="text-sm text-muted-foreground">
          Générez un code à partager avec vos collègues. Ils saisissent ce code dans le
          formulaire d'inscription pour créer leur compte.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-sm border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <MailPlus className="h-3.5 w-3.5" /> Nouveau code
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="maxUses">Nombre maximum d'inscriptions</Label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={(e) =>
                  setMaxUses(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                }
              />
              <p className="text-xs text-muted-foreground">
                Combien de personnes peuvent utiliser ce code pour créer un compte. 1 = code à
                usage unique.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="days">Validité (jours)</Label>
              <Input
                id="days"
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) =>
                  setExpiresInDays(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
                }
                placeholder="∞"
              />
              <p className="text-xs text-muted-foreground">
                Laisser vide pour un code sans date d'expiration.
              </p>
            </div>
            <Button onClick={onCreate} className="self-start sm:self-end">
              Générer un code
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {justCreated && (
          <div className="rounded-sm border border-l-4 border-l-primary bg-accent/40 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
              Code prêt à partager
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-sm bg-card px-3 py-1.5 font-mono text-base font-bold tracking-wider text-foreground">
                {justCreated}
              </code>
              <Button variant="outline" size="sm" onClick={() => copy(justCreated)}>
                {copiedCode === justCreated ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copier le code
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copy(shareUrl(justCreated))}
                title="Copie une URL pré-remplie /register?invite=…"
              >
                {copiedCode === shareUrl(justCreated) ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" /> URL copiée
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copier l'URL d'inscription
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Partagez ce code (ou directement l'URL d'inscription pré-remplie) à votre collègue.
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-sm border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Code</th>
                <th className="px-3 py-2 text-left font-semibold">Inscriptions</th>
                <th className="px-3 py-2 text-left font-semibold">Expire</th>
                <th className="px-3 py-2 text-left font-semibold">Statut</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => {
                const active = !i.revoked && i.used_count < i.max_uses;
                const epuise = !i.revoked && i.used_count >= i.max_uses;
                return (
                  <tr key={i.code} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{i.code}</td>
                    <td className="px-3 py-2">
                      <span className="tabular-nums">
                        {i.used_count} / {i.max_uses}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {i.expires_at ? new Date(i.expires_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {i.revoked ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> révoqué
                        </span>
                      ) : active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-700" /> actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> épuisé
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {active && (
                          <Button variant="ghost" size="sm" onClick={() => copy(i.code)}>
                            {copiedCode === i.code ? (
                              <>
                                <Check className="mr-1 h-3.5 w-3.5" /> Copié
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-3.5 w-3.5" /> Copier
                              </>
                            )}
                          </Button>
                        )}
                        {(active || epuise) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (!window.confirm(`Révoquer le code « ${i.code} » ?`)) return;
                              await revokeInvite(i.code);
                              refresh();
                            }}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Révoquer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invites.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                    Aucune invitation pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
