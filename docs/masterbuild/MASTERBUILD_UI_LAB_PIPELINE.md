# MASTERBUILD UI Lab Pipeline

Date : 2026-07-12
Statut : canon opératoire pour le travail UI partagé

## Diagnostic simple

MASTERBUILD ne remplace pas le prototype par une version pauvre. MASTERBUILD pilote le vrai atelier UI.

Le système attendu est :

```text
Lab MALEX ─┐
           ├── Proto unique /ui-reset ── Promotion contrôlée ── Runtime MasterFlow
Lab Vincent ┘
```

MALEX et Vincent travaillent dans deux labs séparés, mais leurs composants alimentent le même prototype
de référence. Le prototype unique sert à vérifier l’expérience assemblée avant tout raccord runtime.

## Surfaces locales

| Surface | URL | Rôle |
|---|---|---|
| Proto unique | `/ui-reset` | expérience assemblée, même vérité visuelle pour tout le monde |
| Lab MALEX | `/ui-lab` | UI, DA, navigation, rythme, microcopy et comportements |
| Lab Vincent | `/ui-lab/vincent` | contrats, contraintes backend, états runtime, permissions et composants testables |
| Runtime actif | `/` | app branchée au système, pas terrain de design sauvage |

## Règle d’or

Le Lab sert à modifier et tester.
Le Proto sert à voir l’expérience assemblée.
Le Runtime sert à brancher une tranche validée.

Un composant ne va jamais directement du Lab au Runtime sans passer par le Proto.

## Répartition

### MALEX

- owner produit, UI, DA, navigation, identité et canon ;
- travaille prioritairement dans `/ui-lab` et `/ui-reset` ;
- valide les comportements, animations, thèmes, profils et assets actifs ;
- décide si une expérimentation devient canon prototype.

### Vincent

- owner backend, contrats, permissions, sécurité et runtime ;
- travaille prioritairement dans `/ui-lab/vincent` ;
- vérifie ce que le runtime peut réellement fournir ;
- ne redessine pas la navigation canon sans revue MALEX.

## Logs de travail

Chaque vague doit écrire une trace courte :

- `docs/masterbuild/lab-logs/MALEX_UI_LOG.md`
- `docs/masterbuild/lab-logs/VINCENT_UI_LOG.md`

Format attendu :

```text
Date :
Surface :
Objectif :
Changement :
Impact proto :
Impact runtime :
Validation nécessaire :
Prochaine action :
```

Le log n’est pas un journal intime de dev. C’est un reçu de round : qui a touché quoi, pourquoi, et où
ça doit aller ensuite.

## Pipeline de promotion

1. **Lab** : composant isolé, état, thème, accessibilité et interaction.
2. **Proto** : composant assemblé dans `/ui-reset`, avec le vrai contexte visuel.
3. **Preflight** : MASTERBUILD vérifie règles design, permissions, états vides/verrouillés et risques.
4. **Runtime** : raccord en lecture ou action préflightée.
5. **Draft PR** : preuve GitHub, tests et validation humaine.
6. **Merge** : seulement après GO explicite.

## Interdits

- remplacer le vrai Lab par un placeholder ;
- faire des labs MALEX/Vincent identiques si leurs besoins divergent ;
- copier les assets `candidates/`, backups, PSD ou sources lourdes sans validation ;
- promouvoir un composant non cliquable comme s’il était testable ;
- brancher une action sensible sans preflight ;
- traiter le runtime comme terrain de design improvisé.

## Assets

Les assets actifs nécessaires au Lab et au Proto sont versionnés.

Les dossiers suivants restent hors promotion automatique :

- `candidates/` ;
- `backup-*` ;
- sources générées ;
- PSD/AI lourds ;
- planches de recherche non validées.

## Prochaine action après restauration

Vérifier humainement :

- `/ui-reset` : le vrai proto assemblé ;
- `/ui-lab` : workspace MALEX utilisable ;
- `/ui-lab/vincent` : workspace Vincent distinct et utile ;
- logo et wordmark corrects ;
- composants cliquables et isolables.

Si validation OK : marquer le Round Shell/Dock/Lab comme restauré, puis reprendre le pilotage par composants.
