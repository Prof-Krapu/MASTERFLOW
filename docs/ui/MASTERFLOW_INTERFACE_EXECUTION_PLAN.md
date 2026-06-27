# MasterFlow — plan actif interface web / desktop / mobile

Statut : actif  
Owner : MALEX  
Source produit : `FRONTEND_UI_DOCTRINE.md` + canon Drive  
Source runtime : `apps/frontend`

## Décision d'architecture

Une seule interface produit est construite :

```txt
apps/frontend (React/Vite responsive)
  -> web
  -> PWA installable mobile/tablette
  -> shell Tauri desktop
```

Il ne faut pas créer trois frontends ni recopier les écrans. Le backend, les contrats
`packages/shared`, les permissions et le loadout restent communs.

## Diagnostic vérifié le 2026-06-27

- backend local : `http://localhost:8000`;
- frontend local : `http://localhost:5174`;
- login MALEX et chargement du contexte : fonctionnels ;
- Home, Teaching et Inventory sont déjà pilotés par le loadout ;
- Owner Cockpit, Admin, D08, D09, D10, D12 et Jobs existent déjà ;
- le principal défaut est l'assemblage : les surfaces admin et métier sont empilées sous la Home ;
- `App.tsx` concentre encore 1 628 lignes et `styles.css` 2 618 lignes ;
- aucun `apps/desktop` n'existe encore ;
- le canon impose `situation -> mode -> room -> objet -> détail`, pas un catalogue de fonctions.

## Architecture cible

### 1. App Shell

- bandeau de situation ;
- navigation contextuelle par modes autorisés ;
- zone principale unique ;
- chat compact et disponible sans dominer l'écran ;
- notifications/validations ;
- debug uniquement en godmode.

### 2. Workspaces

| Workspace | Surfaces existantes à réutiliser |
|---|---|
| Home | situation, prochaines actions, objets récents |
| Teaching | readiness, sujets, cohortes, corrections |
| Inventory | catalogue, candidats, collections, besoins |
| Story | workbench D09 |
| DA | références et manifests D08 |
| Project/Learning | fondations à mapper avant exposition |
| Control | Owner Cockpit, Validation Inbox, Jobs |
| Admin | utilisateurs, invitations, routage LLM, coûts |
| Ops | release, backup, incidents |

Une surface n'apparaît que si le rôle, le contexte, la maturité et le loadout l'autorisent.

### 3. Navigation par zoom

```txt
Situation
-> Mode
-> Room
-> Objet
-> Détail
```

L'URL peut refléter ce chemin pour le web et le desktop, mais elle ne contourne jamais les
permissions. Le retour arrière doit restaurer le contexte, pas seulement changer de page.

## Queue d'exécution

### UI-001 — Inventaire des sources visuelles

Statut : ready  
Risque : faible  
Action : indexer les écrans, maquettes, références web et composants existants sans les dupliquer.
Chaque source reçoit `reuse`, `adapt`, `archive` ou `reject`.

### UI-002 — Extraire l'App Shell

Statut : queued  
Dépend de : UI-001  
Action : scinder `App.tsx` en shell, navigation, contexte et zone workspace sans changer les
comportements backend.

### UI-003 — Séparer Control / Admin / Ops

Statut : queued  
Dépend de : UI-002  
Action : retirer le long empilement de panneaux et créer trois espaces contextuels distincts.

### UI-004 — Consolider les workspaces métier

Statut : queued  
Dépend de : UI-002  
Action : stabiliser Home, Teaching, Inventory, DA et Story avec le même langage d'interface.

### UI-005 — Responsive et PWA

Statut : queued  
Dépend de : UI-003, UI-004  
Action : rendre le frontend installable, vérifier 390 px / tablette / desktop, offline shell
minimal sans données sensibles en cache.

### UI-006 — Shell Tauri desktop

Statut : queued  
Dépend de : UI-005  
Action : créer `apps/desktop` comme emballage du frontend partagé avec transport runtime-aware.
Aucune logique métier ne doit être recopiée en Rust.

## Contrat de chaque vague

- canon et sources UI relus avant design ;
- aucun endpoint inventé dans le frontend ;
- aucun mode hors loadout exposé ;
- comportement existant préservé avant amélioration visuelle ;
- desktop et mobile testés ;
- console sans erreur ;
- TypeScript et build verts ;
- capture avant/après et reçu de smoke ;
- commit, PR et merge uniquement par tranche complète.

## Critère de réussite global

MALEX ouvre MasterFlow et comprend immédiatement :

1. où il est ;
2. ce qui demande son attention ;
3. quel mode ou objet reprendre ;
4. quelles actions sont réellement disponibles ;
5. ce qui est verrouillé et pourquoi.

Le même produit doit ensuite fonctionner sur navigateur, comme PWA et dans le shell desktop,
sans divergence fonctionnelle.
