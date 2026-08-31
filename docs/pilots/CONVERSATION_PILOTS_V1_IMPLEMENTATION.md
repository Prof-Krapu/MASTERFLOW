# Pilotes conversationnels MasterFlow V1

Statut : implémentation locale candidate, provider `mock`, aucun déploiement.

## Contrat produit

Ours d'Or et Talents Créatifs partagent le backend, l'authentification, les permissions, le
Conversation Turn Orchestrator, Source/Intake, les checkpoints et les validations. Ils ne partagent
ni leur namespace de sources ni leur RuntimePack.

| Pilote | RuntimePack | Namespace | Politique de livrable |
|---|---|---|---|
| Ours d'Or | `ours-dor-pilot-v1` | `ours-dor` | guidance uniquement |
| Talents Créatifs | `talents-creatifs-pilot-v1` | `talents-creatifs` | guidance uniquement |

## Tour de conversation

Ordre natif : authentification/scope, compilation du contexte, pack actif, diagnostic de processus,
routage doux, intégrité pédagogique, permissions, registre d'actions, capacité bornée, validation et
observabilité.

Routes supportées par contrat : `answer`, `guide`, `observe`, `propose`, `clarify`,
`prepare_action`, `await_approval`, `execute_approved`, `handoff`, `escalate` et `debrief`.
La V1 utilise effectivement `answer`, `guide`, `propose`, `clarify`, `prepare_action`,
`await_approval` et `escalate`; les autres restent des sorties contractuelles sans exécution
automatique.

## Surfaces

- `POST /api/v1/conversation/turns/plan` : plan structuré, aucune action exécutée ;
- WebSocket `/ws/{room_instance_id}` : reçoit le RuntimePack et applique le plan avant le LLM ;
- `POST/GET /api/v1/source-intake` : simulation ou manifeste candidat ;
- `GET /api/v1/pilots/{pack}/state` : projet, étape, sources visibles, checkpoint et prochaine action ;
- `POST /api/v1/pilots/{pack}/harvest/preview` : extraction finale hashable et backflow candidat ;
- interface minimale : sélection de Room, projet, étape, sources, prochaine action, validations et chat.

## Invariants prouvés

- le rôle vient de l'authentification ;
- un pack ne s'active que dans une Room qui le déclare ;
- une source doit appartenir au namespace, au rôle visible et au registre Source/Intake ;
- une source `team` Talents n'est pas visible par un étudiant ;
- une question simple reste simple ;
- un signal ambigu demande une clarification ;
- le livrable final étudiant n'est pas produit ;
- une action sensible reste suspendue ;
- le harvest reste candidat et exige une revue humaine.

## Limites avant preview

- aucune source réelle n'est enregistrée ;
- le provider réel, son budget et ses secrets ne sont pas configurés ;
- aucune migration n'est appliquée hors des bases de test en mémoire ;
- aucune ouverture à un groupe réel ;
- aucun déploiement preview ou stable.
