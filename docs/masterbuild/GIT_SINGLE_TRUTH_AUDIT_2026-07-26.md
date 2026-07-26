# MasterFlow Git Single Truth Audit — 2026-07-26

Statut : audit non destructif, non publie
Owner : MALEX
Objectif : choisir une base Git unique avant nettoyage / reclone / reprise UI-systeme.

## Decision provisoire

La branche candidate pour devenir la verite de travail unique est :

```txt
codex/masterbuild-v2 @ 3ca209e
```

Raison : elle contient le MASTERBUILD V2, le Lab partage, le review cockpit, le logo dynamique,
les premiers travaux Shell/Dock et le composant Persona Stage Actor publie en branche.

`main @ bf041f7` reste la verite stable publiee, mais elle est en retard sur le chantier UI.
`codex/ui-reset-prototype-lab @ 7f02b02` reste une preuve historique utile, mais elle est depassee
par `codex/masterbuild-v2`.

## Worktrees observes

| Dossier | Branche / etat | Role | Decision |
|---|---|---|---|
| `/Users/malex/Documents/Playground/MASTERFLOW` | `codex/ui-reset-prototype-lab` + modifs locales | ancien espace actif UI/proto | ne pas committer globalement ; comparer et recuperer seulement les deltas utiles |
| `/Users/malex/Documents/Playground/MASTERFLOW_MASTERBUILD_V2` | `codex/masterbuild-v2` + modifs locales stage actor | meilleure base candidate | consolider ici en premier |
| `/Users/malex/Documents/Playground/MASTERFLOW_DA002` | detached `c99cd0d` | ancien checkpoint DA002 | archive / lecture seule, pas base de reprise |

## Branches distantes importantes

| Branche | SHA | Etat |
|---|---|---|
| `origin/main` | `bf041f7` | stable apres PR #213, en retard UI |
| `origin/codex/ui-reset-prototype-lab` | `7f02b02` | ancien snapshot UI/Lab partage |
| `origin/codex/masterbuild-v2` | `3ca209e` | base la plus avancee publiee |
| `origin/claude/gitlab-audit-suivi-6PjDS` | `274f335` | patch `SUIVI.md` uniquement, a evaluer puis cherry-pick si utile |

## Ce qui est deja publie dans `codex/masterbuild-v2`

- MASTERBUILD V2 et cockpit.
- Lab partage MALEX / Vincent.
- Review cockpit.
- Pipeline Lab -> Proto -> Runtime.
- Docs de gouvernance UI / design / feature registry.
- Shell/Dock round et preflights.
- Persona Stage Actor composant initial.
- Prototype/Lab avec logo dynamique et profils.

## Ce qui reste local et doit etre trie

Dans `MASTERFLOW_MASTERBUILD_V2` :

- `apps/frontend/src/ui-reset/component-lab.css`
- `apps/frontend/src/ui-reset/persona-stage-actor.tsx`
- `docs/ui/PERSONA_STAGE_ACTOR_ASSET_PACK_V1.md`
- `apps/frontend/src/assets/masterflex-stage-actor/`
- `docs/ui/PERSONA_STAGE_GENERATION_BRIEF_V1.md`
- `docs/ui/archive/`

Decision recommandee : garder ces changements ensemble comme une vague
`MASTERFLEX_STAGE_ACTOR_PACK_001`.

Dans `MASTERFLOW` :

- nombreuses modifs locales sur MASTERBUILD, agents, proto et docs.
- beaucoup sont probablement des versions plus anciennes ou divergentes par rapport a
  `codex/masterbuild-v2`.

Decision recommandee : ne pas committer en bloc. Creer un inventaire `keep / already_absorbed /
archive / reject` avant toute reprise.

## Risques

- Committer depuis `MASTERFLOW` maintenant pourrait ecraser des fichiers presents dans
  `codex/masterbuild-v2`.
- Repartir de `main` ferait perdre le Lab/MASTERBUILD recents.
- Garder trois dossiers actifs entretient la confusion.
- Les assets candidats doivent etre classes avant d'etre rendus "actifs".

## Plan recommande

1. Stabiliser `MASTERFLOW_MASTERBUILD_V2` comme worktree de consolidation.
2. Committer/pousser d'abord la vague stage actor si MALEX valide.
3. Comparer les modifs locales de `MASTERFLOW` contre `origin/codex/masterbuild-v2`.
4. Recuperer seulement les deltas utiles par patch cible.
5. Archiver `MASTERFLOW_DA002` comme ancien checkpoint.
6. Renommer l'ancien `MASTERFLOW` en backup local date.
7. Recloner proprement `MASTERFLOW` depuis GitHub.
8. Switcher la branche de travail unique sur la branche consolidee.
9. Verifier `npm install`, `npm run build:frontend`, `npm run masterbuild:doctor`.
10. Ouvrir une PR de consolidation seulement apres validation MALEX.

## Gate avant action sensible

Avant commit/push :

- confirmer la vague exacte ;
- exclure `.DS_Store`, PSD, caches et `tmp/` ;
- garder les assets candidates si la vague porte bien sur les assets ;
- lancer `npm run build:frontend` ;
- produire un recap court des fichiers stages.

Avant suppression / reclone :

- faire un backup local par `mv`, jamais `rm` direct ;
- verifier que la branche consolidee est poussee ;
- verifier que le nouveau clone voit bien les fichiers attendus.
