# Vague 1 — Inventaire legacy

Date : 2026-06-19. Méthode : parcours lecture seule et manifeste JSON rejouable.

## Résultat

- 4 714 fichiers indexés ;
- 147 fichiers core, 197 contrats, 95 apps, 148 engines, 69 datasets et 12 événements ;
- 1 278 artefacts de déploiement ;
- 2 062 éléments factories, traités séparément en P2 ;
- 11 documents P0 : points d’entrée, index actif, core et pipeline DA.

## Lecture

Le legacy n’est pas une archive homogène : les contrats directeurs P0/P1 doivent être lus avant
les assets, copies, zips et artefacts de déploiement. Les factories ne sont jamais absorbées par
le manifeste : elles passeront par Passport, owner, scope et backflow candidat.

## Suite automatique

La vague 2 rapproche les P0/P1 core, contrats, apps, engines et datasets du canon actif et de
GitHub. Chaque entrée recevra ensuite un statut de couverture dans le ledger.
