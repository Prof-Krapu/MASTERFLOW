# Contrat de publication — Lot 3 Shell/Dock et assets actifs

Date : 2026-08-01
Round : `GIT-CONSOLIDATION-001`
Work package : `GTC-L3-001`
Source : draft PR #214 au checkpoint `65e9c0e7b31c1b5e294cba00ba37915184c6e002`
Base : GitHub `main` au SHA `b0d0d9f1041f97d5462376872e8b1a621e966d4c`

## Intention produit

Isoler le Shell, la navigation et le Command Dock déjà construits sans promouvoir le Component
Lab, ses assets candidats ou ses archives, et sans créer de raccord UI/backend supplémentaire.

## Allowlist code

- `apps/frontend/src/current-ui-demo.tsx` — reconstruction bornée sans Home, Persona ou Skilltree ;
- `apps/frontend/src/ui-reset/shell-dock-active.css` — styles dédiés au seul Shell/Dock, sans URL
  d'asset candidat ;
- `apps/frontend/src/main.tsx` — route `/ui-reset` ;
- `apps/frontend/src/ui-reset/prototype-shell-components.tsx` — primitives Navigation, System Bar
  et Command Dock ;
- `apps/frontend/src/ui-reset/prototype-ui-state-registry.ts` — transitions locales du Dock.

Les composants Tunnel, Home, Persona, Skilltree et Component Lab ont été retirés de la dépendance
Shell/Dock. Les panneaux système n'affichent aucun compteur runtime simulé.

## Allowlist assets actifs

- `apps/frontend/src/assets/masterflex-canon-full.png` ;
- les six portraits `apps/frontend/src/assets/masterflex-portraits/{fear,disgust,sad,neutral,confident,joy}.png` ;
- `apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v4.png` ;
- les six portraits `apps/frontend/src/assets/profkrapu-portraits/{fear,disgust,sad,neutral,confident,joy}.png` ;
- `apps/frontend/src/assets/masterflow-mark-graff.svg` ;
- `apps/frontend/src/assets/masterflow-wordmark.svg`.

Statut : tous sont classés `actif` dans
`docs/masterbuild/PERSONA_ASSET_DECISION_SHEET_2026-07-26.md`.

## Exclusions prouvées

- aucun chemin `candidates/`, `archive`, `backup`, `rejected` ou `stage-actor` ;
- aucun fichier `component-lab*`, `persona-stage-actor`, `prototype-product-surfaces` ou
  `prototype-skilltree-surface` ;
- aucun backend, contrat partagé, endpoint, permission, provider, migration ou seed ;
- aucun import de `GET /context/current`, `/jobs` ou `/validation-inbox` ;
- aucune modification ou fermeture de la PR #214 ;
- aucun merge ou déploiement.

Les anciens `masterflex-ui-v2.png` et `profkrapu-ui-v2.png` restent présents mais ne sont plus
importés par la route reconstruite. Leur suppression nécessite un GO séparé.

## États et comportement

- la surface annonce explicitement qu'elle est un prototype sans runtime connecté ;
- les verticales hors lot restent verrouillées ;
- les compteurs système restent à zéro ;
- le profil visuel peut alterner entre les portraits actifs MasterFlex et ProfKrapu sans modifier
  de permission ;
- la saisie du Dock reste locale et n'exécute aucune action ;
- micro, transcription, historique, réglages et bibliothèque d'actions restent non exécutés.

## Vérifications avant publication

- TypeScript frontend ;
- build frontend ;
- recette navigateur desktop et mobile 390 px ;
- aucun log navigateur ni débordement horizontal ;
- audit de chemins et d'imports interdits ;
- JSON et tests MASTERBUILD ;
- `git diff --check` et état Git propre avant publication.

## Gate

La publication autorisée s'arrête à une draft PR. La revue MALEX/Vincent, le merge et tout
déploiement nécessitent une décision distincte.
