# RECETTE — Project Scope + Template Registry

Statut : `ACCEPTANCE RECIPE / 2026-06-13`

## Perimetre

Cette recette couvre les PRs :

- PR-4 `project_scope_shell` ;
- PR-5 `template_schema_registry`.

Elle valide les fondations, pas les verticales finales.

## PR-4 — scenarios Project / Scope / Ownership

### P1 — Creation projet prive

Un `teacher+` cree un projet. Le projet est prive par defaut, l'utilisateur devient owner/member,
et un audit event est emis.

### P2 — Liste bornee par membership

Un user authentifie ne voit que les projets dont il est owner ou membre. Les projets hors scope
n'apparaissent pas.

### P3 — Detail non-membre refuse

Un non-membre tente de lire `GET /api/v1/projects/:id`. La reponse refuse l'acces sans exposer de
donnees sensibles.

### P4 — Ajout membre par owner/admin

Un owner/admin ajoute un membre. Le membre voit ensuite le projet avec le role attendu.

### P5 — Ajout membre refuse

Un viewer/participant tente d'ajouter un membre. La requete est refusee.

### P6 — Resource scope bloque la fuite

Une ressource rattachee a un projet A ne peut pas etre lue via un projet B ou par un non-membre.

### P7 — Persona sans droit

Un persona ou role lore ne donne aucun droit s'il n'est pas traduit en permission runtime reelle.

## PR-5 — scenarios Template / Schema Registry

### T1 — Liste templates autorises

Un user authentifie liste les templates autorises. Les templates prives hors scope ne fuitent pas.

### T2 — Creation candidat

Un `teacher+` cree un template. Le statut initial est `candidate`.

### T3 — Validation refusee au student

Un student tente de valider un template. La requete est refusee.

### T4 — Validation admin

Un admin+ valide un template candidat. Le statut devient `validated` et un audit event est emis.

### T5 — Schema invalide refuse

Un template avec schema invalide ou champs requis incoherents est refuse.

### T6 — Version figee

Une session ou un objet consommateur conserve `template_id` + `version`. Une modification de
schema n'altre pas silencieusement les objets deja crees.

### T7 — Deprecated masque par defaut

Un template `deprecated` n'est pas retourne/utilise par defaut pour creer de nouveaux objets.

### T8 — Public exige validated

Toute surface publique, exportable ou partageable refuse un template non valide.

## Refus immediat

- projet public par defaut ;
- liste globale de tous les projets ;
- non-membre capable de lire un detail projet ;
- template candidat traite comme canonique ;
- schema modifie sans nouvelle version ;
- LLM autorise a changer la structure ;
- absence de test permissionnel ;
- absence d'audit sur membership ou validation.

## Sortie attendue de Vincent

Pour chaque PR :

- diff backend exact ;
- migration ;
- contrats partages ;
- routes ;
- tests executes ;
- ecarts eventuels avec cette recette ;
- note courte dans `SUIVI.md`.
