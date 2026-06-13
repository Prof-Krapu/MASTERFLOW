# HANDOFF VINCENT — PR-6 Guided Runtime prive

Statut : `HANDOFF BACKEND / 2026-06-13`

## Objectif

Livrer la premiere tranche backend du Guided Runtime : un atelier prive MOTH/CDC capable de
creer un guide draft, ouvrir une session authentifiee, collecter des contributions et calculer
une progression deterministe.

PR-6 ne doit pas devenir un bot public, un event, un devis ou un moteur LLM autonome.

## References

- `SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`
- `RECETTE_PR1_GUIDED_RUNTIME.md`
- `RECETTE_UI_PR1_GUIDED_RUNTIME.md`
- `POLITIQUE_VALIDATION_GRADUEE.md`
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md`
- `SPEC_TEMPLATE_SCHEMA_REGISTRY.md`

## Dependances attendues

Si PR-4/PR-5 sont disponibles :

- rattacher les guides/sessions a un project/scope ;
- utiliser `schema_templates` avec `template_id` + `version` figes en session ;
- refuser les templates publics non `validated`.

Si PR-4/PR-5 ne sont pas encore merges :

- garder les champs `owner_id`, `target_schema_id`, `target_schema_version` ;
- eviter tout couplage temporaire difficile a migrer ;
- documenter la table d'equivalence future.

## Perimetre PR-6

Livrer uniquement :

- `conversation_guides` ;
- `guided_sessions` ;
- `guided_session_participants` ;
- `guided_contributions` ;
- endpoints `/api/v1/guides` et `/api/v1/guided-sessions` ;
- progression calculee depuis les champs requis ;
- contradictions visibles, jamais ecrasees silencieusement ;
- audit creations, updates, contributions, advance et complete ;
- gates PR-1 selon validation graduee.

## Hors perimetre

Interdit dans cette PR :

- lien public ;
- invite anonyme ;
- inscription Ours d'Or ;
- email ou notification externe ;
- devis, prix, facture, paiement ;
- badge, sticker, asset ou image ;
- publication de guide ;
- analytics nominatives godmode ;
- LLM obligatoire pour passer les tests ;
- UI finale.

## Routes minimales

```text
POST /api/v1/guides
GET /api/v1/guides
GET /api/v1/guides/:id
PATCH /api/v1/guides/:id
POST /api/v1/guided-sessions
GET /api/v1/guided-sessions/:id
POST /api/v1/guided-sessions/:id/answers
POST /api/v1/guided-sessions/:id/advance
POST /api/v1/guided-sessions/:id/complete
```

Si les noms changent, fournir une table d'equivalence dans la PR.

## Regle de gameplay

MOTH peut avoir une voix et un style, mais le runtime doit rester testable :

```text
question declaree
champ cible
reponse sourcee
progression calculee
contradiction visible
complete sans effet externe
```

Le lore met du sel dans la room. Il ne touche jamais aux permissions.

## Acceptation

La PR est acceptee si `RECETTE_PR1_GUIDED_RUNTIME.md` passe ou si les ecarts sont documentes,
raisonnes et valides humainement.

La PR est refusee si elle donne l'impression qu'un bot public ou une verticale complete est
livree alors que seul le runtime prive existe.
