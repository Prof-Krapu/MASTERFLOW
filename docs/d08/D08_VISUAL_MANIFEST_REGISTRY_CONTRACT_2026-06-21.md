# D08 R3.1 — Registre de références et manifests visuels privés

## Intention produit

Rendre le cadrage visuel traçable et revu avant tout provider : références typées, manifest privé,
rapport Action Ready et blocage d’exécution explicite.

## Sources canon

- `D08_DA_VISUAL_ASSETS/DOMAIN_CARD.md` ;
- `D08_VISUAL_MANIFEST_RUNTIME_CONTRACT.md` ;
- `D08_MANIFEST_READ_MODEL_SPEC_2026-06-18.md`.

## Ce qui est livré dans cette tranche

- registre privé et permissionné de références visuelles ;
- statuts de référence canon D08 et provenance déclarée, validée ou faible ;
- manifest privé lié à ses références, DA root, layers, filtres et famille de sortie ;
- rapport read-only qui explicite les éléments manquants et les blocages techniques ;
- états privés `draft` à `generation_blocked_tech_pending`.

## Ce qui reste intentionnellement fermé

- appel ComfyUI, OpenRouter ou tout provider ;
- génération, stockage de fichier ou asset candidat ;
- export/publication/canonisation ;
- Validation Inbox D08 et rapport post-génération.

## Critère de succès

Un professeur crée une référence puis un manifest complet. Il peut constater que le manifest est
produit-ready mais que la génération reste bloquée par storage, lifecycle et review absents.

## Risque et décision

Risque faible : données privées et metadata seulement. Aucune capacité d’exécution n’est ajoutée.
