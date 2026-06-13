# SPEC — Task-aware Model Routing et Egress PR-CB2

Statut : `FOUNDATION IMPLEMENTED / FAIL-CLOSED / 2026-06-13`

## Objectif

Empêcher le runner LLM de choisir silencieusement un provider incompatible avec la tâche, la
privacy ou les sorties réseau autorisées.

```text
tâche déclarée
-> profil validé unique
-> provider serveur autorisé
-> privacy compatible
-> origine egress allowlistée
-> appel OpenAI-compatible
```

Le persona ne choisit jamais le provider et ne modifie aucune permission.

## Comportement

### Mode mock

- disponible sans profil validé ;
- aucun appel réseau ;
- comportement de développement existant conservé.

### Provider externe

Le runner exige :

1. une tâche appartenant au contrat `LLMTaskSchema` ;
2. exactement un `TaskModelProfile` validé pour cette tâche ;
3. le provider configuré dans `allowed_providers` ;
4. sa présence dans `fallback_order` lorsque cette liste n'est pas vide ;
5. une configuration serveur complète : clé, modèle et base URL ;
6. une origine exacte présente dans `LLM_EGRESS_ALLOWLIST` ;
7. HTTPS, sauf HTTP loopback explicitement allowlisté ;
8. aucune credential, query ou fragment dans l'URL ;
9. une destination loopback si le profil est `local_only`.

Tout écart bloque l'appel avant `fetch`.

## Source de vérité

- tâches et profils : `packages/shared/src/index.ts` ;
- profils validés : table `task_model_profiles` ;
- config active et secrets : environnement serveur uniquement ;
- gate : `apps/backend/src/services/llm_routing.ts` ;
- runner : `apps/backend/src/services/llm.ts`.

## Configuration

```env
LLM_PROVIDER=provider-approved
LLM_API_KEY=...
LLM_BASE_URL=https://llm.example.test/v1
LLM_MODEL=model-approved
LLM_EGRESS_ALLOWLIST=https://llm.example.test
```

L'allowlist contient des origines, séparées par des virgules. Les secrets ne sont jamais stockés
dans un profil de tâche ni journalisés.

## Limites assumées

- une seule configuration provider active dans cette tranche ;
- aucune bascule automatique entre plusieurs credentials ;
- `fallback_order` est vérifié mais pas encore exécuté ;
- `max_cost_eur` et `max_latency_ms` restent déclaratifs tant que budget preflight et timeout
  abortable ne sont pas livrés ;
- aucun endpoint d'administration des profils ;
- la validation d'un profil reste un futur geste sensible séparé.

Un vrai fallback multi-provider exigera un registre serveur de providers, des secrets séparés,
une politique de retry et des tests de panne. PR-CB2 ne simule rien de cela.
