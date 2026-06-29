# MasterFlow — matrice d'absorption globale

Date : 2026-06-29
Vague : `GLOBAL-ABSORPTION-001`
Statut : `codex_arbitrated_local`
Périmètre : audits BP, legacy/source-truth, factories, OpenMontage/design, voix, sécurité, DA
narrative et UI.

## Décision simple

Le chantier ne manque pas d'idées : il manque surtout un ordre d'absorption stable.

Cette vague ne canonise rien automatiquement et ne code aucun runtime. Elle classe les signaux déjà
présents dans Git pour éviter trois dérives :

1. recoder une brique déjà représentée ;
2. copier une Factory ou une source externe telle quelle ;
3. lancer provider, live, migration, image, voix ou sécurité sans contrat court.

## Sources lues

- `docs/audits/EXPRESSIVE_CANON_BEHAVIOR_GRAPH_AUDIT_2026-06-29.md`
- `docs/audits/VISION_PRODUCT_ABSORPTION_AUDIT_2026-06-29.md`
- `docs/audits/FACTORIES_VS_MASTERFLOW_CONFRONTATION_AUDIT_2026-06-29.md`
- `docs/audits/CODEX_BP_AUDIT_ABSORPTION_VERDICT_2026-06-29.md`
- `docs/source-truth/GIT_OPERABLE_SOURCE_OF_TRUTH_AND_EXTERNAL_PRIMITIVE_HARVEST_AUDIT_2026-06-27.md`
- `docs/source-truth/EXTERNAL_PRIMITIVE_HARVEST_REGISTRY_2026-06-27.md`
- `INBOX_MALEX.md` pour la branche DeepSeek/TUI/voix non validée.
- sources externes temporaires OpenMontage/design présentes sous `/private/tmp/opencode-audit/`.

## Matrice d'arbitrage

| Famille | Statut Git actuel | Ce qu'on garde | Ce qu'on bloque | Prochaine vague |
|---|---|---|---|---|
| Reprise / pilotage | `implemented_doc` via PR #173 | rituel anti-coupure, queue globale, bloc `VAGUE ACTIVE` | nouvelles queues parallèles | continuer avec cette matrice |
| EXPRESSIVE_CANON | `already_in_git_runtime` P1 | Style Mirror consenti, borné, injecté seulement si actif/validé | nouvelle table `behavior_profiles`, psychologie inférée, collecte auto | plus tard : P2 évaluation consentie |
| Voix / TTS persona | `runtime_gap` | router TTS existe, `voice_config` persona existe, UI lit un audio | provider live, voix non whitelistée, coûts illimités, STT/micro complet | `VOICE-PERSONA-001` après sécurité/trust |
| Security Fabric | `runtime_guard_pr_177` | frontière V1, garde déterministe direct/indirect, RAG fiable, action engine, hard stop, permissions | répétition persistante, ban automatique, kill switch global, provider/live | `TRUST-FABRIC-001`, puis observabilité sécurité |
| Trust Fabric | `partial_runtime` | trust source dans RAG, confidence fields, audit logs, owner cockpit | score moral utilisateur, surveillance opaque, décisions automatiques | `TRUST-FABRIC-001` après sécurité |
| Safety narrative states | `runtime_gap` | hard stop et persona reactions sont compatibles avec l'architecture | humiliation en classe, sanction automatique, état caché incompréhensible | après Trust Fabric |
| Vision product absorption | `already_in_git_doc` partiel | progressive disclosure, preflight UI, notes/ZK comme Knowledge extension, output registry | LMS/OCR/C2PA/image sans tranche séparée | piocher par vagues courtes |
| Factories | `external_workshop` + primitives Git | boot context, scope lock, extraction inbox, source truth strip, visual refs | audit détaillé Factory dans Git, copie de bot complet | seulement primitives nommées |
| OpenMontage / design.md | `already_in_git_doc` et concepts clean-room | packs, étapes, promesse de sortie, cost/preflight, Theme Studio | code AGPL, provider scoring, génération automatique | continuer côté Theme/D08 si utile |
| DA narrative / Theme Studio / D08 | `partial_runtime` | manifests, visual grammar, Theme Studio explain-only, D08 gates | provider image réel, canonisation auto, motif décoratif non justifié | après Security/Trust ou en parallèle doc |
| MasterStory / Experience Fabric | `partial_runtime` avancé | Event Spine, Precedents, Storylets, MAPE-K, Blackboard, MasterStory UI | autonomie sans validation, multi-porte-parole public | consolider ponts après sécurité |
| Learning / Teaching integrity | `partial_runtime` | Teaching, ressources vidéo, timecodes/notions, validation inbox | faire le travail à la place, LMS lourd, tracking intrusif | après Safety/Trust |
| UI progressive | `partial_runtime` | Home légère, GodMode panels, outils à la demande | dashboard permanent, chargement massif, surfaces sans endpoint réel | après contrats sécurité/trust |

## Décisions d'ordre

### À faire maintenant

1. `SECURITY-FABRIC-001` : formaliser le trust boundary runtime.
2. `TRUST-FABRIC-001` : créer les jauges opérationnelles séparées.
3. `SAFETY-STATE-001` : états narratifs, alertes godmode et réactions persona.

### À mettre en queue

- `VOICE-PERSONA-001` : durcir le TTS existant avec whitelist, limites, permissions et fallback.
- `DA-NARRATIVE-BRIDGE-001` : relier D08, Theme Studio, MasterStory et assets explicables.
- `ACADEMIC-INTEGRITY-001` : empêcher l'IA de faire le travail à la place tout en gardant le guidage.
- `UI-PROGRESSIVE-SURFACES-001` : surfaces visibles après contrats backend.

### À garder futur ou bloqué

- provider image réel ;
- STT/micro complet ;
- DeepSeek live ou clé LLM saisie côté TUI ;
- LMS LTI/xAPI/SCORM ;
- C2PA runtime ;
- avatar swap ;
- self-debug / auto-patch ;
- audit cryptographique.

## Contrat de la prochaine vague

Intention produit : empêcher MasterFlow de se faire contourner ou empoisonner tout en restant
pédagogique, drôle et explicable.

Partie concernée : prompt/RAG/action/security boundary.

Ce qui doit changer : ajouter un contrat Git court `SECURITY-FABRIC-001` décrivant les états de
menace, les sources non fiables, les refus gradués, les alertes godmode et les tests attendus.

Ce qui ne doit pas changer : pas de ban automatique, pas de provider/live, pas de modification DB,
pas de route sensible, pas de changement de permission.

Critère simple de succès : un autre Codex ou Vincent sait exactement quoi coder ensuite pour
sécuriser prompt injection, RAG poisoning et actions sensibles sans inventer d'architecture.

Risque de dérive : moyen si on mélange sécurité, trust user, UX rouge et sanctions. La vague
suivante doit donc rester centrée sécurité, pas gamification.

Validation nécessaire : non pour le contrat documentaire ; oui avant toute implémentation runtime
qui touche permissions, actions, sessions ou sanctions.
