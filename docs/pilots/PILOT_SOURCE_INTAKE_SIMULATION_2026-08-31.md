# Simulation Source/Intake des pilotes — 2026-08-31

Statut : preuve locale candidate. Aucun fichier source n'a été copié, déplacé, modifié ou importé
dans une base runtime.

## Talents Créatifs

Source autoritaire inspectée en lecture seule :
`GoogleDrive/Mon Drive/TALENTS_CREATIFS`.

| Contrôle | Résultat |
|---|---:|
| Fichiers attendus | 30 |
| Fichiers découverts et hashés | 30 |
| Doublons binaires | 0 |
| Sources `team` conservatrices | 19 |
| Sources `teacher` conservatrices | 8 |
| Sources `student` candidates | 3 |
| SHA-256 du manifeste simulé | `3976802083db0bd0d94a80739a8122fa6fead3bf9cc9f9381ff66377c9359b0e` |

Règle de classement candidate : dépôts et valorisation sont `student`; briefs, sujets,
Hyperplanning et formulaires sont `teacher`; démarrage, équipe, comptes rendus, mises à jour, vrac,
archives et rapports restent `team`. Ce classement est volontairement restrictif et doit être revu
avant tout enregistrement réel.

## Ours d'Or

Sources candidates inspectées en lecture seule : les dossiers `CURRENT` de
`OURS_DOR_FACTORY` et `OURS_DOR_BADGE_FACTORY` dans le backup autoritaire.

| Corpus | Fichiers actifs hors ZIP/.DS_Store | Doublons binaires | SHA-256 manifeste |
|---|---:|---:|---|
| Factory Ours d'Or V2.3 | 17 | 0 | `45c08b1079ebbb6fa550f57baca8b2e5f5c8316852b3eda63196e7f7790198e0` |
| Badge Factory V1.2 | 18 | 1 groupe | `080fc3603bb3a7432a3e4ee8dc34adfaf9e482ff8d90f7c25b0ac99e9252501d` |

Les 35 fichiers restent `team/restricted`. Aucun corpus Factory brut ne doit entrer dans le
contexte étudiant. Seules des primitives ou sources dérivées explicitement revues pourront devenir
`teacher`, `shared` ou `student`.

## Preuve reproductible

Commande générique :

```bash
npm run pilot:intake:simulate -- --pilot talents-creatifs --path <source> --expected 30
```

Le simulateur produit un manifeste avec chemin relatif, SHA-256, taille, rôle candidat, droits,
namespace et groupes de doublons. Il n'écrit ni dans la source ni dans SQLite.

## Gate

- simulation : verte ;
- original immuable : préservé ;
- séparation des namespaces : couverte par tests ;
- enregistrement réel : non exécuté ;
- revue humaine des droits : requise avant import ou exposition.
