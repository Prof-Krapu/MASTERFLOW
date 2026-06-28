# @masterflow/tui — client TUI agentic

Client terminal (Ink/React) qui exerce le **backend réel** MasterFlow : connexion, contexte/loadout,
chat persona en streaming (WebSocket) et cycle d'actions. Il réutilise le contrat partagé
`@masterflow/shared` (Zod) ; il ne duplique pas la logique métier — l'autorité reste le backend.

> Périmètre : c'est **notre** client backend/test/opérateur. Le frontend web (`apps/frontend`) reste
> le territoire MALEX et n'est pas concerné.

## Lancer

```bash
npm install
npm run dev            # backend sur http://localhost:8000 (terminal A)
npm run dev:tui        # TUI (terminal B, interactif/TTY requis)
```

Login dev par défaut : `vincent` / `masterflow` (godmode).

Variables d'env optionnelles : `MASTERFLOW_TUI_API` (défaut `http://localhost:8000/api/v1`),
`MASTERFLOW_TUI_WS` (déduit de l'API), `MASTERFLOW_TUI_USER` (défaut `vincent`).

## Commandes

- *(texte libre)* — message au persona (réponse streamée ; réelle si DeepSeek/OpenRouter branché,
  sinon mock côté serveur).
- `/actions` — actions `live` disponibles dans le loadout.
- `/act <action_id> [intent]` — crée + preflight une action du registre.
- `/approve [note]` · `/reject [note]` — validation humaine (teacher+) de l'action en attente.
- `/exec` — exécute l'action approuvée.
- `/context` · `/help` · `/quit` (ou Ctrl+C).

## Brancher une IA réelle (DeepSeek)

Côté backend (`apps/backend/.env`, jamais commité), puis `npm run seed` avec ce `.env` chargé :

```
LLM_PROVIDER=deepseek
LLM_API_KEY=sk-…
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_EGRESS_ALLOWLIST=https://api.deepseek.com
```

Le seed bascule alors les profils de routage sur le provider `deepseek` / `deepseek-chat`. Tant que
`LLM_PROVIDER=mock`, tout reste inerte (zéro appel réseau).

## Évolutivité

Les actions proposées dérivent du **registre filtré par le loadout** : toute nouvelle action backend
`live` apparaît automatiquement dans `/actions`. Couche suivante (non implémentée) : laisser le
persona **proposer** une action que le TUI surface pour validation humaine — conforme à l'invariant
« aucune action sensible sans validation ».
