# chien.md — Rapport d'absorption API_manage → MasterFlow

**De :** Vincent (ProfKrapu) · **Pour :** MALEX · **Date :** 2026-08-25 · **Statut :** `open` — en attente de ta revue produit/UI/DA
**Branche :** `codex/api-manage-gateway` sur `github.com/Prof-Krapu/MASTERFLOW` (rien touché sur `main`, rien déployé)

---

## Ce qui a été fait

### Volet 1 — Snapshot complet de la gateway API_manage

- Commit orphelin `74ef7d3` « Snapshot API_manage — gateway corrector » : les **159 fichiers**
  du code source d'`API_manage` (branche `manage` de la forge EN), poussés tels quels.
- Contenu : gateway Express (auth multi-users, storage REST centralisé, reverse proxy des
  11 sous-apps), systèmes admin **inbox tickets feedback**, **news / annonces / newsletter**,
  chiffrement at-rest AES-256-GCM, panneaux admin complets.
- Audit secrets effectué avant push : aucune clé réelle (`.env`, `data/*.db` ignorés ;
  `.env.example` = placeholders uniquement).
- L'historique `corrector.git` (forge Éducation Nationale) n'a **pas** été importé.

### Volet 2 — Absorption dans le monorepo (commit `2202a82`)

Les trois systèmes demandés sont portés selon le pattern PR-1/2/3 éprouvé :

| Système API_manage | Portage MasterFlow |
|---|---|
| Inbox tickets (`feedback.ts` + `admin-feedback.ts`) | tables `feedback_tickets`, service/router gated, onglet « Inbox » dans `admin-console.tsx`, formulaire utilisateur `feedback-form.tsx` |
| Nouveautés / annonces (`news.ts` + `NewsTimeline.tsx`) | tables `news_posts` + `news_post_reads` (lu/non-lu par user), fil « Nouveautés » visible de tous (`news-feed.tsx`) |
| Flag newsletter | conservé tel quel : flag `emailed` informatif (aucun envoi email réel, comme à l'origine) |

Détails techniques :

- Contrats Zod dans `packages/shared/src/index.ts` ; tables SQLite additives idempotentes dans
  `apps/backend/src/db/schema.ts` ; services + routers avec chemins explicites (piège
  `router.use` sans path évité) ; montage dans `src/index.ts`.
- Gating adapté : iron-session → JWT Bearer. Création ticket / lecture annonces = tout user ;
  résolution, suppression, publication, édition, flag newsletter = ≥ admin.
- Frontend : fonctions client typées dans `api.ts` ; le fil et le formulaire s'affichent hors
  mode home ; la gestion est dans la console admin (pilotage).

## Vérifications

- `npm run lint` (backend + frontend tsc --noEmit) : ✅ 0 erreur.
- `npm test` : 717/718 pass. Le seul échec (`correction_context_service.test.ts` >
  « conserve la version historique après activation d'un nouveau roster », FK token_events)
  est **préexistant** : reproduit à l'identique sur `origin/main` propre (worktree isolé).
- `npm run build:frontend` : ✅.

## Décisions déjà prises (à contester si besoin)

1. Snapshot en commit orphelin plutôt qu'import d'historique (traçabilité forge préservée côté source).
2. Tickets feedback = module séparé de la `validation_inbox` existante : domaine différent
   (déclaration libre vs cycle d'action). Un rattachement futur comme `source_kind` reste possible.
3. Pas d'envoi email automatique pour la newsletter — le flag ne fait que marquer l'état,
   fidèle au comportement d'origine.

## Ce que je te demande (revue MALEX)

1. Valider ou corriger le périmètre absorbé (tickets + annonces + newsletter).
2. UI/DA : les surfaces réutilisent le style minimal PoC de `admin-console` — à restyler quand tu veux.
3. Décider si le fil « Nouveautés » doit aussi apparaître sur le mode home (aujourd'hui volontairement écarté).
4. Statut de la branche : prête pour une PR vers `main` après ton GO.

— généré lors de la session Vincent/opencode du 2026-08-25.
