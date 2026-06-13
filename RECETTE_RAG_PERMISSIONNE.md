# RECETTE — RAG permissionne + Resource Truth

Statut : `ACCEPTANCE DESIGN / 2026-06-13`

## Objectif

Verifier que le RAG aide MasterFlow a retrouver des sources sans devenir une autorite.

## Regles

- permission avant retrieval ;
- Resource Truth avant affichage fiable ;
- citation obligatoire ;
- index derive, jamais source de verite ;
- suppression/revocation prise en compte ;
- aucun secret indexe.

## Scenarios

### R1 — Recherche autorisee

User membre du projet cherche une ressource du projet.
Attendu : resultats cites, scopes respectes.

### R2 — Recherche hors scope

User non membre cherche la meme ressource.
Attendu : aucun resultat ou 403, pas de fuite par titre/snippet.

### R3 — Candidate non validee

Ressource `candidate`.
Attendu : non servie comme source fiable.

### R4 — Revocation

Ressource retiree du scope.
Attendu : plus aucun hit apres reindex/revoke.

### R5 — Hallucination refusal

Question sans source.
Attendu : "source absente" plutot qu'une reponse inventee.

### R6 — Citation

Chaque contexte pack contient chemin, titre, statut, scope, score, extrait court.

## Tests minimum

- filtre scope ;
- filtre status ;
- citation ;
- no secret ;
- revoke ;
- no answer without source ;
- audit query.

