# D09 R4.6 — Contrôle auteur dans le workbench

## Contrat de déploiement

- Intention produit : rendre la validation privée R4.5 accessible à l'auteur.
- Partie du canon concernée : D09 MasterStory, validation auteur avant tout delta canon.
- Ce qui doit changer : afficher l'action sur les seuls patches au statut `candidate` et recharger leur état.
- Ce qui ne doit pas changer : source, canon, export et publication restent intacts.
- Critère simple de succès : après validation, l'action disparaît et l'interface rappelle la frontière privée.
- Risque de dérive : faible ; l'API appelée ne produit aucun delta.
- Validation nécessaire : non pour l'interface privée ; oui avant delta canon, export ou publication.

## Trace Legacy → Canon → GitHub

- Source canon Drive : `03_DOMAINS/D09_MASTERSTORY_NARRATIVE/DOMAIN_CARD.md`.
- Preuve legacy/arbitrage : MasterStory `canon_ready`, validation auteur obligatoire.
- Statut legacy : `canon_ready`, absorption bornée sous D09.
- Écart GitHub traité : la transition R4.5 existait sans geste dans le workbench.
- Exclusions : mutation source, canon delta, export, publication, provider et live.
