# Politique V1 — changement de contexte, re-preflight et stale

Statut : `VALIDATED_V1_POLICY_NO_RUNTIME_MUTATION`

## Décision simple

Pour la V1, un changement de contexte fiable ne rend **jamais automatiquement** une action stale.
Il produit une comparaison `requires_review` et recommande un nouveau preflight humain.

Le statut `stale` reste réservé aux cas déjà explicitement bornés : hard-stop owner + Room et
expiration manuelle sélectionnée. Cette règle évite de casser silencieusement une correction ou un
feedback à cause d'une variation technique de contexte.

## Politique par famille

| Famille | Réponse V1 à un changement fiable | Auto-stale | Statut runtime |
|---|---|---|---|
| D05 sujet guidé | Revue owner puis nouveau cycle si nécessaire. | Non | Partiel, aucun re-preflight automatique. |
| D06 feedback / preview privée | Relecture enseignant et nouveau preflight recommandé. | Non | Partiel. |
| Shared Validation Inbox | L'item reste lisible ; la décision humaine reste l'autorité. | Non | Implémenté partiel. |
| D08 manifest / génération | Conserver le verrou ; compléter refs et gates avant tout provider. | Non | Futur/verrouillé. |
| Export, send, canon-write, migration | Hors V1 ou gates séparées ; ne pas introduire d'auto-stale indirect. | Non | Futur/hors scope. |
| Hard-stop explicite | Garde dédiée : stop persistant ou sélection peut rendre stale selon le contrat déjà livré. | Oui, déjà borné | Implémenté. |

## Invariants

- `requires_review` ne modifie ni l'action, ni son validation, ni un job ;
- un snapshot absent ou une source sans révision fiable donne `inconclusive` ;
- un nouveau preflight ne doit pas réactiver une action stale : un nouveau cycle explicite sera
  spécifié séparément ;
- RAG dérivé, texte de conversation et changements UI n'entraînent jamais un stale ;
- cette politique ne modifie pas la priorité du hard-stop.

## Prochaine tranche sûre

Rendre le comparateur visible dans une surface owner de lecture seule : afficher le résultat et la
prochaine action recommandée, sans bouton d'auto-re-preflight ni changement de statut.
