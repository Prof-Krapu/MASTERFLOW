# Sync thread — MALEX / Vincent / Codex

Objectif : garder les échanges de coordination dans Git, avec des messages courts, datés, actionnables et relus par les deux côtés.

Règles :

- une entrée = une demande ou une décision ;
- les décisions structurantes restent explicites ;
- une réponse IA n'est pas une validation humaine ;
- les demandes backend doivent préciser le périmètre exact du run ou de la modification ;
- les factories / bots extraits sont hors scope de cette version.

---

## 2026-06-06 — Demande feu vert backend

Vincent,

Feu vert demandé pour allumer le backend.

On a poussé la première couche frontend sur `codex/frontend-masterflow` :

- `apps/frontend` créé ;
- shell login minimal ;
- appel typé `GET /context/current` ;
- aucun backend modifié ;
- tests/lint/build OK.

Objectif du run : tester uniquement l'intégration réelle auth + contexte courant.

Commande backend attendue :

```bash
npm run dev
```

Puis côté MALEX/Codex :

```bash
npm run dev:frontend
```

Punchline officielle :

> On n'est pas en train de faire une landing page, on branche le cockpit au réacteur. Dis-moi quand je peux tourner la clé.
