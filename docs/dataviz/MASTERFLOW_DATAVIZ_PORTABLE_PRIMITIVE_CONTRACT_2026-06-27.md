# MasterFlow — Contrat Dataviz portable

Date : 2026-06-27  
Statut : candidat Git documentaire, à promouvoir canon après validation MALEX  
Portée : GitHub, Factories, futur UI runtime  

## Intention produit

MasterFlow doit afficher les données sous la forme qui aide le mieux l'utilisateur à décider, comprendre ou vérifier, sans transformer une vue en source de vérité.

Phrase canon proposée :

```txt
Même donnée, lectures différentes, vérité identique.
```

## Invariants

```txt
DATAVIZ != SOURCE DE VÉRITÉ
VUE != VALIDATION
SCORE != JUGEMENT HUMAIN
WIDGET != MOTEUR MÉTIER
GRAPHE VISIBLE != GRAPHE ÉDITABLE
DASHBOARD != PRODUIT
MISSING != 0
ESTIMATION != FAIT
SIGNAL VERT INTERDIT SI DONNÉE CRITIQUE FAIBLE OU PÉRIMÉE
```

## Objet commun : `visual_datum`

Toute donnée affichable par un widget, un export, une Factory ou une vue MasterFlow doit pouvoir être ramenée à ce modèle.

```yaml
visual_datum:
  datum_id:
  label:
  semantic_type: metric | status | event | interval | location | route | comparison | warning | graph_node | source_ref
  value:
  unit:
  value_status: observed | sourced | calculated | estimated | placeholder | missing
  formula:
  source_refs: []
  checked_at:
  freshness: current | aging | stale | unknown
  confidence: high | medium | low | unknown
  criticality: normal | important | safety_critical
  privacy_scope: public | private | project | sensitive
  owner_ref:
  missing_fields: []
  allowed_views: []
  forbidden_views: []
```

Règles :

- une valeur sans `value_status` n'est pas affichable comme vérité ;
- `missing` s'affiche comme manque, jamais comme zéro ;
- `estimated` et `calculated` exposent leurs limites ;
- `safety_critical + low/unknown/stale` interdit tout signal rassurant ;
- une agrégation conserve les références de ses composants ;
- une vue doit pouvoir ouvrir son détail source.

## Profils de visualisation

| Profil | Usage | Exemples |
|---|---|---|
| `data_viz_control` | piloter, comparer, arbitrer | métriques, heatmap, matrice, tendance |
| `graphic_facilitation` | comprendre vite | flow, carte conceptuelle, parcours, étapes |
| `hybrid_summary` | lire et agir | résumé smartphone, roadbook, fiche action |
| `audit_detail` | vérifier | sources, formules, limites, logs |

Ordre de résolution :

```txt
permission
-> sécurité
-> tâche actuelle
-> données disponibles
-> device / support
-> densité cognitive
-> préférence utilisateur
-> style
```

## Objet commun : `widget_candidate`

```yaml
widget_candidate:
  widget_id:
  widget_family: metric_card | progress_gauge | status_matrix | timeline | heatmap | table | map | graph | decision_canvas | source_strip | readiness_console
  input_data_refs: []
  visualization_profile:
  source_confidence_floor:
  freshness_requirement:
  density_cost: low | medium | high
  actionability: low | medium | high
  permission_gate:
  device_fit:
  blocked_reason:
  next_useful_action:
```

Règles :

- un widget est sélectionné parce qu'il aide maintenant ;
- aucun widget permanent sans raison contextuelle ;
- un widget ne contient pas de logique métier profonde ;
- les widgets admin/debug ne deviennent pas l'expérience normale ;
- le chat ne répète pas ce que le widget rend déjà lisible.

## Registre minimal recommandé

| Widget | Usage | Conditions |
|---|---|---|
| `metric_card` | une valeur importante | source + statut obligatoires |
| `progress_gauge` | progression bornée | formule et limite explicites |
| `status_matrix` | comparer états/risques | utile si 3+ états |
| `timeline` | événements/ordre | source et granularité |
| `heatmap` | intensité par zone/groupe | pas pour juger une personne |
| `matrix_table` | décision structurée | lisible sans surcharge |
| `source_truth_strip` | preuve et confiance | transversal |
| `readiness_console` | sortie ou action | avant export/génération/publication |
| `decision_canvas` | variantes coût/bénéfice | hypothèses visibles |
| `visual_map` | route, lieu, structure | pas de géométrie inventée |

## Backflow Factory

Une Factory qui teste une vue doit pouvoir exporter :

```yaml
dataviz_backflow_candidate:
  factory_id:
  context:
  view_or_widget:
  visual_data_refs: []
  decision_supported:
  understood_without_explanation: yes | partly | no
  source_access_used: yes | no
  density: too_low | right | too_high
  misleading_signal:
  missing_information:
  requested_change:
  reusable_primitive_candidate:
  local_only_reason:
  evidence_refs: []
  confidence:
```

Ce backflow est candidat. Il ne modifie ni canon ni runtime.

## Première implémentation recommandée

1. garder ce contrat en doc ;
2. patcher Roadtrip comme pilote ;
3. ajouter au CDC Factories ;
4. seulement ensuite créer les types shared Git ;
5. seulement ensuite créer un composant UI commun.

