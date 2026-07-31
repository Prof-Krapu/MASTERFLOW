# GTC-L2-001 — Revue d'impact Gouvernance GitHub

Date : 2026-08-01

Source : draft PR #214 au commit `65e9c0e`

Base de reconstruction : `origin/main` au commit `3620762`

## Décision recommandée

Publier les sept fichiers de gouvernance dans une draft PR séparée. Le lot ne change ni le produit,
ni les permissions applicatives, ni le déploiement.

## Ownership proposé

| Zone | Reviewer proposé | Impact |
|---|---|---|
| `apps/frontend` et `docs/ui` | MALEX | MALEX garde l'ownership UI/DA |
| `apps/backend` | Vincent | Vincent garde l'ownership backend/runtime |
| `packages/shared` | MALEX + Vincent | revue croisée des contrats consommés des deux côtés |
| `apps/masterbuild`, `docs/masterbuild`, `.agents` | MALEX + Vincent | pilotage partagé |
| `.github` | MALEX + Vincent | revue croisée des futures règles de contribution |

GitHub confirme que `malexcoulot-dev` possède le rôle `write` et `Prof-Krapu` le rôle `admin` sur
le dépôt. Les deux handles sont donc éligibles comme owners.

Au 2026-08-01, GitHub ne retourne ni protection de branche `main` ni ruleset actif. `CODEOWNERS`
propose donc des reviewers mais n'impose pas encore leur approbation. Activer une protection de
branche serait une décision distincte, non comprise dans ce lot.

## Formulaires et charge opérationnelle

- bug : reproduction minimale, attendu/obtenu et preuve ; label existant `bug` ;
- contrainte backend : preuve technique et effet produit ; label existant `question` ;
- observation terrain : faits séparés de la solution et du canon ; label existant `documentation` ;
- proposition produit : problème, invariants et décision attendue ; label existant `enhancement` ;
- issues libres désactivées : les demandes passent par une catégorie structurée ou le lien vers
  l'état MASTERBUILD ;
- template PR : revue MALEX/Vincent et preuves, avec contrôles explicitement limités aux domaines
  concernés.

Les labels spécialisés `backend`, `constraint`, `observation`, `product` et `proposal` n'existent
pas dans le dépôt. Le Lot 2 ne les crée pas : il réutilise les labels GitHub existants pour éviter
une gouvernance partiellement inopérante.

## Risques et gates

- sans protection de branche, les owners restent consultatifs ;
- avec une protection future, les chemins partagés pourraient exiger deux revues ;
- les templates structurent les demandes mais ne valent ni validation produit ni GO technique ;
- aucune règle ne merge, ne déploie ou ne modifie automatiquement le canon ;
- nouveau GO requis avant merge de ce lot ou changement des protections GitHub.

## Publication

Le Lot 2 est publié en draft PR #217 depuis `codex/github-governance`. Aucun merge, ruleset,
protection de branche, label ou déploiement n'a été créé.

La PR #217 a ensuite été mergée dans `main` au SHA
`cd9f26ba62f464c4acfb30f061a5ee39bece2796`. Aucun ruleset, protection, label ou déploiement n'a
été créé pendant le merge.
