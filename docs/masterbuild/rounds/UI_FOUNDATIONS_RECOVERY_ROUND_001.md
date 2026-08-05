# Round UI-FOUNDATIONS-RECOVERY-001

Statut : `active`
Propriétaire : MALEX
Base Lot 3 : `origin/main` au SHA `f3ceb81b16d8af851c41e2d92b2182188ea051a2`

## Intention produit

Retrouver une interface MasterFlow fidèle à ses principes validés, sans perdre le métier déjà
publié. La Bible UI devient le gate commun avant toute nouvelle composition.

## Suspension Inventory

`UI-PAGE-AUDIT-001 / UPA-005` est suspendu. Les quatre modifications locales Inventory restent
dans `/Users/malex/Documents/Playground/MASTERFLOW` et ne sont pas présentes dans le worktree de ce
Round. Aucun fichier Inventory ne doit être déplacé, supprimé ou absorbé.

## Lots séquentiels

| Lot | Branche | Statut | Gate suivant |
|---|---|---|---|
| UFR-001 · Bible UI et MASTERBUILD | `codex/ui-bible-masterbuild-gate` | mergé via #231 · `761bb4c` | terminé |
| UFR-002 · Shell, thèmes, rail et Dock | `codex/ui-foundations-shell-theme-dock` | mergé via #232 · `f3ceb81` | terminé |
| UFR-003 · Project V2 situation vivante | `codex/project-v2-situation-page` | candidat local Lab + prototype | vérification puis validation MALEX |

## Contrat de publication du Lot 1

- Intention produit : rendre les principes UI opposables et vérifiables.
- Partie du canon : Bible UI, règles design, conformité et pilotage MASTERBUILD.
- Doit changer : documentation, registres, service local, cockpit et tests MASTERBUILD.
- Ne doit pas changer : frontend produit, backend produit, permissions runtime, API produit,
  Inventory, assets, fournisseur, base de données et déploiement.
- Succès : le doctor valide la structure ; le gate échoue volontairement pour Project tant que les
  preuves manquent ; le cockpit expose les statuts et les retours candidats.
- Risque : déclarer conforme l'existant par héritage.
- Validation : GO distinct avant commit, push et PR ; autre GO avant merge.

## Project V2 verrouillé pour le Lot 3

Project sera un hub de situation réelle : contexte, `Maintenant`, reprise réelle si elle existe,
ressources validées, équipe et trois actions contextuelles. Aucune tâche, échéance, milestone ou
progression n'est affichée sans source runtime.

Pipeline : `Lab → Prototype assemblé → MALEX → smoke permissions Vincent → runtime`.

## Preuves locales Lot 2

- tokens sémantiques communs chargés sans modifier les quatre fichiers Inventory isolés ;
- clair et sombre dans le Lab, préférence système conservée dans le runtime et persistée localement ;
- trois actions contextuelles dans le rail, aucune suggestion dupliquée dans le Dock ;
- état sain `connected` silencieux, dégradation en langage humain et `aria-live` ;
- micro, transcription et raccourci `M` désactivés dans le runtime tant qu'ils ne sont pas raccordés ;
- Lab étendu : fondations, Dock, formulaires, états, overlays, Home, navigation et identité ;
- smoke navigateur à `390 × 844` : aucune largeur excédentaire, feuille et Dock confinés ;
- lint frontend, build frontend, tests MASTERBUILD et doctor verts.

Le smoke runtime isolé confirme ensuite le prototype assemblé, la préférence système, le loadout
GodMode, `K`, l'absence de faux micro via `M` et le reflow à 390 px. MALEX valide la promotion par
son GO du 2026-08-05. Sa décision rend la revue Vincent non bloquante pour ce Lot 2 ; elle n'est pas
enregistrée comme une fausse approbation.

## Clôture Lot 2 et ouverture Lot 3 — 2026-08-05

- GitHub : PR #232 mergée dans `main` au SHA `f3ceb81b16d8af851c41e2d92b2182188ea051a2` ;
- contrôles GitHub : branche fusionnable, base `761bb4c` inchangée, zéro check configuré et aucun
  contrôle rouge ;
- publication : trois commits, seize fichiers, aucun déploiement ;
- Lot 3 : worktree propre `codex/project-v2-situation-page` créé depuis ce SHA ;
- Inventory : les quatre modifications locales restent intactes dans la copie principale.

## Project V2 candidat local

- composant unique `project-workspace-v2` partagé entre Component Lab et prototype assemblé ;
- situation `Maintenant`, action principale déterministe, reprise uniquement pour un checkpoint du
  même projet, ressources validées et synthèse d'équipe sans identifiant technique ;
- six scénarios Lab : GodMode vide, professeur prêt, étudiant affecté, étudiant interdit, projet
  archivé et mobile 390 px ;
- smoke runtime isolé : création réelle d'un projet, sélection immédiate, ajout d'une ressource
  validée, statut `À jour` et action `Ouvrir la dernière source` ;
- thèmes clair/sombre, focus 3 px et confinement Lab `clientWidth = scrollWidth = 390` ;
- aucune tâche, échéance, milestone, progression ou permission inventée ;
- Design Preflight : `docs/masterbuild/contracts/PROJECT_V2_DESIGN_PREFLIGHT_001.md`.

La promotion reste bloquée jusqu'à validation visuelle MALEX, smoke permissions Vincent et GO de
publication distinct. Le présent GO n'autorise ni commit, ni push, ni PR, ni merge.

## Exclusions

Aucun déploiement, asset, migration, fournisseur, dépense, nouvelle API produit ou modification
Inventory. Les ports MasterFlow restent arrêtés hors contrôles locaux temporaires.
