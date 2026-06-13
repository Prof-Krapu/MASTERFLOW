# SPEC — Adapter Registry PR-CB1

Statut : `FOUNDATION IMPLEMENTED / READ-ONLY / 2026-06-13`

## Objectif

Déclarer les entrées que MasterFlow pourra absorber sans prétendre que leurs runners existent
déjà. Le registre distingue le runner technique mutualisable du contrat métier de chaque adapter.

Le registre est une source de vérité statique et versionnée :

```text
adapter déclaré
-> rôle minimal
-> privacy et risque
-> engine propriétaire
-> type de preuve produit
-> statut runtime/UI
-> futur runner explicite
```

Il ne contient ni donnée pédagogique, ni secret, ni logique d'import.

## Adapters déclarés

| Adapter | Owner | Sortie | Runtime | UI |
|---|---|---|---|---|
| `ocr-submission-v1` | Resource Truth | `submission` | `shell` | `locked` |
| `morphological-reference-v1` | MasterLab | `MorphologicalHintProfile` | `shell` | `locked` |
| `wooclap-import-v1` | Signal Engine | `wooclap` | `shell` | `locked` |
| `transcript-import-v1` | Signal Engine | `transcript` | `shell` | `locked` |
| `teacher-note-v1` | Pedagogical Adaptation | `teacher_note` | `partial` | `readonly` |

Les adapters pédagogiques exigent au minimum le rôle `teacher`. L'adapter morphologique est
visible au rôle `student` pour ses propres données, mais reste verrouillé. Aucun n'a
d'`executor_ref`.

## Invariants

- un adapter non `live` ne peut pas être `actionable` ;
- un adapter `live` doit référencer un executor réel ;
- un étudiant ne voit aucun adapter réservé professeur ;
- OCR copie et OCR morphologique peuvent partager `runner_family=ocr_multimodal` sans partager
  leurs sorties, permissions ou données ;
- toute référence morphologique exige consentement, absence d'inférence sensible et validation
  utilisateur ;
- un adapter extrait ou capture une preuve, il ne produit pas de conclusion ;
- l'activation future exige Project/Scope, permission check, preflight, jobs, tests et recette ;
- toute donnée issue d'un adapter reste privée par défaut dans le contrat `EvidenceEvent`.

## Implémentation

- contrat : `AdapterRegistryEntrySchema` dans `packages/shared/src/index.ts` ;
- source : `apps/backend/src/seeds/adapter_registry_seed.v1.json` ;
- lecture filtrée : `apps/backend/src/engines/adapter_registry.ts` ;
- garde : `requireExecutableAdapter` refuse actuellement tous les adapters ;
- tests : `apps/backend/tests/adapter_registry.test.ts`.

## Hors scope

- routes REST/WebSocket ;
- upload de fichiers ;
- OCR réel ;
- parsing WooClap ;
- transcription automatique ;
- stockage de payload ;
- activation d'une feature flag ;
- UI d'import.

PR-CB1 prépare le câblage. Il ne le simule pas.
