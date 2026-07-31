# Contrat de publication — Lot 1 MASTERBUILD Core

Date : 2026-07-31

Branche : `codex/masterbuild-core`
Base : `origin/main` au commit `bf041f725003e015fa8f9dc1b44078d41f8b7222`

## Contrat

- Intention produit : rendre MASTERBUILD visible et pilotable dans Git par MALEX et Vincent.
- Partie du canon concernée : gouvernance de construction, vérité opérationnelle, Rounds,
  registres, handoffs et cockpit MASTERBUILD.
- Ce qui doit changer : ajouter le workspace `apps/masterbuild`, son contrat universel, ses
  registres, ses adaptateurs et sa documentation de pilotage.
- Ce qui ne doit pas changer : backend produit, frontend produit, assets personas, permissions,
  runtime, providers, migrations, déploiement et PR #214.
- Critère simple de succès : la branche issue de `origin/main` passe les contrôles JSON, tests,
  TypeScript, build et diff-check, puis une draft PR distincte est accessible à MALEX et Vincent.
- Risque de dérive : réintroduire silencieusement une partie du prototype ou des assets de #214.
- Validation nécessaire : GO MALEX obtenu pour branche, reconstruction, tests, commit, push et
  draft PR ; nouveau GO requis avant merge ou déploiement.

## Allowlist

- `apps/masterbuild/` ;
- `docs/masterbuild/` ;
- `MASTERBUILD.md` et documentation d'entrée directement liée ;
- adaptateurs MASTERBUILD sous `.agents/`, `.codex/`, `.opencode/` et Copilot ;
- scripts npm, workspace et verrou de dépendances strictement nécessaires ;
- marquage explicite des anciennes queues et inbox comme sources historiques.

## Exclusions vérifiables

- aucun chemin sous `apps/frontend/` ;
- aucun chemin sous `apps/backend/` ou `packages/shared/` ;
- aucun asset image, audio ou vidéo ;
- aucun template GitHub de gouvernance du Lot 2 ;
- aucune connexion UI/backend ;
- aucune modification, fermeture ou fusion de la PR #214.

## Gate avant push

- JSON MASTERBUILD valide ;
- tests MASTERBUILD verts ;
- lint TypeScript MASTERBUILD vert ;
- build Vite MASTERBUILD vert ;
- `git diff --check` vert ;
- revue du diff et preuve d'absence de frontend/backend/assets.
