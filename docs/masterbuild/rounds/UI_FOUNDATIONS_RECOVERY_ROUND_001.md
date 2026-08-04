# Round UI-FOUNDATIONS-RECOVERY-001

Statut : `active`
Propriétaire : MALEX
Base : `origin/main` au SHA `ab7f5ea74debde87797720e2bb7eb71d930ecb67`

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
| UFR-001 · Bible UI et MASTERBUILD | `codex/ui-bible-masterbuild-gate` | en construction locale | GO commit, push et PR après vérification |
| UFR-002 · Shell, thèmes, rail et Dock | `codex/ui-foundations-shell-theme-dock` | bloqué | revue et merge du Lot 1 |
| UFR-003 · Project V2 situation vivante | `codex/project-v2-situation-page` | bloqué | revue et merge du Lot 2 |

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

## Exclusions

Aucun déploiement, asset, migration, fournisseur, dépense, nouvelle API produit ou modification
Inventory. Les ports MasterFlow restent arrêtés hors contrôles locaux temporaires.
