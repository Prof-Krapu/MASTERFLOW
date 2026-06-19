# Mémoire, relations, timeline & Version Change Ledger

Statut : `CANON_CANDIDATE_FROM_LEGACY_RECONCILIATION_WAVE_6`

## Intention produit

Donner à MasterFlow une continuité contextuelle explicable, sans transformer un
souvenir en vérité, une relation en causalité ou une version en validation.

```txt
source / event -> memory candidate -> qualified relation -> timeline entry
-> version/change entry -> Context Pack / review -> invalidation or retention
```

## Objets minimaux

| Objet | Rôle | Règle |
|---|---|---|
| `memory_record` | rappel contextuel limité et scopé | `memory != truth` |
| `memory_relation` | lien entre objets, avec type et confiance | `relation != causalité` |
| `timeline_entry` | trace ordonnée, source et portée | append-only, correction par nouvelle entrée |
| `version_change` | version, diff, remplacement, compatibilité, rollback possible | `version != validation` |
| `invalidation_event` | raison, portée, conséquence sur les nouveaux Context Packs | ne réécrit jamais un ancien résultat |
| `retention_policy` | durée, accès, archive, purge autorisée | aucune purge sans politique et traces |

## Règles de mémoire sûre

- Les records privés restent dans leur scope owner/projet/classe autorisé.
- Un record obsolète est marqué `stale` ou `revoked` ; il n'est pas servi comme
  source fiable dans un nouveau Context Pack.
- Une relation incertaine reste candidate et montre sa provenance.
- Une correction de mémoire écrit un événement de changement ; elle ne masque
  pas la trace précédente.
- Les résultats déjà validés conservent leurs références historiques et ne sont
  jamais silencieusement recompilés avec la dernière mémoire.

## Pont avec le runtime existant

Les `memory_cards`, `room_checkpoints`, `rag_context_packs` et snapshots d'action
restent des fondations utiles. Ils ne suffisent pas encore à représenter une
relation, une timeline, une compatibilité ou une politique de rétention.

La première extension runtime doit donc les référencer sans les remplacer, puis
ajouter les entrées append-only et leur read model de provenance.

## Critères de succès

- l'owner peut comprendre pourquoi une mémoire a été rappelée ou exclue ;
- un changement de source/version invalide les nouveaux runs sans altérer les
  anciens ;
- les liens entre personnes, projets et objets restent explicites et scopés ;
- aucune mémoire sensible ne fuite hors de son scope.
