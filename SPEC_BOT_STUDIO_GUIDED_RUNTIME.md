# SPEC — Bot Studio et Guided Runtime

Statut : `PROPOSAL / PR-0 / BLOCKED_BY_IMPLEMENTATION_GO`

Cette specification assemble des owners deja presents dans le canon MasterFlow. Elle ne cree
pas de super-engine conversationnel et n'autorise encore aucune migration, route ou UI.

## 1. Objectif

Permettre de configurer puis deployer un bot guide capable de :

- questionner progressivement un utilisateur ou un groupe ;
- remplir un objet structure (CDC, inscription, brief, estimation, cours) ;
- afficher une progression et les informations manquantes ;
- porter une persona fonctionnelle et une persona lore sans melanger leurs permissions ;
- proposer des actions, apercus ou livrables via les engines metier concernes ;
- conserver provenance, consentement, validations et traces ;
- remonter aux comptes godmode des candidats d'amelioration, jamais des modifications automatiques.

Premiers cas d'usage cibles :

1. MOTH accompagne un groupe dans la construction d'un CDC ;
2. un bot public informe et qualifie les inscriptions a l'Ours d'Or ;
3. un bot de devis filtre et precise une demande avant estimation ;
4. le Bot Studio guide son propre createur pour configurer un bot.

## 2. Decision d'architecture

Le Guided Runtime est une **recette d'orchestration**, pas un nouvel engine metier :

```text
guide
+ persona fonctionnelle
+ persona lore et etats visuels
+ engine metier
+ UI manifest
+ permissions et preflight
+ analytics
= bot deployable
```

Separation obligatoire :

| Brique | Responsabilite |
|---|---|
| `GUIDANCE_ENGINE` | choisit la prochaine question utile et la condition d'arret |
| persona fonctionnelle | methode, intention, limites et posture |
| persona lore | voix, vocabulaire, apparence et etats expressifs |
| engine metier | calcule ou valide le domaine : CDC, prix, inscription, cours |
| UI manifest | choisit widgets, jauges, boutons, apercus et surfaces |
| `permission_runtime` | decide ce que le participant peut lire ou proposer |
| `action_engine` | impose preflight, validation et execution des actions |
| Resource Truth | fournit les informations affichees comme vraies |
| analytics | observe les usages autorises sans profilage cache |
| opportunity detector | produit des candidats d'amelioration godmode |

Un persona ne donne jamais de droit. Un guide ne calcule jamais un prix et ne publie jamais
un contenu. Un LLM peut proposer une formulation, pas modifier seul l'objet structure.

## 3. Sources canoniques principales

- `04_ENGINES/GUIDANCE_ENGINE.md`
- `05_PERSONAS/BOT_RUNTIME_AND_CONVERSATIONAL_LAYER.md`
- `02_CONTRACTS/APP_CAPABILITY_GUIDANCE_AND_USER_INTERROGATION_CONTRACT.md`
- `02_CONTRACTS/FACTORY_CONVERSATIONAL_RUNTIME_CONTRACT.md`
- `02_CONTRACTS/PERSONAL_PERSONA_ASSIGNMENT_AND_CHATBOT_CONTRACT.md`
- `08_DATASETS/PERSONAL_PERSONA_ASSIGNMENT_AND_CHATBOT_PROFILE_REGISTRY.md`
- `06_WIDGETS/GUIDANCE_WIDGETS_REGISTRY.md`
- `06_WIDGETS/PERSONA_RUNTIME_STATES_AND_EXPRESSIVE_ASSET_SYSTEM.md`
- `02_CONTRACTS/OURS_DOR_BADGE_GENERATION_AND_REGISTRATION_PIPELINE_CONTRACT.md`
- `02_CONTRACTS/BUDGET_QUOTE_AND_FUTURE_INVOICE_CONTRACT.md`
- `03_APPS/QUOTE_APP_RUNTIME.md`
- `04_ENGINES/QUOTE_ENGINE.md`
- `02_CONTRACTS/OPPORTUNITY_DETECTOR_ADMIN_INBOX_CONTRACT.md`

## 4. Objets de donnees necessaires

### `conversation_guides`

Versionne la methode sans y stocker de secrets ni de prompt opaque.

```text
id, owner_id, name, purpose, domain, status
target_schema_json, question_flow_json, completion_rules_json
functional_persona_id, lore_persona_id
ui_manifest_json, analytics_policy_json, consent_policy_json
version, created_at, updated_at
```

`status` : `draft | candidate | validated | archived`.

Chaque question declare au minimum :

```text
id, target_field, trigger, answer_type, suggestions
required, allowed_hints, validation_rule, cooldown, stop_condition
```

### `guided_sessions`

Etat vivant et temporaire d'une execution de guide.

```text
id, guide_id, guide_version, owner_id, room_id
access_mode, status, current_question_id, progress_json
structured_record_json, expires_at, created_at, updated_at
```

`access_mode` : `private | class | invited | public`.
`status` : `draft | active | waiting_validation | completed | expired | revoked`.

### `guided_session_participants`

```text
session_id, user_id nullable, guest_id nullable, role
display_name nullable, consent_json, joined_at, last_seen_at
```

Un invite n'est jamais transforme implicitement en compte. L'identite minimale depend du cas
d'usage et du consentement affiche.

### `guided_contributions`

Journal structure des reponses et corrections.

```text
id, session_id, participant_ref, question_id, target_field
value_json, source, status, supersedes_id nullable, created_at
```

`status` : `candidate | accepted | rejected`. Les contributions concurrentes ne sont pas
fusionnees silencieusement ; contradictions et informations manquantes restent visibles.

### `bot_deployments`

Manifeste d'assemblage d'un bot, distinct du guide reutilisable.

```text
id, owner_id, guide_id, guide_version
functional_persona_id, lore_persona_id
domain_owner, capability_loadout_json, ui_manifest_json
access_policy_json, data_policy_json, notification_policy_json
status, version, created_at, updated_at
```

`status` : `draft | testing | validated | published | suspended | archived`.

### Extensions ulterieures

- `public_access_tokens` : invitations revocables, scopees et expirees ;
- `notification_consents` : separation transactionnel / marketing ;
- `bot_evaluation_runs` : scenarios, resultats et regressions ;
- objets metier propres aux domains : event registrations, quotes, generated asset manifests ;
- `improvement_candidates` : propositions privees reservees au godmode.

## 5. Contrat REST propose

### PR-1 privee, authentifiee

| Endpoint | Permission | Effet |
|---|---|---|
| `POST /guides` | teacher+ | cree un guide `draft` |
| `GET /guides` | owner ou admin+ | liste les guides autorises |
| `GET /guides/:id` | owner/participant autorise | lit une version autorisee |
| `PATCH /guides/:id` | owner, guide `draft` | modifie sans publier |
| `POST /guided-sessions` | teacher+ | cree une session privee |
| `GET /guided-sessions/:id` | participant autorise | lit etat/progression |
| `POST /guided-sessions/:id/answers` | participant autorise | ajoute une contribution candidate |
| `POST /guided-sessions/:id/advance` | owner/animateur | choisit la prochaine question |
| `POST /guided-sessions/:id/complete` | owner/animateur | demande la cloture |

La cloture qui publie, exporte, inscrit, envoie, chiffre un devis ou genere un asset passe par
le cycle d'action existant. `complete` ne doit pas contourner `preflight_action`.

### Extensions non incluses dans PR-1

- `/public/bots/:slug/session` et tokens d'invitation ;
- `/events/:id/registrations` ;
- `/quotes` et calcul par `QUOTE_ENGINE` ;
- `/notifications` ;
- `/assets/render-manifests` ;
- `/diagnostics/bots` et opportunites godmode.

Ces routes restent absentes du registre ou `future` tant qu'elles ne sont pas implementees et
testees.

## 6. Matrice permissions et gates

| Operation | Student | Teacher | Admin | Godmode | Gate |
|---|---:|---:|---:|---:|---|
| repondre dans une session autorisee | oui | oui | oui | oui | scope session |
| creer un guide prive | non | oui | oui | oui | owner |
| modifier un guide draft | non | owner | oui | oui | version |
| valider/publier un guide | non | non | oui | oui | preflight + validation |
| ouvrir une session classe | non | oui | oui | oui | scope classe/room |
| ouvrir un lien public | non | non | oui | oui | preflight + politique donnees |
| voir les reponses nominatives | soi | owner autorise | scope admin | oui | privacy |
| envoyer email/notification | non | non | oui | oui | consentement + preflight |
| calculer une estimation | participant | oui | oui | oui | engine source + confiance |
| emettre un devis externe | non | owner | oui | oui | validation humaine |
| proposer une amelioration | candidate | candidate | candidate | candidate | pas d'auto-merge |
| valider une amelioration globale | non | non | non | oui | inbox privee |

Les donnees personnelles sont privees par defaut. Les analytics destinees a l'animateur doivent
preferer les agregats. Aucun score cache de serieux, valeur humaine, employabilite ou qualite
d'enseignant.

## 7. Comportement conversationnel

- une question active a la fois ;
- deux suggestions maximum, plus une reponse libre si le guide l'autorise ;
- `passer` ou `plus tard` quand le champ n'est pas bloquant ;
- progression calculee depuis les champs, jamais inventee par le LLM ;
- le bot explique pourquoi une information est demandee ;
- le bot distingue information manquante, hypothese, contradiction et blocage ;
- les sources informatives viennent de Resource Truth ;
- le bot peut opposer une friction argumentee, jamais humilier ni manipuler ;
- le createur voit toujours quelles donnees sont collectees et pourquoi ;
- les regles importantes sont declaratives et testables, pas cachees dans un prompt.

## 8. UI attendue, sans implementation dans PR-0

Le premier ecran utile est l'atelier, pas une landing page :

- conversation et question active ;
- jauge de completion ;
- champs acquis, manquants et contradictoires ;
- apercu de l'objet construit ;
- sources et consentements accessibles ;
- commandes pause, reprendre, corriger, soumettre ;
- panneau de configuration reserve au createur ;
- validation separee de la publication ou de l'envoi.

Les badges, mockups, schemas et etats visuels sont des assets indexes avec manifest, owner,
scope, source et statut de validation.

## 9. Tests minimum

### PR-1

- owner peut creer et modifier son guide draft ;
- student ne peut pas creer ni lire un guide hors scope ;
- une session fige `guide_version` ;
- progression deterministe depuis `target_schema_json` ;
- une reponse cree une contribution sourcee ;
- une contradiction n'ecrase pas la valeur precedente ;
- une question non autorisee n'est jamais retournee ;
- `complete` ne publie, n'envoie et ne genere rien ;
- audit des creations, corrections et clotures ;
- suppression/expiration rend la session inaccessible.

### Avant acces public

- token expire, revoque, mauvais scope et reutilisation abusive ;
- rate limit, taille des payloads et contenu hostile ;
- consentement email absent ou retire ;
- fuite inter-session et enumeration d'identifiants ;
- retention et suppression des donnees invitees.

### Avant publication d'un bot

- scenarios de reference ;
- permissions par role ;
- hallucination de ressource ;
- arret, reprise et questions en boucle ;
- prompt injection et tentative de changement de role ;
- accessibilite clavier/mobile ;
- cout et latence.

## 10. Plan de PRs courtes

1. **PR-0 — cette spec** : mapping, gates et revue Vincent. Aucun code.
2. **PR-1 — Capability Shell privee** : schémas partages, guides draft, sessions privees,
   contributions, progression deterministe, audit. Aucun LLM requis.
3. **PR-2 — Guidance runtime** : selection de question, reprise, contradictions et UI atelier
   authentifiee. MOTH peut etre configure, sans acces public.
4. **PR-3 — Classe** : sessions groupe, animateur, agrégats, freeze/validation enseignant.
5. **PR-4 — Acces invite/public** : tokens, consentements, TTL, rate limit, moderation et
   politique de retention.
6. **PR-5 — Ours d'Or** : informations event, inscription, role, email transactionnel, badge
   candidat et export apres validation.
7. **PR-6 — Devis** : intake, `PRICE_ENGINE`/`QUOTE_ENGINE`, confiance, options, preview et
   validation humaine avant envoi.
8. **PR-7 — Assets et micro-apps** : manifests, mockups, schemas et exports.
9. **PR-8 — Evaluation et opportunites** : scenarios, analytics agregees, candidats
   d'amelioration godmode.

Chaque PR doit ajouter ses contrats partages, migration explicite, permission checks, action
registry, tests engine et statut UI. Une feature sans endpoint reel reste `future`.

## 11. Questions a trancher avant PR-1

1. `GUIDANCE_ENGINE` est-il confirme comme owner de la selection de question ?
2. Les guides appartiennent-ils d'abord a un user, une room ou une organisation future ?
3. Une session privee PR-1 accepte-t-elle uniquement des comptes authentifies ?
4. La validation d'un guide est-elle admin+ ou owner teacher pour un usage strictement prive ?
5. Quelle duree de retention par defaut pour sessions et contributions ?
6. Le schema de CDC initial vient-il d'un dataset canon existant ou d'un premier template
   candidat a valider ?

## Gate

GO MALEX de ce tour : produire et transmettre la PR-0.

Avant code, Vincent doit :

1. verifier le mapping contre le backend et les contrats actifs ;
2. repondre aux six questions ;
3. signaler les owners ou tables deja prevus ailleurs ;
4. proposer le diff exact de PR-1, migrations et tests compris.

Aucun code backend, migration, registre d'action `live`, acces public, email, collecte marketing,
devis, asset ou UI ne part sans validation humaine MALEX separee.
