# Arbitrage D08 — DA, références et assets — 2026-06-20

## Décision structurante

La DA legacy contient bien les briques que tu craignais de perdre : séparation core/propriétaire/
event, références typées, manifest, validation, review et render non automatique. Elles sont
**raccordées au canon D08**, mais leur runtime logiciel reste volontairement non livré.

| Preuve legacy | Décision | État vérifié |
|---|---|---|
| `MASTERLAB_APP_RUNTIME` | `canon_ready` | MasterLab compile, ne génère pas ; contrat D08 et manifest-first présents, UI/runtime absents |
| `MASTERLAB_PRODUCTION_PIPELINE_IMPLEMENTATION` | `restore_candidate` | batch, rollback et production multi-assets à restaurer seulement après registry/review |
| `MASTERFLEX_APP_RUNTIME` | `reduced` | guidance/persona séparée de la DA propriétaire ; affectations et coaching runtime incomplets |
| `OURS_DOR_APP_RUNTIME` | `future` | conservé comme couche événementielle D10/D08, jamais DA globale |
| `MOTION_PIPELINE_AND_RENDER_WORKFLOW_SYSTEM` | `future` | pipeline de production cadré, aucun runner rendu MasterFlow à annoncer |
| `COMFY_CANONICAL_REFERENCE_RESOLUTION...` | `canon_ready` | successeur : Canonical Reference Resolver & Asset Registry ; persistance/résolution runtime absentes |
| `GENERATED_ASSET_RUNTIME_AND_INVENTORY_UI_MANIFEST...` | `canon_ready` | manifest-first D08 conservé ; lifecycle asset/UI runtime absent |
| `MASTERFLOW_CORE_DA_ROOT_CONTRACT` | `absorbed` | hiérarchie core/propriétaire/event reprise dans le Domain Card D08 |
| `MODULAR_DA_ROUTING_AND_COMFY_PROMPT_INJECTION...` | `reduced` | principe manifest + permission + validation conservé ; payload complet/adapters non réimplémentés |

## Chaîne à livrer, dans cet ordre

```txt
registre de références typées et permissionnées
-> manifest immuable de génération
-> review/candidate asset
-> projection UI read-only
-> provider/rendu uniquement après validation explicite
```

Il n'existe donc pas de perte de vision DA dans le canon, mais il serait faux de dire que le
logiciel sait déjà générer, stocker, revoir et réutiliser ces assets.
