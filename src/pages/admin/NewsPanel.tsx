import {useEffect, useState} from 'react';
import {Check, Copy, Mail, Megaphone, Pencil, Plus, Trash2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {adminListMailing} from '@/lib/access';
import {
  adminCreateNews,
  adminDeleteNews,
  adminListNews,
  adminMarkNewsEmailed,
  adminUpdateNews,
  type NewsAdminItem,
} from '@/lib/news';

const CATEGORIES = ['nouveauté', 'mise à jour', 'information'] as const;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', year: 'numeric'});
}

export function NewsPanel({onOpenMailing}: {onOpenMailing: () => void}) {
  const [items, setItems] = useState<NewsAdminItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mailingEmails, setMailingEmails] = useState<string[]>([]);
  const [copiedMailId, setCopiedMailId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('nouveauté');
  // Canaux de diffusion : `published` = fil Nouveautés de la landing (état persistant),
  // `sendEmail` = ouvrir le brouillon Cci à l'enregistrement (action ponctuelle).
  const [published, setPublished] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);

  function refresh() {
    adminListNews()
      .then(setItems)
      .catch((e) => setError((e as Error).message));
  }

  useEffect(refresh, []);

  // Abonnés actifs de la liste de diffusion, pour le brouillon Cci « Envoyer par email ».
  useEffect(() => {
    adminListMailing()
      .then((subs) => setMailingEmails(subs.filter((s) => s.active).map((s) => s.email)))
      .catch(() => {});
  }, []);

  function resetForm() {
    setTitle('');
    setContent('');
    setCategory('nouveauté');
    setPublished(true);
    setSendEmail(false);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(item: NewsAdminItem) {
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category);
    setPublished(!!item.published);
    setSendEmail(false);
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    setError(null);
    try {
      let id = editingId;
      if (editingId !== null) {
        await adminUpdateNews(editingId, {title, content, category, published});
      } else {
        id = await adminCreateNews({title, content, category, published});
      }
      if (sendEmail && id !== null && mailingEmails.length > 0) {
        openEmailDraft(title, content);
        await adminMarkNewsEmailed(id);
      }
      resetForm();
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    try {
      await adminDeleteNews(id);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Ouvre un brouillon dans le client mail de l'admin, tous les abonnés en Cci.
  function openEmailDraft(draftTitle: string, draftContent: string) {
    window.location.href =
      `mailto:?bcc=${encodeURIComponent(mailingEmails.join(','))}` +
      `&subject=${encodeURIComponent(`[CORRECTORS] ${draftTitle}`)}` +
      `&body=${encodeURIComponent(draftContent)}`;
  }

  // Ré-envoi manuel depuis la liste (nouveaux abonnés, brouillon fermé sans envoyer…).
  async function handleSendEmail(item: NewsAdminItem) {
    openEmailDraft(item.title, item.content);
    try {
      await adminMarkNewsEmailed(item.id);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Repli quand le brouillon mailto ne s'ouvre pas (URL trop longue au-delà de
  // ~2000 caractères selon le client) : tout copier pour coller à la main.
  async function handleCopyEmail(item: NewsAdminItem) {
    const text =
      `Cci : ${mailingEmails.join(', ')}\n` +
      `Objet : [CORRECTORS] ${item.title}\n\n` +
      item.content;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMailId(item.id);
      window.setTimeout(() => setCopiedMailId((c) => (c === item.id ? null : c)), 1800);
    } catch {
      // Clipboard indisponible : pas de retour.
    }
  }

  // Le libellé du bouton reflète les canaux cochés (landing / email / les deux / brouillon).
  const submitLabel =
    editingId !== null
      ? sendEmail
        ? "Enregistrer + envoyer l'email"
        : 'Enregistrer'
      : published && sendEmail
        ? "Publier + envoyer l'email"
        : sendEmail
          ? 'Envoyer par email'
          : published
            ? 'Publier sur la landing'
            : 'Enregistrer le brouillon';

  const categoryBadge = (cat: NewsAdminItem['category']) => {
    const styles: Record<string, string> = {
      nouveauté: 'bg-primary/10 text-primary',
      'mise à jour': 'bg-green-100 text-green-800',
      information: 'bg-muted text-muted-foreground',
    };
    return (
      <span className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[cat] ?? ''}`}>
        {cat}
      </span>
    );
  };

  return (
    <Card className="rounded-sm border border-border border-t-2 border-t-primary">
      <CardHeader>
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Communication
        </div>
        <CardTitle>Nouveautés</CardTitle>
        <p className="text-sm text-muted-foreground">
          Publiez des annonces et choisissez leur diffusion : sur la landing (fil Nouveautés),
          par email aux {mailingEmails.length} abonné(s) de la liste de diffusion (
          <button
            type="button"
            onClick={onOpenMailing}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            gérer la liste
          </button>
          ), ou les deux. L'email s'ouvre en brouillon Cci dans votre client mail.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-end">
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Nouvelle annonce
            </Button>
          )}
        </div>

        {showForm && (
          <div className="rounded-sm border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Megaphone className="h-3.5 w-3.5" />
              {editingId !== null ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="news-title">Titre</Label>
                <Input
                  id="news-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Nouveau correcteur Mathématiques"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="news-content">Contenu</Label>
                <textarea
                  id="news-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Décrivez la nouveauté en quelques phrases…"
                  rows={3}
                  className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="news-category">Catégorie</Label>
                  <select
                    id="news-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                    className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Diffusion</Label>
                <div className="flex flex-col gap-2 rounded-sm border border-input bg-background px-3 py-2.5 sm:flex-row sm:items-center sm:gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                    Landing (fil Nouveautés, visible à la connexion)
                  </label>
                  <label
                    className={`flex items-center gap-2 text-sm ${mailingEmails.length === 0 ? 'opacity-50' : ''}`}
                    title={
                      mailingEmails.length === 0
                        ? 'Aucun abonné actif dans la liste de diffusion'
                        : `Ouvre un brouillon Cci vers ${mailingEmails.length} abonné(s) à l'enregistrement`
                    }
                  >
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      disabled={mailingEmails.length === 0}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email aux {mailingEmails.length} abonné(s)
                  </label>
                </div>
                {!published && !sendEmail && (
                  <p className="text-xs text-muted-foreground">
                    Aucun canal coché : l'annonce sera enregistrée en brouillon, invisible et non
                    envoyée.
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSubmit} disabled={!title || !content}>
                  {submitLabel}
                </Button>
                <Button variant="ghost" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-sm border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Titre</th>
                <th className="px-3 py-2 text-left font-semibold">Catégorie</th>
                <th className="px-3 py-2 text-center font-semibold">Diffusion</th>
                <th className="px-3 py-2 text-right font-semibold">Lectures</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(item.created_at)}</td>
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2">{categoryBadge(item.category)}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      {!!item.published && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-700" /> Landing
                        </span>
                      )}
                      {item.emailed_at ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                          title="Date d'ouverture du dernier brouillon email"
                        >
                          <Mail className="h-3 w-3" /> Email · {formatDate(item.emailed_at)}
                        </span>
                      ) : null}
                      {!item.published && !item.emailed_at && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Brouillon
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.read_count}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendEmail(item)}
                        disabled={mailingEmails.length === 0}
                        title={
                          mailingEmails.length === 0
                            ? 'Aucun abonné actif dans la liste de diffusion'
                            : `Ouvre un brouillon Cci vers ${mailingEmails.length} abonné(s)`
                        }
                      >
                        <Mail className="mr-1 h-3.5 w-3.5" />
                        {item.emailed_at ? 'Renvoyer' : 'Envoyer'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyEmail(item)}
                        disabled={mailingEmails.length === 0}
                        title="Copier destinataires (Cci) + objet + contenu, si le brouillon ne s'ouvre pas"
                      >
                        {copiedMailId === item.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Éditer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                    Aucune annonce pour l'instant.
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
