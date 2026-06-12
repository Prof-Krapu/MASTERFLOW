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

## 2026-06-12 — answered — Auditer les workflows Vincent pour absorption MasterFlow

> **RÉPONSE Vincent (humaine), 2026-06-12 — pilote 3 projets livré.** Décision Vincent : faire d'abord
> un **pilote sur 3 projets** (`API_corrector`, `API_manage`, `vibe`) pour **calibrer le format** de la
> matrice, puis étendre aux ~17 autres sur GO. Livrable : **`AUDIT_ABSORPTION_PILOTE_3PROJETS.md`**
> (matrice sourcée par item, incompatibilités, améliorations, plan de PRs courtes). **Audit only, aucun
> code.** ⚠️ Le protocole d'entrée `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md` est
> **introuvable en local** → compilé sur `CONTRACT_INDEX` + canon `05_BACKEND_REBUILD_SOURCE_TRUTH` +
> registre d'actions de `main` ; **à confirmer par MALEX** si un protocole canonique doit primer.
> Top absorptions valeur/risque : transport Tauri desktop↔remote (vibe), egress LLM gated
> (vibe+API_corrector), allowlist storage admin/privé (API_manage), garde-fous notation + `coherenceAudit`
> surfacé (prolonge couche 14). Incompat bloquantes : objets `classes/élèves` sans owner (retirés couche 13),
> CSP `default-src *` (vibe), tunnel QR brut, landing page-routing (anti-scope). **Retour pour validation
> humaine MALEX.** Détails dans `SYNC_THREAD_MALEX_VINCENT.md` (entrée 2026-06-12 pilote audit).

MALEX valide le lancement d'un **audit comparatif sans implementation**.

Contexte : tes projets contiennent deja beaucoup de workflows et de features potentiellement
utiles. Avant de poursuivre l'integration, ton systeme doit les comparer au MasterFlow canon pour
eviter doublons, incompatibilites, permissions contournees ou features tardivement recodees.

Action demandee :

1. Lire en premier, dans le Drive canon :
   `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`.
2. Charger ensuite les index/owners indiques dans l'entree du `SUIVI.md` du 2026-06-12, sans
   scan aveugle du Drive.
3. Inventorier les workflows reels de tes projets.
4. Mapper chaque workflow vers :
   owner MasterFlow, engine, contrats actifs, donnees/BDD, endpoints/toolcalls, permissions,
   preflight, validation humaine, audit, UI et tests.
5. Classer chaque item : `KEEP_AS_IS`, `ABSORB_AND_ADAPT`, `ADD_MISSING_CAPABILITY`,
   `IMPROVE_EXISTING_OWNER` ou `SKIP_OR_QUARANTINE`.
6. Retourner la matrice, les incompatibilites et un plan de PRs courtes dans Git.

**Interdit a ce stade :** coder, merger, migrer, deployer, ajouter un endpoint/engine ou modifier
permissions/perimetre. Le rapport doit revenir `answered` pour validation humaine MALEX.

Le but n'est pas de faire rentrer MasterFlow dans tes projets. Le but est d'utiliser MasterFlow
comme compilateur d'architecture pour absorber leur meilleure valeur sans casser son runtime.

---

## 2026-06-07 — done — IP directe joignable en ping, ports bruts time-out

> **RÉSOLU (Vincent, 2026-06-07).** Diagnostiqué côté host : `tcpdump` sur `tailscale0` = **0
> paquet** de l'IP MALEX (ses curls n'arrivaient pas), firewall **écarté** (`ts-input` accepte
> tout, `netcheck` host sain) → plan de données Tailscale KO entre le NAT FAI de MALEX et la box.
> **Décision humaine : bascule en Funnel PUBLIC** (`:8443` backend, `:10000` frontend) +
> durcissement secrets. Voir `SYNC_THREAD` « RÉSOLU pour de bon : bascule en Funnel PUBLIC ».

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

## 2026-06-07 — done — Node-share vu, ports Serve toujours injoignables

> **RÉSOLU (Vincent, 2026-06-07).** Cause : Tailscale **Serve ne sert pas les nœuds partagés**
> (sharee). Tenté ensuite l'IP tailnet directe (échec aussi, cf. item ci-dessus) → bascule
> **Funnel PUBLIC**. ACL OK (MALEX dans le packet-filter), ce n'était ni l'ACL ni le DNS.

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
