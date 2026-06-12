# Spec détaillée — 2 PRs prioritaires (audit-only, **aucun code appliqué**)

> Dérive de `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` (+ § « Vérifs contre `main` ») et du périmètre resserré
> Vincent. **Gate** : spécification/proposition uniquement — analyse et préparation de patch autorisées avant
> validation (`INBOX_MALEX` règles), mais **rien n'est appliqué, mergé, migré ni déployé** avant la
> **validation humaine explicite de MALEX**. Chaque PR = 1 owner, **contrat d'abord, schéma avant endpoint,
> permission avant action, test inclus**, invariants préservés.

## Contexte vérifié (rappel, sourcé)

- **Cycle d'action** (`engines/action_engine.ts`) : `createAction` (draft) → `preflightAction` (sensible →
  `pending_validation`, sinon `approved`) → `validateAction` (rôle validateur requis) → `executeAction`
  (**REFUSE tout status ≠ approved**, résultat **mocké** aujourd'hui, l.305-311). Chaque transition est
  tracée via `audit()`.
- **Registre déclaratif** (`engines/action_registry.ts` + `seeds/action_registry_seed.v1.json`) : dit ce
  qu'une action **est** (risk, preflight, validation, surface). `isSensitive` = `validation_required===true`
  ou risque `high`/`medium_high`.
- **Permissions** (`engines/permission_runtime.ts`) : `validatorRoleFor` renvoie **`'teacher'` en dur** pour
  toute action sensible ; `checkPermission` est **permissif** (tout user authentifié peut créer ; le garde-fou
  est la validation). `ROLE_RANK` = student0 / teacher1 / admin2 / godmode3 → `requireRole('admin')` couvre
  **admin + godmode**.
- **`token_events`** (`db/schema.ts:178-189`) : table prête, **écrite à chaque appel** (`services/llm.ts:54-84`)
  mais tokens **estimés**, `task` figé `'chat'` (`TOKEN_TASK`), `cost_eur=0`, `usage` provider **non consommé**
  (`llm.ts:43`), **aucun endpoint de lecture**.
- **`global_settings`** (`db/schema.ts:169-176`, colonnes `app,key,value_json,updated_at,updated_by`) : table
  prête, **aucun routeur** ne la touche → ardoise vierge, écriture à câbler **via le cycle d'action sensible**.
- Routers montés dans `index.ts` sous `/api/v1` ; tables en `CREATE TABLE IF NOT EXISTS` idempotent (pas de
  framework de migration → un simple index suffit si besoin).

---

## PR-1 — Suivi token (`IMPROVE_EXISTING_OWNER`) · owner `service llm` + `godmode_debug_runtime` + audit

**But** : rendre le suivi token **réel** (usage provider, par tâche, coût) et le **projeter** dans un endpoint
**diagnostic gated godmode/admin**. Deux sous-parties indépendantes.

### A. Instrumentation réelle (`services/llm.ts`)
1. **Tâche** : ajouter `task?: string` à `LLMStreamParams` (défaut `'chat'`) ; le passer à `logTokenEvent`
   (remplace la constante figée `TOKEN_TASK`). Les appelants (`routers/ws/chat.ts`, plus tard OCR/correction)
   déclarent leur tâche.
2. **Usage réel** : dans `streamOpenAICompat`, ajouter au body `stream_options: { include_usage: true }`
   (standard OpenAI streaming). Capturer le **dernier chunk SSE** porteur de `usage`
   `{prompt_tokens, completion_tokens}` ; s'il est présent → compteurs **réels**, sinon **fallback** sur
   l'estimation `emitted`/`estimatePromptTokens` (providers sans `usage`). Le mock garde l'estimation.
3. **Coût** : nouveau `services/llm_pricing.ts` — table `€/1k tokens (in,out)` par modèle (config), helper
   `costFor(model, prompt, completion)` → `cost_eur` ; `0` si modèle inconnu (jamais d'invention).
4. **Invariant** : le log reste **best-effort** (ne casse jamais la réponse) ; le LLM ne fait toujours que
   proposer.

### B. Endpoint diagnostic gated (lecture)
1. **Router** `routers/diagnostics.ts`, monté sous `${api}`, **`requireUser` + `requireRole('admin')`**
   (= admin + godmode ; cohérent « godmode/admin » + Q6 `owner_ops_private_diagnostic`). Teacher/student → **403**.
2. **Route** `GET /diagnostics/token-usage?from&to&group_by=model|task|user|day` → agrégats
   `SUM(prompt_tokens)`, `SUM(completion_tokens)`, `SUM(cost_eur)`, `count` sur `token_events`. **Privé par
   défaut** (jamais teacher/student), **sans effet** sur le runtime user.
3. **Registre** : ajouter `view_token_usage` (`risk_level: low`, `preflight_required:false`,
   `validation_required:false`, `ui_surface: 'admin_diagnostics_panel'`, `status: 'live'` à la livraison) →
   l'UI le projette comme action **live gated admin/godmode** (cohérent registre ; une lecture n'est pas une
   action de cycle, mais l'enregistrer garde la projection UI homogène).
4. **Contrat (shared)** : `TokenUsageReportSchema` (additif, pour client typé). **Audit** : un seul event
   `diagnostic_read` par appel (optionnel, traçabilité).

### Fichiers PR-1
`services/llm.ts`, `services/llm_pricing.ts` (nouveau), `routers/ws/chat.ts` (passe `task`),
`routers/diagnostics.ts` (nouveau), `index.ts` (montage), `db/schema.ts` (index `token_events(ts)` /
`(user_id)`), `seeds/action_registry_seed.v1.json` (+`view_token_usage`),
`packages/shared/src/index.ts` (+`TokenUsageReportSchema`), tests `tests/token_usage.test.ts`,
`tests/llm_usage.test.ts`.

### Tests PR-1
admin/godmode → 200 agrégats ; teacher/student → 403 ; non-auth → 401 ; `usage` consommé quand le provider
le renvoie (mock du chunk SSE final) sinon estimation ; `task` propagé.

---

## PR-2 — Écriture `global_settings` via action sensible (`ABSORB_AND_ADAPT`) · owner `permission_runtime` + `ADMIN_PERMISSION_COCKPIT`

**But** : écrire un réglage global est une **action SENSIBLE** qui **doit** passer
`preflight → pending_validation → validation (admin/godmode) → execute`. **Jamais de PUT direct.** La table
`global_settings` existe déjà.

### Contrat / registre (contrat d'abord)
1. **Registre** : ajouter `set_global_setting` (`risk_level: 'medium_high'` → sensible,
   `preflight_required:true`, `validation_required:true`, `ui_surface: 'admin_settings_cockpit'`,
   `validator_role: 'admin'`, `status:'future'` → `'live'` à la livraison).
2. **Schéma registre (shared)** : ajouter `validator_role: RoleSchema.optional()` à
   `ActionRegistryEntrySchema` (**additif**, rétro-compatible — les entrées existantes restent valides).
3. **`validatorRoleFor(entry)`** → `entry.validator_role ?? 'teacher'` quand sensible : généralise le gate
   sans casser l'existant (`set_global_setting` se valide en **admin**, pas teacher).
4. **Payload (shared)** : `SetGlobalSettingSchema` `{ app: string, key: string, value: <JSON-serializable> }`.

### Handler d'exécution (effet réel, remplace le mock pour cette action)
`executeAction` renvoie aujourd'hui un résultat mocké. Introduire un **petit dispatcher par `registry_id`**
(map `action_executors`) ; défaut = mock inchangé pour toutes les autres actions. Pour `set_global_setting` :
1. **assert acteur `role ≥ admin`** (défense en profondeur) → sinon `execute_refused` + throw.
2. valider la payload (`SetGlobalSettingSchema`) + **allowlist `ADMIN_CONTROLLED_KEYS`** (absorbée d'API_manage)
   des `(app,key)` inscriptibles (ex. `llm.provider`, `llm.model`, `llm.base_url` — **jamais** un secret/clé
   API : les secrets restent en `.env`, jamais en BDD). Clé hors allowlist → rejet.
3. **UPSERT** `global_settings (app,key,value_json,updated_at,updated_by=acteur.id)`.
4. `result = { app, key, previous, new }` → trace `execute_completed` avec le **diff**.

### Permissions & invariants spécifiques
- Le gate de **validation** (admin/godmode via `validator_role`) + l'**assert d'exécution** = double verrou ;
  `execute` avant validation reste **423** (invariant existant). Création permissive conservée (le garde-fou
  est la validation) ; option recommandée : gater aussi la création à admin pour cette action (check léger).
- **Secrets jamais en BDD** ; `global_settings` ne stocke que de la config non-secrète.

### Fichiers PR-2
`packages/shared/src/index.ts` (+`validator_role`, +`SetGlobalSettingSchema`),
`seeds/action_registry_seed.v1.json` (+`set_global_setting`),
`engines/permission_runtime.ts` (`validatorRoleFor` lit `validator_role`),
`engines/action_engine.ts` (dispatcher d'exécution + assert rôle),
`engines/settings.ts` (nouveau : allowlist + upsert), tests `tests/settings_action.test.ts`.

### Tests PR-2
create `set_global_setting` → preflight → `pending_validation` ; execute avant validation → **423** ;
validation par **teacher → 403** (rôle insuffisant), par **admin/godmode → approved** ; execute par admin →
`completed` + ligne `global_settings` upsertée + audit diff ; execute par non-admin même approuvé → refusé ;
clé hors allowlist → rejet.

---

## Invariants préservés (les deux PRs)
- **Aucune action sensible sans validation humaine explicite** (`set_global_setting` ne peut sauter
  `pending_validation` ; `execute` refuse ≠ approved).
- **Le backend décide, le LLM propose** ; permissions jamais blendées ni inférées d'une préférence.
- **Privé par défaut** : diagnostic token + écriture settings **gated admin/godmode, jamais teacher/student** ;
  sans effet sur le runtime user.
- **Trace d'audit** sur chaque transition ; **secrets hors BDD** (`.env` only).
- **Changements de contrat additifs** uniquement (champs optionnels) → rétro-compatibles.

## Ordre, dépendances, migrations
1. **PR-1** (token) — indépendante, plus petite → **livrer en premier**. Migration : aucune (table existe ;
   éventuel index `token_events`).
2. **PR-2** (settings) — dépend de l'ajout de contrat `validator_role` → **livrer ensuite**. Migration :
   aucune (table `global_settings` existe).
- Les deux restent **`BLOCKED_BY_HUMAN_VALIDATION`** : aucun code appliqué avant le GO de MALEX.

## Hors-scope explicite de ces 2 PRs
Multi-user + secrets per-user chiffrés (vibe V3), objets `classes/élèves` (C11), `correction_engine` Phase 2
(PR-F) — décisions de périmètre séparées.

*Spec rédigée via Claude pour Vincent. Proposition pour validation humaine MALEX — rien n'est implémenté.*
