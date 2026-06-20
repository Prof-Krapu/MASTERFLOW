# Carte de progression — Réconciliation Legacy → Canon → Git

Mise à jour : `2026-06-20`

## Où on en est vraiment

Le legacy n'est plus traité comme un bloc opaque. Les capacités structurantes
ont été inventoriées, confrontées au canon propre, puis remises dans des contrats
opérationnels reliés aux domaines. Rien de cette passe ne prétend que le runtime
live est déjà complet.

| Bloc | Canon Drive | Git runtime | Étape suivante |
|---|---|---|---|
| Sources, versions, identités, contextes | Living Truth Spine raccordé | fondations contextuelles présentes | livrer les objets additifs par verticale |
| Correction / roster | contrat complet | contexte, identité, UI et roster manuel sur `main` | barème/profil puis lot contextualisé |
| Contrats D05-D07 | 12 contrats arbitrés | runtime variable, aucun faux statut `absorbed` | publier la preuve puis traiter D08 |
| Contrats D08 | 48 contrats arbitrés | lifecycle D08 encore absent | registre read-only puis manifest sans provider |
| Contrats D09-D10 | 20 contrats arbitrés | runtimes dédiés absents | D09 privé puis Quote Builder privé |
| Contrats D11-D12 | 12 contrats arbitrés | backflow borné, live inconnu | engines puis preuves continuité |
| Engines legacy | 148 engines consolidés sous 12 owners | parité runtime variable | datasets puis gaps par owner |
| Datasets legacy | 69 artefacts arbitrés | 4 sources privées/droits bloquées | personas/events sans activation |
| Personas / événements | 24 + 12 arbitrés | aucune activation/effet sensible | déploiements et audits historiques |
| Déploiements / audits | 1 691 fichiers lus, 110 groupes exacts | aucune preuve live | factories par Passport |
| DA / assets | resolver + registre cadrés | manifest/provider lifecycle absent | persister manifest/références, provider verrouillé |
| Mémoire / timeline / versioning | contrat rétabli | cards/checkpoints présents, ledger absent | timeline/change ledger additif |
| Continuité runtime | incident/recovery contract rétabli | observabilité partielle, live non prouvé | receipts + récupération conservatrice |
| Factories | D11 V1 borné | candidate-only livré | ne pas activer/importer sans nouveau contrat |

## Ce qui bloque vraiment

1. Les migrations vers une base réelle : elles demandent une sauvegarde, un
   rollback et un GO opérationnel au moment d'exécution.
2. Le live historique : le smoke connu a renvoyé `502`; la demande Vincent est
   une récupération conservatrice, pas un redéploiement.

## Preuve GitHub

La passe Living Truth / contrats opérationnels est mergée par la PR `#57` sur
`main` au SHA `5278bedd02e0c0ef48291108e62ea51fde3677dc`.

## Ce qui n'est pas bloqué

- contrats canon, audits, matrices, queue, tests locaux et documentation Git ;
- préparation détaillée des tranches backend ;
- lecture de l'archive et détection des prochaines capacités à raccorder.

## Prochain ordre logique

1. Publier la déduplication historique puis enchaîner les factories par Passport.
2. Revenir au runtime seulement après la passe factories et un nouveau plan de gaps.
3. Ajouter timeline/change ledger et receipts de continuité.
4. Seulement ensuite, traiter les autres apps legacy et les factories.
