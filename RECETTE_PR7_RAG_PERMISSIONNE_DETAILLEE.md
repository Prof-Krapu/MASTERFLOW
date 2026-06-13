# RECETTE — PR-7 RAG permissionne detaillee

Statut : `ACCEPTANCE RECIPE / 2026-06-13`

## Objectif

Verifier que le RAG MasterFlow fournit des context packs cites et scopes, sans devenir une source
de verite autonome.

## Scenarios

### R1 — Query autorisee

Un membre du projet cherche une ressource rattachee au meme projet.

Attendu :

- resultat present ;
- citation avec titre, chemin/source, statut, scope, score, extrait court ;
- audit query emis.

### R2 — Query hors scope

Un non-membre cherche la meme ressource.

Attendu :

- aucun hit ou 403 ;
- pas de fuite par titre ;
- pas de fuite par snippet ;
- pas de fuite par score ;
- audit query emis sans exposer la ressource.

### R3 — Candidate non fiable

Une ressource `candidate` matche la query.

Attendu :

- elle peut etre signalee comme candidate si l'utilisateur a droit de la voir ;
- elle n'est pas servie comme source fiable ;
- la reponse ne l'utilise pas pour affirmer une verite canonique.

### R4 — Revocation

Une ressource validee est revoquee.

Attendu :

- plus aucun nouveau context pack ne la contient ;
- les context packs existants sont expires, invalides ou marques stale ;
- aucune metadata active ne fuite.

### R5 — Secret refuse

Une ingestion contient un pattern secret manifeste : token, cle privee, `.env`, credential.

Attendu :

- ingestion refusee ou resource marquee `blocked_secret`;
- aucun chunk cree ;
- audit ingestion/refusal emis.

### R6 — Source absente

Question sans source autorisee.

Attendu :

- refusal explicite ;
- pas de reponse brodee ;
- raison lisible : `no_authorized_source` ou equivalent.

### R7 — Context pack exploitable par UI/LLM

Un context pack contient :

```text
pack_id
query_hash
scope
citations[]
refusal_reason nullable
created_at
expires_at nullable
```

Chaque citation contient :

```text
resource_id
chunk_id
title
source_uri
status
trust_status
scope
score
excerpt
```

### R8 — Audit minimal

Chaque query produit un event sans stocker le texte sensible complet si ce n'est pas necessaire.

Attendu :

- `query_hash` ;
- user ;
- scope ;
- count ;
- refusal reason nullable ;
- timestamp.

## Anti-cas

La PR est refusee si :

- le RAG renvoie des sources hors scope ;
- le RAG affiche un titre interdit ;
- une ressource revoquee reste active ;
- une reponse n'a pas de citation ;
- une absence de source est transformee en speculation ;
- l'index est traite comme source canonique ;
- les diagnostics RAG sont visibles par des comptes non autorises.
