# MasterFlow

**OS pédagogique à personas IA fusionnables** (« chimères »). Client : MALEX. Backend : Vincent.

Monorepo **backend-first**. Le backend est l'autorité d'action ; le LLM propose, ne décide jamais.
Stack : TypeScript/Node + Express + better-sqlite3 + Zod (backend) ; React 19 + Vite (frontend MALEX).

## Source de vérité opérable

La preview active sur le serveur privé est la vérité de ce qui fonctionne réellement. Le clone local
est l'atelier de construction et de préparation des snapshots. GitHub est un miroir historique en
pause depuis le 2026-08-31 et ne fait plus partie du cycle courant.

Contrat : [`docs/source-truth/SERVER_OPERABLE_SOURCE_OF_TRUTH_2026-08-31.md`](docs/source-truth/SERVER_OPERABLE_SOURCE_OF_TRUTH_2026-08-31.md).

Preflight read-only :

```bash
cp .masterflow-server.example.json .masterflow-server.local.json
# Renseigner localement la cible SSH, la racine runtime et le binaire Docker distant.
npm run server:preflight
```

Le fichier `.masterflow-server.local.json` est privé et ignoré par Git.

## Répartition

- `apps/backend` — **livrable principal** : API REST + WebSocket, schéma, auth JWT, action router + validation inbox, persona engine + blend, registre de ressources anti-hallucination, audit.
- `packages/shared` — **contrat** typé (Zod) consommé par le frontend MALEX.
- `apps/frontend` — **frontend MALEX** : construit et porté par MALEX (le PoC initial a été retiré ; le frontend revient en priorité à MALEX).

## Invariants non négociables (cf. specs MALEXSIMPLE)

1. Aucune action sensible sans **validation humaine explicite** (une proposition IA ≠ validation).
2. **Anti-hallucination** : ressources issues du registre `resources` (`status = validated`) uniquement.
3. **1 persona visible max** par réponse (la chimère est visuelle ; sémantiquement, 1 porte-parole).
4. `PERMISSION > CONTEXT_LOCK > SAFETY > OBJECT_TYPE > MATURITY > PREFERENCE`.

## Démarrage

```bash
npm install
cp apps/backend/.env.example apps/backend/.env   # ajuster JWT_SECRET / provider LLM
npm run dev                                       # backend sur http://localhost:8000
curl http://localhost:8000/health                 # { ok: true, ... }
```

API : `http://localhost:8000/api/v1` · WebSocket : `ws://localhost:8000/ws/{room_instance_id}`.

## MASTERBUILD

MASTERBUILD est le cockpit local qui pilote la construction de MasterFlow sans exécuter
silencieusement commit, push, merge, migration ou déploiement.

Toute IA commence par [`MASTERBUILD.md`](MASTERBUILD.md), contrat universel indépendant de l'outil.

```bash
npm run masterbuild:boot
npm run masterbuild:doctor
npm run masterbuild:resume
npm run masterbuild:export
npm run dev:masterbuild
```

Cockpit : `http://127.0.0.1:5175` · service local : `http://127.0.0.1:8010`.

L'objectif et l'étape sont partagés dans `docs/masterbuild/MASTERBUILD_STATE.json`. Les préférences
de chaque poste restent dans `.masterbuild/local/`, ignoré par Git.

Design Preflight ciblé :

```bash
npm run masterbuild:preflight -- navigation all malex
```
