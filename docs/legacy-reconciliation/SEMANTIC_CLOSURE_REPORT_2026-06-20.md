# Clôture sémantique Legacy → Canon → Git — 2026-06-20

## Verdict

L'audit legacy est clos au niveau sémantique : les 692 artefacts fonctionnels core, contrats,
apps, engines, datasets, personas et événements ont tous un owner et un statut.

Cela ne signifie pas que 692 fonctionnalités sont déployées. Cela signifie qu'aucune idée utile
n'est perdue, qu'aucun artefact n'est confondu avec le runtime, et que les prochaines tranches
logiciel peuvent être choisies sans revenir fouiller l'archive à l'aveugle.

## Comptage final

| Statut | Nombre | Signification |
|---|---:|---|
| `absorbed` | 108 | règle/objet déjà repris par le canon et une fondation Git identifiable |
| `canon_ready` | 294 | capacité préservée dans le canon, runtime non impliqué |
| `reduced` | 234 | doublon, modèle ou variation consolidée sous un owner existant |
| `restore_candidate` | 52 | capacité gardée pour une tranche produit explicite |
| `blocked` | 4 | donnée privée ou droits à vérifier avant toute utilisation |
| `pending_semantic_review` | 0 | aucun angle mort de classement |

## Ce qui est réellement déployé dans GitHub

- D01/D02/D03 : auth, permissions, projects/scopes, context compiler, loadout, memory cards,
  checkpoints et RAG lexical sont des fondations réelles mais partielles.
- D05/D06 : guided runtime, cohortes, rosters versionnés, snapshots de correction, identité et UI
  professeur existent ; barème/profil, lot, submissions, revue d'échantillon et feedback final restent à livrer.
- D07 : inventory, collections, validation, recherche et UI existent ; OCR/photo réel reste verrouillé.
- D11 : backflow JSON, quarantaine, validation et routage candidat sont livrés ; aucun import/install factory.
- D12 : jobs, audits, observabilité et Usage Harvester borné existent ; le live, backup/recovery et release receipt restent incomplets.

## Ce qui est canon mais non livré

- D08 : registre de références, manifest immuable, Action Ready, review et lifecycle asset.
- D09 : story intake privé, reader state, workbench auteur et patch candidat.
- D10 : Quote Builder privé, preview export, consentement/public intake plus tard.
- D04 enrichi : affectations persona manuelles, graphes et guidance fine.
- D02 enrichi : graphes relationnels, version ledger et memory timeline.

## Blocages légitimes

1. Quatre sources datasets restent bloquées : profil propriétaire, morphologie privée, roster étudiant, PDF de référence à droits/scope à vérifier.
2. La récupération live historique reste séparée : backup/checksum, SHA lancé, cause du 502 et smoke sont requis avant toute action hôte.
3. Toute activation de provider, OCR réel, génération, export externe, factory install ou migration de données exige son contrat et un GO spécifique.

## Règle de suite

Le backlog ne repart plus du legacy. Il part uniquement du plan runtime priorisé, avec contrat
de déploiement, test, preuve GitHub et receipt Drive par tranche.
