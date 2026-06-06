# MasterFlow

**OS pédagogique à personas IA fusionnables** (« chimères »). Client : MALEX. Backend : Vincent.

Monorepo **backend-first**. Le backend est l'autorité d'action ; le LLM propose, ne décide jamais.
Stack : TypeScript/Node + Express + better-sqlite3 + Zod (backend) ; React 19 + Vite (frontend MALEX).

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
