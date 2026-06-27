# OCR / Vision — Audit de conformité

Date : 2026-06-27 · HEAD : `65d518a`

## 1. Périmètre audité

- `apps/backend/src/runners/ocr_runner.ts` — runner OCR multimodal
- `apps/backend/src/runners/runner_loop.ts` — boucle de polling générique
- `apps/backend/src/services/jobs.ts` — cycle de vie des jobs
- `apps/backend/src/lib/storage.ts` — résolution `storage://`
- Contrat shared : `InventoryOcrCandidateSchema`, `JobTypeSchema`

## 2. Invariants verrouillés

### I1. `JAMAIS completed` — ✅ CONFORME

- Ligne 27 : `/// JAMAIS completed. Le runner ne crée aucun inventory_item`
- Ligne 153-154 : Toujours terminé en `needs_review` (succès) ou `failed` (erreur)
- `markJobNeedsReview()` est le seul terminal success path
- Aucun appel à `markJobComplete()` dans tout le fichier

### I2. Candidate-only enforcement — ✅ CONFORME

- `parseOcrCandidates()` utilise `InventoryOcrCandidateSchema.safeParse()` ligne 110
- Aucun candidat malformé ou inventé n'est propagé : les éléments non conformes sont silencieusement ignorés
- `MAX_CADIDATES = 50` limite l'explosion mémoire

### I3. Aucun SQL direct — ✅ CONFORME

- Toutes les opérations DB passent par des services : `claimNextJob`, `failJob`, `markJobNeedsReview`, etc.
- Aucune requête SQL inline dans `ocr_runner.ts`

### I4. Aucune hallucination propagée — ✅ CONFORME

- Le prompt système ligne 38-42 interdit explicitement l'invention
- Le parseur ligne 81-114 rejette tout élément qui ne passe pas le Zod schema
- Les `source_ref` manquantes sont complétées mais jamais inventées : `ocr:${jobId}:idx:${i}`

### I5. Secrets caviardés — ✅ CONFORME

- `sanitizeError()` ligne 69-73 filtre les patterns sensibles (api_key, token, password, etc.)
- Troncature à 300 caractères

## 3. Gaps et observations

### G1. Aucune métrique de confiance minimale

- Les candidats sont acceptés quelle que soit leur `confidence`
- Le champ `confidence` (0-1) est libre dans le schéma sans seuil minimum
- Risque : un LLM peut produire des candidats avec `confidence: 0.01` qui passent

### G2. Pas de vérification de doublon à l'ingestion

- Le runner ne vérifie pas si un candidat similaire existe déjà dans la base
- La déduplication est repoussée à la review humaine

### G3. Le runner est en mode `mock` par défaut

- `apps/backend/.env` n'est pas commité, mais `completeVision` utilise le provider LLM configuré
- Si le provider est réel (OpenRouter), le runner envoie des images au LLM
- Aucun check de consentement utilisateur avant upload image vers un provider externe

## 4. Conclusion

Le runner OCR est **conforme aux invariants** : candidate-only, pas de `completed`, pas de SQL direct, pas d'hallucination propagée. Les gaps (seuil de confiance, dédup, consentement provider) sont des améliorations, pas des violations de sécurité.

## Ce qui reste à vérifier

- **OCR runner non exécuté** : le runner n'a pas été lancé (pas de provider réel configuré dans `apps/backend/.env`)
- **Consentement utilisateur** : le gap G3 (upload images vers provider externe sans consentement) n'a pas été testé
- **Déduplication** : non vérifiée dans le code (gap G2 documenté mais pas de test d'impact)

## Correction post-revue Codex (2026-06-27)

Aucune correction factuelle nécessaire dans ce rapport. Ajout de la section "Ce qui reste à vérifier".
