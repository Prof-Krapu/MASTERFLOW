# RECETTE UI — Atelier PR-1 Guided Runtime / MOTH CDC

Statut : `UI ACCEPTANCE / WAITING BACKEND PR-1 / 2026-06-12`

## 1. Objectif

Definir l'interface minimale qui pourra etre construite **apres** livraison de la PR-1 backend
Guided Runtime.

Cette recette interdit une UI decorative ou trompeuse. L'ecran doit afficher uniquement les
objets reels exposes par le backend :

- guide ;
- session ;
- question courante ;
- progression ;
- contributions ;
- contradictions ;
- champs manquants ;
- audit/gates visibles.

## 2. Principe produit

Le premier ecran utile est un **atelier**, pas une landing page.

L'UI doit permettre a un teacher/animateur de lancer une session privee MOTH/CDC, et a un
participant authentifie de repondre sans comprendre l'architecture interne.

Elle ne doit pas promettre :

- inscription publique ;
- badge ;
- devis ;
- email ;
- asset ;
- export ;
- publication ;
- analytics godmode ;
- reponse LLM intelligente si le backend ne la fournit pas.

## 3. Surfaces minimales

### 3.1 Liste des guides

Affiche :

- nom ;
- domaine ;
- statut ;
- version ;
- owner ;
- derniere mise a jour ;
- action creer session.

Etats obligatoires :

- aucun guide disponible ;
- chargement ;
- erreur permission ;
- guide non modifiable car non-owner ;
- guide draft visible comme draft, jamais comme publie.

### 3.2 Atelier session

Disposition attendue :

```text
question courante
zone de reponse
suggestions autorisees
progression CDC
champs acquis / manquants / contradictoires
apercu structure du CDC
actions pause / enregistrer / avancer / completer
```

L'atelier doit rester dense, lisible et operationnel. Pas de hero, pas de marketing, pas de
grands textes explicatifs en pleine interface.

### 3.3 Panneau progression

Affiche uniquement les donnees backend :

- `completion_ratio` ;
- champs requis remplis ;
- champs requis manquants ;
- champs optionnels ;
- contradictions ;
- derniere contribution.

La progression ne doit jamais etre calculee par le frontend a partir de texte libre si le backend
fournit deja `progress`.

### 3.4 Apercu CDC

Affiche l'objet structure tel que renvoye par le backend.

Chaque champ doit distinguer :

- vide ;
- candidate ;
- accepte ;
- contradictoire ;
- source participant ;
- source owner ;
- derniere mise a jour.

### 3.5 Panneau gates

Affiche les operations autorisees ou bloquees :

- repondre ;
- avancer ;
- completer ;
- publier indisponible PR-1 ;
- public indisponible PR-1 ;
- export indisponible PR-1.

Le but est d'eviter qu'un utilisateur pense qu'une action non implementee est cassee.

## 4. Roles UI

| Role | Peut voir | Peut agir |
|---|---|---|
| student participant | sa session, question, progression, apercu autorise | repondre |
| teacher owner | guides owned, sessions, progression, contradictions | creer session, avancer, completer |
| admin/godmode | diagnostic et toutes sessions autorisees | revue, debug, pas de bypass silencieux |

Un persona MOTH ne donne aucun droit supplementaire.

## 5. Donnees REST consommees

L'UI attend au minimum :

```text
GET /guides
GET /guides/:id
POST /guided-sessions
GET /guided-sessions/:id
POST /guided-sessions/:id/answers
POST /guided-sessions/:id/advance
POST /guided-sessions/:id/complete
```

Le frontend ne doit pas mocker ces objets en production. En developpement, tout fixture doit etre
nomme explicitement `fixture` et ne jamais etre affiche comme donnees reelles.

## 6. Etats de session

| Etat backend | UI |
|---|---|
| `draft` | session preparee, non active |
| `active` | atelier utilisable |
| `waiting_validation` | affiche attente, aucune publication implicite |
| `completed` | lecture seule, non publiee |
| `expired` | lecture bloquee ou archivee selon permission |
| `revoked` | inaccessible |

## 7. Interactions autorisees PR-1

### Repondre

- envoie `question_id`, `target_field`, `value`, `source` ;
- affiche la contribution comme candidate ;
- recharge la session apres succes ;
- affiche les erreurs permission/backend sans inventer de recovery.

### Avancer

- reserve owner/animateur ;
- demande au backend la prochaine question ;
- ne choisit pas localement une question hors contrat.

### Completer

- affiche une confirmation simple ;
- appelle `complete` ;
- verifie que la reponse indique `published=false`, `exported=false`,
  `notification_sent=false` si ces champs existent ;
- affiche la session comme terminee non publiee.

## 8. Anti-cas UI

La couche UI est refusee si :

- elle affiche des classes, eleves, event, badges ou devis fictifs ;
- elle calcule la progression alors que le backend la fournit ;
- elle masque les contradictions ;
- elle transforme `complete` en publication ;
- elle affiche un bouton public/export/email actif ;
- elle presente un guide draft comme un bot publie ;
- elle depend d'un LLM pour fonctionner ;
- elle enterre les erreurs permission sous un message vague ;
- elle ajoute une landing page au lieu de l'atelier.

## 9. Recette manuelle

### UI-A1 — Teacher voit ses guides

- Login teacher.
- Ouvrir mode atelier guide.
- Attendu : liste de guides autorises ou etat vide clair.

### UI-A2 — Teacher cree une session privee

- Choisir guide draft.
- Creer session avec un participant.
- Attendu : atelier `active`, progression 0 ou calcul backend.

### UI-A3 — Student participant repond

- Login participant.
- Ouvrir session.
- Envoyer une reponse.
- Attendu : contribution candidate visible, progression rechargee.

### UI-A4 — Non participant bloque

- Login autre user.
- Ouvrir URL session.
- Attendu : 403/404 lisible, aucune donnee exposee.

### UI-A5 — Contradiction visible

- Soumettre deux valeurs contradictoires.
- Attendu : contradiction visible, pas d'ecrasement silencieux.

### UI-A6 — Complete reste non publie

- Teacher complete la session.
- Attendu : lecture seule, aucune action publique active.

## 10. Definition de done UI

```text
consomme endpoints reels
aucun objet fictif
roles respectes
progression backend affichee
contradictions visibles
complete non publie
etats vides/erreurs propres
build frontend OK
test manuel sur backend PR-1 OK
```

Cette UI ne devient prioritaire qu'apres validation backend de `RECETTE_PR1_GUIDED_RUNTIME.md`.

