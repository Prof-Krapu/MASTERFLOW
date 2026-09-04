# Pilotes conversationnels MasterFlow V1

Statut backend : déployé en preview privée dans la release `927752348efb`, provider `mock`.

Statut interface : enrichissement `1.1.0` actif en preview ; snapshot local non commité, GitHub en
pause.

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

## Interface sans provider

- la Home active expose Ours d'Or et Talents Créatifs comme deux entrées prioritaires ;
- les deux pilotes utilisent le même composant conversationnel et gardent leur identité visuelle ;
- l'état affiché vient de la projection backend du pilote, pas d'un résumé frontend inventé ;
- MasterFlex accompagne Ours d'Or ; Talents Créatifs utilise `MasterFlow System`, assistant neutre,
  jusqu'à validation d'une persona dédiée ; ProfKrapu n'est pas lié à ce pilote ;
- les amorces de conversation préparent le message sans déclencher d'action automatique ;
- le mode de préparation sans IA réelle est visible ;
- sur mobile, la conversation passe avant le contexte détaillé ;
- le retour Home change réellement de Room.

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

## Limites avant tests IRL

- aucune source réelle n'est enregistrée ;
- le provider réel, son budget et ses secrets ne sont pas configurés ;
- aucune ouverture à un groupe réel ;
- aucune promotion stable.

## Enrichissement local des parcours — 2026-09-01

Les dernières présentations fournies par MALEX ont été absorbées comme sources candidates puis
validées pour l'implémentation locale, sans devenir un canon global ni une base runtime.

- Ours d'Or `1.1.0` : sept étapes de l'inscription/zone au debrief du verdict ; format film et zones
  visibles ; dates sans année gardées `source_required` ; vote live, invités, dépôt et palmarès
  automatiques explicitement hors V1 ;
- Talents Créatifs `1.1.0` : Brief Radar, Team Build, Brief Lock, Idea Lock, Production Run et Proof
  Drop ; groupes 3–5 par défaut avec exceptions par brief ; cinq rôles de mission cumulables sans
  aucun effet de permission ; progression non notante et aucune publication automatique ;
- le read-model commun expose le parcours, les faits, responsabilités et exclusions ;
- l'étape courante peut venir d'un checkpoint privé `pilot-stage:<stage_id>` ;
- aucun provider, endpoint d'exécution, migration ou source réelle n'est ajouté.

Contrat et preuves :
`docs/pilots/OURS_DOR_TALENTS_CREATIFS_PRESENTATION_ABSORPTION_SPEC_2026-09-01.md`.
