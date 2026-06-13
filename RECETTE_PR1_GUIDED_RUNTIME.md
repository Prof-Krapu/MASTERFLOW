# RECETTE — PR-1 Guided Runtime prive / MOTH CDC

Statut : `ACCEPTANCE TESTS / MALEX / 2026-06-12`

## 1. Objectif de la recette

Verifier que la PR-1 Guided Runtime livre un **capability shell prive** compatible MasterFlow,
sans UI finale, sans acces public, sans LLM obligatoire et sans publication.

La PR est acceptee seulement si elle prouve :

- guides versionnes en draft ;
- sessions privees authentifiees ;
- contributions sourcees ;
- progression deterministe ;
- permissions owner/participant ;
- audit ;
- validation graduee, sans double validation systematique ;
- aucune action externe ou sensible declenchee implicitement.

## 2. Hors perimetre bloque

La PR-1 est refusee si elle inclut :

- lien public, invite anonyme ou inscription event ;
- email, notification externe ou collecte marketing ;
- devis, prix, facture ou paiement ;
- generation asset, badge, sticker ou image ;
- publication d'un guide ;
- analytics nominatifs godmode ;
- LLM obligatoire pour passer les tests ;
- UI finale ou page marketing ;
- nouveau super-engine au lieu d'une composition autour de `GUIDANCE_ENGINE`.

## 3. Donnees attendues

### Tables minimales

```text
conversation_guides
guided_sessions
guided_session_participants
guided_contributions
```

### Seed attendu

Un template CDC candidat, versionne et non canonique :

```json
{
  "id": "cdc-template-candidate-v1",
  "status": "candidate",
  "domain": "cdc",
  "version": 1
}
```

Le template doit contenir au minimum :

```text
contexte
objectif
public_cible
livrables
contraintes
references
criteres_reussite
inconnues
```

## 4. Endpoints attendus

Base : `/api/v1`.

| Endpoint | Statut attendu | Permission |
|---|---|---|
| `POST /guides` | cree un guide `draft` | teacher+ |
| `GET /guides` | liste les guides autorises | owner/admin |
| `GET /guides/:id` | lit un guide autorise | owner/admin |
| `PATCH /guides/:id` | modifie un draft | owner/admin |
| `POST /guided-sessions` | cree une session privee | teacher+ owner |
| `GET /guided-sessions/:id` | lit etat/progression | participant/owner/admin |
| `POST /guided-sessions/:id/answers` | ajoute une contribution candidate | participant autorise |
| `POST /guided-sessions/:id/advance` | calcule la prochaine question | owner/animateur |
| `POST /guided-sessions/:id/complete` | cloture sans publier | owner/animateur |

Si Vincent choisit des noms legerement differents, il doit fournir une table d'equivalence et
garder le contrat partage type.

## 5. Payloads de reference

### Creer un guide draft

```json
{
  "name": "MOTH CDC - atelier prive",
  "purpose": "Aider un groupe a structurer un cahier des charges",
  "domain": "cdc",
  "target_schema_id": "cdc-template-candidate-v1",
  "functional_persona_id": "moth-functional-cdc",
  "lore_persona_id": "moth-lore",
  "room_id": null
}
```

Attendu :

```json
{
  "status": "draft",
  "version": 1,
  "owner_id": "<current_user_id>"
}
```

### Creer une session privee

```json
{
  "guide_id": "<guide_id>",
  "access_mode": "private",
  "participant_user_ids": ["<student_user_id>"]
}
```

Attendu :

```json
{
  "status": "active",
  "guide_version": 1,
  "access_mode": "private",
  "progress": {
    "completion_ratio": 0,
    "missing_fields": ["contexte", "objectif", "public_cible", "livrables"]
  }
}
```

### Repondre a une question

```json
{
  "question_id": "q_objectif",
  "target_field": "objectif",
  "value": "Construire une identite visuelle pour le concours de l'Ours d'Or",
  "source": "participant"
}
```

Attendu :

```json
{
  "status": "candidate",
  "target_field": "objectif",
  "source": "participant"
}
```

La contribution ne doit pas ecraser silencieusement une valeur precedente.

### Cloturer sans publier

```json
{
  "note": "Atelier termine, CDC pret pour revue humaine."
}
```

Attendu :

```json
{
  "status": "completed",
  "published": false,
  "exported": false,
  "notification_sent": false
}
```

## 6. Scenarios d'acceptation

### A1 — Teacher cree un guide draft

- Login teacher.
- `POST /guides`.
- Attendu : 201, `status=draft`, owner = user courant.
- Audit attendu : `guide_created`.

### A2 — Student ne cree pas de guide

- Login student.
- `POST /guides`.
- Attendu : 403.
- Aucun guide cree.

### A3 — Owner modifie son draft

- Login teacher owner.
- `PATCH /guides/:id`.
- Attendu : 200, version incrementee ou `updated_at` modifie.
- Audit attendu : `guide_updated`.

### A4 — Non-owner ne lit pas un guide prive

- Login autre teacher ou student non participant.
- `GET /guides/:id`.
- Attendu : 403 ou 404 anti-enumeration.

### A5 — Session fige la version du guide

- Creer guide v1.
- Creer session.
- Modifier guide vers v2.
- Lire session.
- Attendu : `guide_version=1`.

### A6 — Participant autorise repond

- Login participant.
- `POST /guided-sessions/:id/answers`.
- Attendu : contribution `candidate`, audit `guided_contribution_created`.

### A7 — Non-participant ne repond pas

- Login user hors session.
- `POST /guided-sessions/:id/answers`.
- Attendu : 403 ou 404.

### A8 — Progression deterministe

- Soumettre des reponses pour 3 champs requis sur 8.
- Lire session.
- Attendu : progression calculee depuis les champs, pas depuis un texte LLM.
- Le ratio doit etre stable entre deux lectures sans nouvelle contribution.

### A9 — Contradiction visible

- Soumettre deux valeurs incompatibles pour le meme champ.
- Attendu : pas d'ecrasement silencieux ; contradiction ou alternatives visibles.

### A10 — Advance ne pose pas une question hors scope

- Appeler `advance`.
- Attendu : prochaine question cible un champ manquant, autorise et declare dans le guide.
- Jamais de question inventee hors `question_flow_json`.

### A11 — Complete ne publie rien

- `POST /guided-sessions/:id/complete`.
- Attendu : session `completed`, aucun export, email, event, asset, devis ou publication.
- Gate : preflight simple + audit, sans double validation humaine.

### A12 — Expiration appliquee

- Session inactive au-dela de la retention configuree.
- Attendu : inaccessible ou `expired`, selon implementation.

## 7. Tests minimum a livrer

Tests backend obligatoires :

- creation guide teacher+ ;
- refus creation guide student ;
- lecture/modification owner ;
- refus lecture non-owner ;
- session fige `guide_version` ;
- contribution participant autorise ;
- refus contribution non-participant ;
- progression deterministe ;
- contradiction sans ecrasement ;
- `complete` ne publie ni n'exporte ;
- audit des creations/modifications/contributions/clotures ;
- expiration ou retention testee au niveau engine si possible.

Tests non requis en PR-1 :

- LLM ;
- WebSocket ;
- acces public ;
- email ;
- UI finale ;
- rendu visuel.

## 8. Criteres de refus immediat

La PR est refusee si :

- un student peut creer un guide ;
- un non-participant peut lire ou repondre a une session privee ;
- `complete` declenche publication/export/envoi ;
- la progression depend d'un texte genere ;
- une contradiction ecrase silencieusement l'information precedente ;
- une action sensible passe sans preflight ;
- le backend invente une ressource vraie sans Resource Truth ;
- les tests passent seulement avec un provider LLM externe.

## 9. Definition de done

La PR-1 est done quand :

```text
schemas partages ajoutes
migrations idempotentes ajoutees
routes privees montees
permission owner/participant prouvee
progression deterministe prouvee
audit prouve
tests backend verts
lint vert
aucun scope public
aucune UI finale
```

La surface UI pourra venir ensuite, uniquement sur les objets reels livres par cette PR.

