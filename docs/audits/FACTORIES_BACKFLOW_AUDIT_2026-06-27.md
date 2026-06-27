# D11 Factories / Backflow — Audit de conformité

Date : 2026-06-27 · HEAD : `65d518a`

## 1. Périmètre audité

- `apps/backend/src/routers/factory_backflow.ts` — 3 routes D11
- `apps/backend/src/services/factory_backflow_intake.ts` — service layer
- `apps/backend/src/db/schema.ts:1469-1508` — CHECK constraints
- `apps/backend/src/seeds/action_registry_seed.v1.json` — registre d'actions
- Documentation : `docs/d11-d12/FACTORY_BACKFLOW_INTAKE_V6C_2026-06-19.md`, `FACTORY_CANDIDATE_UPDATES_V6D_2026-06-19.md`, `FACTORY_MANUAL_ROUTING_V6F_2026-06-19.md`

## 2. Vérification route par route

### V6C — POST /backflow/intake

- **Permission** : `requireUser` + `requireRole('admin')` ✅
- **Validation** : `CreateFactoryBackflowIntakeRequestSchema.safeParse` ✅
- **Stockage** : `intake_status` via CHECK contraint à `candidate` ou `quarantined` ✅
- **Invariant canon** : `canon_status` CHECK = `'candidate_only'` ONLY ✅
- **Aucun fichier/ZIP/URL** : le contrat shared n'accepte que du JSON brut ✅

### V6D — GET /backflow/candidate-updates

- **Permission** : `requireUser` + `requireRole('admin')` ✅
- **Lecture seule** : `res.json(listFactoryBackflowCandidateUpdates())` ✅
- **Pas de mutation** ✅

### V6F — POST /backflow/candidate-updates/:id/route

- **Permission** : `requireUser` + `requireRole('admin')` ✅
- **Validation** : `RouteFactoryBackflowCandidateUpdateRequestSchema.safeParse` ✅
- **Routing** : cible `target_domain` avec note optionnelle ✅
- **Conflit** : retour 409 si déjà routé ✅

## 3. Vérification des CHECK constraints

Table `factory_backflow_intakes`:
- `intake_status` IN (`'candidate','quarantined'`) ✅ — pas de promotion auto
- `review_status` IN (`'pending','approved','parked','rejected','archived'`) ✅
- `canon_status` = `'candidate_only'` ONLY ✅ — invariant verrouillé au niveau BDD

Table `factory_backflow_candidate_updates`:
- `routing_status` = `'unrouted'` ONLY ✅ — pas de double routage
- `candidate_status` = `'approved_candidate'` ONLY ✅ — pas de statut `completed`

## 4. Registre d'actions

| action_id | endpoint | status registre | status réel | Écart |
|---|---|---|---|---|
| `submit_backflow_candidate` | `POST /backflow/intake` | `live` | `live` | ✅ |
| `import_factory_backflow` | `POST /backflow/intake` | `out_of_scope` | N/A | ✅ (même endpoint, usage différent) |

## 5. Conclusion

Les 3 routes D11 backflow sont **strictement alignées** sur les receipts V6C/V6D/V6F. Les CHECK constraints verrouillent l'invariant `candidate_only` au niveau DB. Aucune fuite vers `completed` ou `validated`. Le registre d'actions est cohérent.

**Aucune action corrective nécessaire sur D11 backflow.**

## Ce qui reste à vérifier

- **Tests d'intégration** : les routes D11 n'ont pas été testées avec un appel HTTP réel
- **Docs associées** : vérifier que `docs/d11-d12/FACTORY_BACKFLOW_INTAKE_V6C_2026-06-19.md` est toujours alignée sur le code actuel
- **Permissions** : les routes backflow sont en `admin` only — vérifier qu'aucun besoin teacher/student n'est attendu

## Correction post-revue Codex (2026-06-27)

Aucune correction factuelle nécessaire dans ce rapport. Ajout de la section "Ce qui reste à vérifier".
