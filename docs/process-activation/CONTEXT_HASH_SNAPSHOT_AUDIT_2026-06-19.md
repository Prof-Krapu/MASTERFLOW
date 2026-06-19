# Audit context-hash snapshots et re-preflight — 2026-06-19

Statut : `READ_ONLY_SNAPSHOT_RUNTIME_IMPLEMENTED_LOCAL`

Mise à jour : MALEX a validé la tranche read-only par `next`. Le runtime capture un snapshot
privé au preflight sensible avec Room et expose la comparaison sans aucune mutation d'action.

## Diagnostic simple

MasterFlow compile déjà le contexte utile d'une Room : owner, projet, Room, instance, checkpoint,
mémoire autorisée, permissions, loadout et parfois un pack RAG. Mais le cycle d'action ne conserve
pas l'état exact utilisé au moment du preflight. Il ne peut donc pas dire honnêtement si le contexte
a réellement changé depuis.

Un hash posé trop vite serait dangereux : certaines sources n'ont pas de version universelle et le
RAG est dérivé, donc variable. Il risquerait de geler des actions correctes ou de rater un vrai
changement de source.

## Sources canon et runtime relues

- Canon : `ACTION_EXPIRES_AFTER_CONTEXT_CHANGE` demande un snapshot, un hash et une décision
  stale ou re-preflight après changement important.
- Canon D08 : un snapshot immuable de génération est explicitement absent ; aucune génération ne
  doit s'ouvrir sur cette lacune.
- Runtime : `context_compiler.ts` assemble le contexte courant, mais n'expose aucun fingerprint
  stable ni révision de toutes les sources.
- Runtime : `actions.preflight_json` conserve la décision de preflight, pas son contexte source.
- Runtime : `room_checkpoints`, `memory_cards` et les références RAG existent, mais leurs formats
  et leurs versions ne forment pas encore un registre de révision commun.

## Matrice canon → GitHub ciblée

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Snapshot au preflight | absent | L'action ne conserve pas la Room, les refs et le checkpoint utilisés. | élevé | Créer un snapshot privé immuable par action, pas une copie de contenus bruts. |
| Empreinte de contexte | absent | `compiled_at` change à chaque compilation et ne peut pas servir de hash. | élevé | Hasher une représentation normalisée, versionnée et triée. |
| Révision des sources | partiel | Certains objets ont `updated_at`, d'autres n'ont qu'une référence ou un statut. | élevé | Ne comparer automatiquement que les références avec une révision fiable. |
| RAG dérivé | présent mais variable | Un nouveau résultat RAG n'est pas forcément un changement produit. | moyen | Exclure le contenu RAG du premier hash ; garder sa ref comme preuve de lecture. |
| Re-preflight | absent | Aucun comparateur ni statut de revue. | moyen | Commencer par un preview read-only `unchanged / requires_review / inconclusive`. |
| Mise stale automatique | absent | Aucun seuil produit fiable. | élevé | Interdite dans la première tranche context-hash. |

## Contrat candidat recommandé

### Snapshot minimal au moment du preflight

```yaml
action_context_snapshot:
  schema_version: 1
  action_id:
  owner_id:
  project_id:
  room_id:
  room_instance_id:
  action_intent:
  action_payload_fingerprint:
  authoritative_refs:
    - ref_type:
      ref_id:
      revision_ref:
  checkpoint_ref:
  hard_stop_state_ref:
  context_fingerprint:
  created_at:
```

Règles :

- ne jamais stocker le contenu brut d'une conversation, d'un RAG ou d'une source privée dans le
  hash ;
- `authoritative_refs` sont triées et normalisées avant calcul ;
- `compiled_at`, le contenu du RAG et les champs UI volatils sont exclus ;
- une source sans `revision_ref` fiable rend le résultat `inconclusive`, jamais automatiquement
  stale ;
- le hard-stop reste une garde indépendante : il ne dépend pas de ce hash.

### Comparateur read-only recommandé

```yaml
context_comparison:
  action_id:
  snapshot_status: found | absent
  comparison: unchanged | requires_review | inconclusive
  changed_refs: []
  missing_revision_refs: []
  recommended_next_step: none | re_preflight | owner_review
  mutation: false
```

## Décisions produit encore nécessaires avant runtime

1. Une modification de source fiable doit-elle rendre l'action `stale` directement, ou seulement
   exiger un nouveau preflight ?
2. Quelles familles sont assez critiques pour un stale automatique : export/send/canon-write
   seulement, ou aussi correction et feedback ?
3. Le snapshot s'attache-t-il à toute action sensible ou uniquement aux actions portant des refs
   source explicites ?

## Recommandation

Commencer par **snapshot + preview read-only sur les seules actions sensibles possédant une Room et
des références autoritatives versionnables**. Le résultat ne change aucun statut. Après des recettes
réelles, décider séparément les familles éligibles à `stale` automatique.

## Stop rule

Le snapshot et le comparateur read-only sont maintenant autorisés et implémentés. Restent interdits
sans décision produit dédiée : stale automatique, re-preflight automatique et interprétation des
sources sans révision fiable. Le hard-stop Room reste le seul blocage runtime automatique.
