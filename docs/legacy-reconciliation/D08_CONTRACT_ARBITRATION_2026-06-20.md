# Arbitrage des contrats D08 — 2026-06-20

## Diagnostic

Les 48 contrats legacy D08 décrivent beaucoup de variantes, mais seulement six autorités produit :

1. racine DA et locks canon ;
2. références typées et signaux visuels ;
3. manifest, complétude et Action Ready ;
4. asset candidat, review, retake et change control ;
5. traduction vers UI, pédagogie, personnages, récit et événements ;
6. adapters d'exécution Comfy/provider/export, toujours secondaires et bloqués sans runtime.

Le canon D08 absorbe déjà cette architecture. GitHub ne livre pas encore le lifecycle D08 :
registre persistant, manifest, stockage, job de génération, provider et review UI restent absents.

## Contrat de déploiement

- Intention produit : conserver toute la puissance DA du legacy sans reconstruire une usine Comfy monolithique.
- Partie du canon concernée : D08, avec ponts bornés vers D03, D04, D05, D06, D09, D10, D11 et D12.
- Ce qui doit changer : arbitrer les 48 contrats et fixer leur autorité/successeur.
- Ce qui ne doit pas changer : aucun rendu, provider, stockage, migration, export ou propagation factory.
- Critère simple de succès : chaque contrat possède une décision et la chaîne manifest-first reste l'unique voie runtime.
- Risque de dérive : élevé si un adapter ou une esthétique devient l'autorité ; faible pour cette passe documentaire.
- Validation nécessaire : non pour audit/queue ; oui avant génération, export, provider ou écriture canon.

## Matrice Canon → GitHub

| Élément canon D08 | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| DA root, couches et filtres | absent comme runtime D08 | doctrine canon uniquement | moyen | persister plus tard des références versionnées, sans prompt monolithique |
| Reference resolver et statuts | absent | aucune table/API D08 dédiée | élevé si références implicites | première tranche runtime : registre typé, privé et read-only |
| Visual manifest immuable | absent | schema canon seulement | moyen | deuxième tranche : préparation de manifest sans provider |
| Action Ready et gates | futur dans registre d'actions | aucune exécution D08 | élevé si génération directe | troisième tranche : preflight et confirmation, provider encore bloqué |
| Asset candidat et review | absent | stockage/review manquants | élevé | livrer après manifest, avec `RIEN CANONISER` |
| Provider/Comfy/export | absent | aucun runner D08 | critique | garder derrière adapter, coût, permission, stockage et rollback |

## Arbitrage exhaustif

### A. Autorités absorbées

`absorbed` signifie que la règle produit est déjà portée par le canon D08, pas que le runtime existe.

- `MASTERFLOW_CORE_DA_ROOT_CONTRACT`
- `MASTERFLOW_DA_RESOLUTION_AND_ANTI_HALLUCINATION_CONTRACT`
- `MASTERFLOW_VISUAL_STYLE_GOVERNOR_AND_REFERENCE_STATUS_CONTRACT`
- `CONSCIOUS_IMAGE_ACTION_READY_AND_GENERATION_CONFIRMATION_CONTRACT`
- `VISUAL_ASSET_VALIDATION_GATES_CONTRACT`
- `VISUAL_DA_RESOLUTION_GATE_AND_ELEMENT_TRANSLATION_CONTRACT`
- `ASSET_BATCH_VALIDATION_AND_CHANGE_CONTROL_CONTRACT`
- `VISUAL_REVIEW_STRICT_RETAKE_AND_ANNOTATION_CONTRACT`
- `REFERENCE_INTENT_DECODER_AND_DA_SIGNAL_TRANSLATION_CONTRACT`
- `MASTERFLOW_GRAPHIC_REFINEMENT_AND_CANON_PROPORTION_CONTRACT_V2`

### B. Capacités canon prêtes à câbler

Ces contrats deviennent des critères ou modules derrière le manifest-first :

- `DA_ATOMIC_BRICK_REGISTRY_AND_COMFY_BINDING_CONTRACT`
- `DA_ENGINEERING_EXTRACTION_PROTOCOL`
- `DA_MODULAR_EXTRACTION_TAXONOMY_AND_BATCH_PROTOCOL`
- `CHARACTER_VISUAL_GENERATION_LAYER_PROTOCOL`
- `GRAPHIC_PREFERENCE_GRAPH_AND_VISUAL_CALIBRATION_TUNNEL_CONTRACT`
- `MASTERFLEX_CANON_GRAPHIC_LOCK_AND_SHARED_DA_SHIFT_CONTRACT`
- `MASTERFLEX_PROPRIETARY_DA_ACCESS_AND_ARCHIVE_CONTRACT`
- `MASTERFLOW_EXPRESSIVE_DA_BEHAVIOR_SYSTEM`
- `MASTERFLOW_VISUAL_PEDAGOGY_STRIP_AND_GRAPHIC_FACILITATION_CONTRACT`
- `PERSONAL_DA_AUTHORING_AND_MASTERLAB_EXPLOITATION_SCOPE`
- `VISUALIZATION_MODE_AND_GRAPHIC_FACILITATION_PROFILE_CONTRACT`
- `VISUAL_DIRECTOR_PREFLIGHT_SCENE_LOGIC_TEXT_AND_EXTENSIBLE_OUTPUT_CONTRACT`
- `PERSONA_VISUAL_STORYTELLING_CANON_AND_SILENT_ENTITY_ROUTING_CONTRACT`
- `STORY_DA_LAYER_AND_VISUAL_WORLD_PROFILE_CONTRACT`
- `NARRATIVE_VISUAL_COHERENCE_AND_COMFY_DECISION_CONTRACT`
- `NARRATIVE_TO_IMAGE_PAYLOAD_SCENE_ACTING_AND_PROVIDER_ROUTING_CONTRACT`
- `OURS_DOR_EVENT_DA_LAYER_CONTRACT`
- `EVENT_ASSET_UPDATE_BATCH_AND_CHARACTER_ATTRIBUTION_CONTRACT`

### C. Contrats réduits à des adapters ou extensions

Leur valeur est conservée, mais ils ne gouvernent ni le canon ni le runtime :

- `COMFY_CANONICAL_REFERENCE_RESOLUTION_AND_FEEDBACK_LEARNING_CONTRACT`
- `COMFY_CANON_BATCH_ROUTER_STATE_PACK_AND_LIVING_ASSET_CONTRACT`
- `COMFY_MINIMUM_INFORMATION_GATE_AND_COMPLETION_DIALOG_CONTRACT`
- `LOCAL_COMFY_LOW_DEF_RENDER_GOVERNANCE_CONTRACT`
- `MODULAR_DA_ROUTING_AND_COMFY_PROMPT_INJECTION_CONTRACT`
- `SHARED_DA_COMPILER_AND_VISUAL_REFERENCE_ROUTER_CONTRACT`
- `PORTABLE_VISUAL_GENERATION_PACKAGE_AND_RUNNER_ADAPTER_CONTRACT`
- `MASTERFLOW_DA_COMPONENT_ORCHESTRATION_CONTRACT`
- `MASTERFLOW_FACTORY_UPDATE_PROPAGATION_AND_GLOBAL_DA_WIRING_CONTRACT`
- `GENERATED_ASSET_RUNTIME_AND_INVENTORY_UI_MANIFEST_CONTRACT`
- `UI_VISUAL_LANGUAGE_AND_DA_APPLICATION_CONTRACT`
- `SKIN_LAYER_AND_UI_MOTION_LANGUAGE_CONTRACT`
- `PROGRESSIVE_RESPONSIVE_ASSET_PACK_AND_DENSITY_CONTRACT`
- `MASTERFLOW_DA_WHITE_LABEL_CORE_VISUAL_CONSOLE_AND_GAUGE_CONTRACT`
- `PLATFORM_ASSET_COMPILER_AND_SOCIAL_VIDEO_EXPORT_CONTRACT`
- `PLATFORM_CREATIVE_LANGUAGE_MOTION_AND_COMFY_DERIVATIVE_CONTRACT`
- `LORE_VISUAL_CLASS_AND_SOCIAL_EXPORT_CONTRACT`
- `HELPLAB_SUPPORT_MEMORY_VISUAL_FACILITATION_AND_CAREGIVER_ASSIST_CONTRACT`
- `PROGRESSION_LEAGUE_REWARD_ASSET_UNLOCK_AND_VALIDATION_CONTRACT`

### D. Capture conversationnelle à restaurer prudemment

- `CONVERSATION_TO_DA_GRAPH_AND_FEEDBACK_ROUTER_CONTRACT` → `restore_candidate` : extraction minimale, privée, sourcée, jamais canon automatique.

## Ordre runtime verrouillé

```txt
reference registry read-only
-> visual manifest draft
-> gate report / Action Ready sans provider
-> asset candidate storage
-> review / retake / rien canoniser
-> provider adapter et export seulement après gate live
```

## Alerte

Le canon DA est riche et cohérent ; le logiciel D08 reste presque entièrement à construire.
Une factory, un prompt Comfy ou une belle image ne constitue ni une implémentation ni un déploiement.
