# D09 R4.5 — Validation auteur privée d'un patch

## Contrat de déploiement

- Intention produit : permettre à l'auteur de valider un candidat pour une future préparation de delta canon.
- Partie du canon concernée : D09 MasterStory, séquence `candidate patch → author validation → canon delta`.
- Ce qui doit changer : une transition owner-only de `candidate` vers `validated_for_canon_delta`.
- Ce qui ne doit pas changer : source externe, canon, fichier narratif, export et publication restent intacts.
- Critère simple de succès : le owner valide une fois son candidat ; une seconde validation échoue explicitement.
- Risque de dérive : faible, car aucun delta n'est créé ou appliqué.
- Validation nécessaire : non pour l'état privé ; oui avant création/application d'un delta canon ou export.

## Trace Legacy → Canon → GitHub

- Source canon Drive : `03_DOMAINS/D09_MASTERSTORY_NARRATIVE/DOMAIN_CARD.md`.
- Preuve legacy/arbitrage : `D09_D10_APP_ARBITRATION_2026-06-20.md`, MasterStory classé `canon_ready`.
- Statut legacy : `canon_ready`, absorption bornée sous D09.
- Écart GitHub traité : les patches candidats existaient, mais aucune validation auteur explicite.
- Exclusions : mutation source, création/application de canon delta, export, publication et live.

## Décision

Le statut `validated_for_canon_delta` signifie seulement « relu et accepté par l'auteur comme entrée
d'une future étape ». Le `truth_state` reste `CANDIDATE` tant qu'aucun delta canon séparé n'existe.
