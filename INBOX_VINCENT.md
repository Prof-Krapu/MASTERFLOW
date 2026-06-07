# INBOX VINCENT — MasterFlow

Objectif : point d'entrée court pour les demandes MALEX/Codex à traiter côté Vincent.

Règles de lecture :

- à checker systématiquement avant reprise backend, run local, réponse de sync ou modification de contrat ;
- traiter les entrées du haut vers le bas ;
- une entrée peut être `open`, `answered`, `blocked` ou `done` ;
- une réponse IA ne vaut pas validation humaine ;
- Vincent peut transmettre ses demandes à MALEX via `INBOX_MALEX.md` ; leur dépôt ne constitue
  pas un feu vert et MALEX doit toujours les valider explicitement avant exécution ;
- si une entrée implique backend, permissions, endpoints, run ou périmètre, répondre dans `SYNC_THREAD_MALEX_VINCENT.md` ou par commit Git explicite.

---

## 2026-06-07 — open — IP directe joignable en ping, ports bruts time-out

Push `070688e` reçu : on ne teste plus Tailscale Serve pour MALEX, mais l'IP tailnet directe.

Tests côté MALEX :

- `tailscale ping --timeout=10s 100.100.128.63`
  → `pong from profkrapu-ms-7971 (100.100.128.63) via 2.12.241.244:41641 in 22ms` ;
- `curl -sS --max-time 12 http://100.100.128.63:8000/health`
  → timeout ;
- `curl -I --max-time 12 http://100.100.128.63:5174/`
  → timeout ;
- `curl -i --max-time 12 http://100.100.128.63:5174/api/v1/personas`
  → timeout.

Conclusion : le chemin Tailscale est bien ouvert jusqu'à la machine, mais les ports bruts `8000`
et `5174` ne répondent pas depuis MALEX. Ce n'est plus DNS ni Serve ; il reste exposition des
services sur l'interface tailnet, firewall local, bind effectif, ou ACL de ports.

Action demandée à Vincent :

- vérifier que le backend écoute bien sur `0.0.0.0:8000` ou `100.100.128.63:8000` ;
- vérifier que Vite écoute bien sur `0.0.0.0:5174` ou `100.100.128.63:5174` ;
- vérifier firewall macOS / pf / éventuel filtre host ;
- tester depuis la machine host :
  - `curl http://100.100.128.63:8000/health` ;
  - `curl http://100.100.128.63:5174/` ;
  - `lsof -nP -iTCP:8000 -sTCP:LISTEN` ;
  - `lsof -nP -iTCP:5174 -sTCP:LISTEN`.

Punchline réseau :

> Le ping touche la hurtbox : `profkrapu-ms-7971` est bien dans le ring. Mais `8000` et `5174`
> ne prennent aucun hit. Là ce n'est plus le tunnel, c'est le bind ou le firewall qui campe.

---

## 2026-06-07 — open — Node-share vu, ports Serve toujours injoignables

MALEX a bien récupéré le push `95faee7` annonçant le node-share réel de
`profkrapu-ms-7971` vers `malexcoulot@gmail.com` et la correction du chemin health en `/health`.

Tests relancés côté MALEX après reconnexion Tailscale macOS :

- VPN Tailscale : **Connected** ;
- DNS `profkrapu-ms-7971.tail8d8b1f.ts.net` : résout désormais vers `100.100.128.63`
  (plus vers les IP publiques) ;
- `curl -sS --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443/health`
  → timeout ;
- `curl -I --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000/`
  → timeout ;
- `curl -i --max-time 12 https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000/api/v1/personas`
  → timeout.

Conclusion : le problème n'est plus le DNS public. Depuis MALEX, le node répond en DNS tailnet,
mais aucun des ports Serve annoncés ne répond.

Action demandée à Vincent :

- vérifier côté host `profkrapu-ms-7971` :
  - `tailscale status` ;
  - `tailscale serve status` ;
  - `curl http://localhost:8000/health` ;
  - `curl http://localhost:5174/` ;
- confirmer que les ACL autorisent `malexcoulot@gmail.com` à joindre les ports Serve `8443`
  et `10000` ;
- transmettre si besoin l'adresse Tailscale directe de la machine et/ou un test `tailscale ping`
  attendu depuis MALEX.

Punchline réseau :

> Le DNS a enfin choisi le bon stage (`100.100.128.63`), mais les ports sont encore en parry
> infini. Serve ou ACL garde la porte, pas le client MALEX.

---

## 2026-06-06 — answered — Feu vert backend pour test frontend couche 1

Demande : autoriser le lancement du backend pour tester uniquement l'intégration réelle :

- `POST /auth/login`
- `GET /context/current`

Contexte :

- branche : `codex/frontend-masterflow`
- frontend shell ajouté dans `apps/frontend`
- aucun backend modifié
- tests/lint/build OK

Commande backend attendue :

```bash
npm run dev
```

But du run : valider auth + context current avec le frontend MALEX minimal, pas lancer un run large.

### Réponse Vincent — 2026-06-06

**Feu vert accordé**, périmètre strict couche 1 : `POST /auth/login` + `GET /context/current`
uniquement (pas de run large, pas d'écriture canon). Le lancement effectif du backend
(`npm run dev`) est fait **par Vincent** (human in the loop) — il dira « clé tournée » dans le
fil de sync au moment du run. Détails + réponses aux 6 questions backend dans
`SYNC_THREAD_MALEX_VINCENT.md`.

> *Brouillon rédigé via Claude pour Vincent ; le lancement réel reste l'acte humain de Vincent.*
