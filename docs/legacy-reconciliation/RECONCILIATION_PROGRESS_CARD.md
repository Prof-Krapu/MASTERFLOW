# Carte de progression — Réconciliation Legacy → Canon → Git

Mise à jour : `2026-06-21`

## Où on en est vraiment

Le legacy n'est plus traité comme un bloc opaque. Les capacités structurantes
ont été inventoriées, confrontées au canon propre, puis remises dans des contrats
opérationnels reliés aux domaines. Rien de cette passe ne prétend que le runtime
live est déjà complet.

| Bloc | Canon Drive | Git runtime | Étape suivante |
|---|---|---|---|
| Sources, versions, identités, contextes | Living Truth Spine raccordé | fondations contextuelles présentes | livrer les objets additifs par verticale |
| Correction / roster | contrat complet | contexte, identité, UI, roster, barème/profil, lot, intake et manifest professeur sur `main` | garder R1.5 fermée tant qu'aucun gate provider/runtime n'est validé |
| Contrats D05-D07 | 12 contrats arbitrés | publication GitHub close, aucun faux statut `absorbed` | poursuivre R1/R2 sans réouvrir OCR/photo réelle |
| Contrats D08 | 48 contrats arbitrés | registre, panneau owner, classement et revue Inbox sur `main` | conserver provider, storage et export verrouillés |
| Contrats D09-D10 | 20 contrats arbitrés | rails privés sur `main`, aucune sortie publique/commerciale | garder delta canon, export, facture et public gated |
| Contrats D11-D12 | 12 contrats arbitrés | backflow borné et preuves privées sur `main`, live inconnu | continuer les preuves de continuité sans action hôte |
| Engines legacy | 148 engines consolidés sous 12 owners | publication documentaire close | ouvrir seulement des verticales runtime explicites |
| Datasets legacy | 69 artefacts arbitrés | 4 sources privées/droits bloquées | ne rien absorber de bloqué sans validation explicite |
| Personas / événements | 24 + 12 arbitrés | aucune activation/effet sensible | garder toute activation derrière un contrat runtime dédié |
| Déploiements / audits | 1 691 fichiers lus, 110 groupes exacts | index publié, aucune preuve live | traiter la continuité par receipts/preflight, jamais par supposition |
| Factories | 2 062 fichiers, 13 groupes candidats | audit Passport publié, zéro activation | ne pas activer/importer sans nouveau contrat |
| Clôture sémantique | 692/692 artefacts classés | runtime et live non confondus | R1 correction complète |
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

La chaîne legacy de publication est désormais mergée sur GitHub : PR `#77` à
`#86` pour les arbitrages et la clôture, puis réconciliée sur `main` jusqu'au
SHA `2c547e12df736947c4a3d8ac89e5f7d9903799c4`.

## Ce qui n'est pas bloqué

- contrats canon, audits, matrices, queue, tests locaux et documentation Git ;
- préparation détaillée des tranches backend ;
- lecture de l'archive et détection des prochaines capacités à raccorder.

## Prochain ordre logique

1. Poursuivre R1 sans ouvrir R1.5 tant que le gate provider/consentement/runtime n'est pas validé.
2. Consolider les preuves privées D12 et la continuité sans action hôte ni live implicite.
3. Ouvrir une nouvelle verticale seulement si la source canon et le gate legacy sont cités explicitement.
