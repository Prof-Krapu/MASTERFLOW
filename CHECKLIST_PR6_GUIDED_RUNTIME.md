# CHECKLIST PR-6 — Guided Runtime prive

Statut : `BACKEND CHECKLIST / 2026-06-13`

## Intention

Construire le shell backend qui permettra ensuite a l'UI atelier MOTH/CDC de consommer des objets
reels : guide, session, question, progression, contributions, contradictions et gates.

## Tables / migrations

### `conversation_guides`

```text
id
owner_id
name
purpose
domain
status
target_schema_id
target_schema_version
question_flow_json
completion_rules_json
functional_persona_id
lore_persona_id
ui_manifest_json
analytics_policy_json
consent_policy_json
version
created_at
updated_at
```

Statuts :

```text
draft | candidate | validated | archived
```

### `guided_sessions`

```text
id
guide_id
guide_version
owner_id
project_id nullable
room_id nullable
access_mode
status
current_question_id
progress_json
structured_record_json
expires_at
created_at
updated_at
```

### `guided_session_participants`

```text
session_id
user_id nullable
guest_id nullable
role
display_name nullable
consent_json
joined_at
last_seen_at
```

### `guided_contributions`

```text
id
session_id
participant_ref
question_id
target_field
value_json
source
status
supersedes_id nullable
created_at
```

## Contrats partages

Exposer ou ajouter :

- `ConversationGuide`
- `GuidedSession`
- `GuidedSessionParticipant`
- `GuidedContribution`
- `GuidedProgress`
- `GuidedQuestion`
- `GuidedContradiction`
- `CreateGuideRequest`
- `CreateGuidedSessionRequest`
- `SubmitGuidedAnswerRequest`

## Routes

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

## Permissions

- student : repond uniquement dans une session ou il est participant ;
- teacher+ : cree un guide draft et une session privee ;
- owner : modifie son guide draft, avance et complete ses sessions ;
- admin+ : lit/administre selon policy ;
- godmode : diagnostic autorise si deja gate par le backend ;
- persona/lore : aucun droit.

## Persona utilisateur et bot contextuel

- conserver la separation entre persona personnel de l'utilisateur et guide contextuel ;
- supporter la notion de persona contextuel assigne : prof, sujet, methode, jury ou expert ;
- MOTH n'est disponible que si assigne a l'activite/session/classe, comme check CDC ;
- Incubator peut suivre la meme logique pour Ours d'Or ;
- une session doit savoir quel guide/bot contextuel la mene ;
- une session peut exposer un `conversation_roster` borne ;
- limiter les personas contextuels actifs a 2 ou 3 par defaut ;
- chaque message doit indiquer la voix/persona qui parle si plusieurs personas sont actifs ;
- le profil utilisateur peut referencer un persona personnel sans l'appliquer a toutes les
  activites ;
- l'orchestrateur choisit les voix utiles ; tous les personas ne repondent pas a chaque tour ;
- aucune assignation de persona ou bot ne modifie les permissions runtime.

## Gates validation graduee

- creer/modifier guide draft : permission + audit ;
- creer session privee : permission + audit ;
- repondre : scope participant + audit ;
- advance : owner/animateur + audit ;
- complete prive sans publication : preflight simple + audit ;
- publier/public/export/email/event/devis/asset : hors PR-6, validation humaine si implemente plus tard.

## Tests minimum

- teacher cree guide draft ;
- student ne cree pas de guide ;
- owner modifie son draft ;
- non-owner ne lit pas un guide prive ;
- session fige `guide_version` et `target_schema_version` ;
- participant autorise repond ;
- non-participant ne repond pas ;
- progression stable entre deux lectures ;
- contradiction conserve les valeurs concurrentes ;
- advance choisit une question declaree et manquante ;
- complete ne publie, n'exporte, n'envoie et ne genere rien ;
- expiration/revocation bloque l'acces selon statut ;
- audit events emis.

## Refus immediat

- LLM obligatoire pour les tests ;
- question inventee hors `question_flow_json` ;
- progression calculee depuis un texte libre ;
- contribution qui ecrase une valeur sans trace ;
- `complete` qui declenche publication/export/email ;
- acces public ou guest anonyme ;
- bouton/contrat donnant l'impression que Ours d'Or, devis ou badges sont livres.
