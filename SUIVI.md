# SUIVI — MasterFlow

Journal de construction. Le quoi/pourquoi, daté et concis.

---

## 2026-06-06 — MVP backend + PoC : livrés et validés

**Périmètre :** backend (livrable principal) + PoC frontend de démonstration. Le frontend complet reste à MALEX.

### Construit

**Phase 0 — Squelette.** Monorepo npm workspaces (`apps/backend`, `packages/shared`, `packages/poc-frontend`). SQLite via better-sqlite3 (singleton WAL+FK, migrations idempotentes). Schéma MVP : `users`, `revoked_tokens`, `rooms`, `room_instances`, `personas`, `persona_blends`, `actions`, `audit_logs`, `resources`, `global_settings`, `token_events`. Seed idempotent (godmode `vincent`, 3 personas, room Home, ressources). `GET /health`.

**Phase 1 — Auth + Contexte.** JWT Bearer (`signToken`/`verifyToken`, `requireUser`/`requireRole`, révocation par `jti`). `POST /auth/{register,login,logout}`, `GET /auth/me`. `GET /context/current` (user+room+instance+personas+blend actif+actions dispo). Rooms + room_instances (création paresseuse).

**Phase 2 — Personas + Chat + Blend.** `GET /personas`, `POST /personas/{id}/activate`, `POST/PUT/DELETE /personas/blend`. **Chimère** = fusion visuelle + 1 porte-parole (primaire) ; `computeHybridVoice` (overlay de méthode attribué) ; `methodAttribution`. **WebSocket chat streaming** (`routers/ws/chat.ts`) : auth à l'upgrade, `chat_start → chat_chunk → chat_end`. `services/llm.ts` (mock + OpenAI-compat SSE).

**Phase 3 — Action router.** Cycle `draft→preflight→pending_validation→approved→executing→completed` (`action_engine`). `GET /actions/available` (depuis le seed), `POST /actions`, `/preflight`, `/validate` (teacher+), `/execute`, `GET /actions/pending`. `risk_level` statique. Tout tracé dans `audit_logs`.

**Phase 4 — Anti-hallucination.** `resource_truth` : `GET /resources` ne sert que les `validated` ; `POST /resources` → `candidate` ; `POST /resources/{id}/validate` (teacher+). `include_all=1` réservé admin/godmode.

**Contrat MALEX.** `packages/shared` (Zod) : tous les payloads REST + messages WS. Ajout de `SearchResourcesResponseSchema` (`{results,total}`), seule réponse non typée.

**PoC front.** React 19 + Vite 6. `BlendCanvas` (métaballs WebGL `smoothMin`, creep Zerg, respecte `prefers-reduced-motion`), `api.ts` (REST typé), `useChatWs.ts` (hook streaming), `App.tsx` (harness login → contexte → chat streaming → slider de fusion ProfKrapu⇄Corrector).

**Tests.** Vitest niveau engine (`:memory:`) : auth/rôles, cycle de vie action (dont 423 avant validation, rejet, rôle insuffisant), anti-hallucination, invariant blend. **13/13.**

### Corrections de ce tour (reprise après workflow interrompu)

- Écrit le **router WS `ws/chat.ts`** (manquait) + recâblé `index.ts` (http server + montage REST + WS).
- Corrigé **10 erreurs `tsc`** (`noUncheckedIndexedAccess` sur `req.params.id`) dans `personas.ts`/`rooms.ts`.
- **Réconcilié les contrats du PoC** : `App.tsx` (généré en parallèle) attendait des signatures différentes de `api.ts`/`useChatWs.ts` → aligné (`api` agrégé, `login` positionnel, `updateBlend` poids bruts, `currentSpeaker`/`status`/`role:'assistant'`/`method_attribution`, `import App` default).

### Validation (run réel, pas seulement compilation)

| Vérif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Backend Vitest | 13/13 |
| PoC `tsc` + `vite build` | 0 erreur · 32 modules / 209 KB |
| Boot + `/health` | `users:1 personas:3 rooms:1 resources:3` |
| Login godmode → JWT | OK |
| Cycle action complet | draft→preflight→pending→approve→execute→completed |
| **Invariant** execute avant validation | **HTTP 423 `not_approved`** |
| Trace audit | `action_created→preflight→validation→execute_start→execute_completed` |
| Anti-hallucination `/resources` | 2 `validated` ; `include_all` (godmode) → 3 ; proposition → `candidate` |
| WS streaming | `chat_start` → 127 chunks → `chat_end` |
| Chimère via WS | speaker = **ProfKrapu** + `method_attribution = "méthode inspirée de Corrector"` |

### Décisions / notes

- Le **seed** (`action_registry_seed.v1.json`) prime sur `API_DESIGN.md` pour `action_id`/surfaces/risk.
- « SIMULATION PURE » traité comme dry-run (preflight actif, exécution mockée).
- Exécution d'action **mockée** au V1 (pas de runner réel).
- LLM `mock` par défaut.

### Reste à faire (hors MVP, selon souhait de Vincent)

Tauri shell (`apps/desktop`) · brancher un vrai LLM · phases 2+ des specs (multi-room, correction, ComfyUI, OCR) — **explicitement hors MVP**.

---

## 2026-06-06 (suite) — Lancement & corrections du rendu PoC

**Contexte.** Lancement effectif : backend (`:8000`) + PoC Vite (`:5173`) exposés sur le tailnet (`vite --host 0.0.0.0`), accès `http://100.100.128.63:5173` (le PoC proxifie REST `/api` + WS `/ws` vers le backend local → un seul port à partager). Démo testée **en conditions réelles** avec Vincent (navigateur sur Mac). Une chaîne de bugs d'intégration du PoC, invisibles à la compilation, a été trouvée et corrigée en run.

### Bugs trouvés & corrigés (PoC frontend)

1. **CSS désynchronisé.** `styles.css` ciblait d'anciennes classes (`.mf-canvas`/`.mf-harness`/`.mf-panel`) absentes du DOM réel d'`App.tsx` → aucune mise en page, canvas à 0 px → écran noir. **Fix :** `styles.css` réécrit pour le vrai arbre (`.screen--room`, `.room-overlay`, `.speaker-banner`, `.blend-control`, `.chat*`) + canvas plein écran (`position:fixed`).

2. **Shader WebGL — `fwidth()` sans extension.** Le fragment shader appelait `fwidth()` sans déclarer `GL_OES_standard_derivatives` → rejeté par les compilateurs GLSL stricts. **Fix :** anti-aliasing recalculé depuis `u_resolution` (1 px ≈ `1/min(res)`), retrait de `#version 100`, `highp`→`mediump` (compat max).

3. **StrictMode + `loseContext` (cause racine du « log vide / inconnue »).** Le cleanup appelait `WEBGL_lose_context.loseContext()`. Or `canvas.getContext('webgl')` rend toujours le **même** contexte ; sous React StrictMode (double montage en dev), le remontage récupérait un contexte **détruit** → compilation impossible, info-log vide. **Fix :** plus de `loseContext` au cleanup (le GC libère le contexte) ; `display:block` + reset d'erreur à chaque montage.

4. **Dégradation propre.** Si WebGL indisponible/échoue : canvas masqué + **fond CSS dégradé** (halos vert ProfKrapu / violet Corrector) au lieu de noir, et **bandeau d'erreur visible à l'écran** (diagnostic sans console). Un disjoncteur localStorage a été testé puis **retiré** (bloquait à tort une fois le shader réparé).

5. **Bruit console.** Favicon inline (`<link rel="icon" href="data:,">`) → fin du 404. Warning CSP `eval` identifié comme **externe** (extension navigateur) : aucun header CSP côté serveur, aucun `eval` dans le PoC.

### Vérifs
`tsc --noEmit` PoC : 0 erreur. Backend `/health` vert via Tailscale. Login godmode + modules (shader) servis OK via le proxy.

### Note exploitation
Lancement du backend = **human in the loop** (Vincent). Backend bind `*:8000`, Vite `--host 0.0.0.0`.
