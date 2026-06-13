# RECETTE — PR-6 Guided Runtime avec dependances scope/template

Statut : `ACCEPTANCE RECIPE / 2026-06-13`

## Objectif

Completer `RECETTE_PR1_GUIDED_RUNTIME.md` avec les points de jonction vers PR-4
`project_scope_shell` et PR-5 `template_schema_registry`.

Cette recette evite que le runtime guide fonctionne en silo.

## Scenarios de dependance

### D1 — Guide rattache a un owner/scope

Un teacher cree un guide draft. Le guide porte au minimum `owner_id`. Si PR-4 est disponible, il
porte aussi un rattachement projet/scope autorise.

Attendu : un non-owner hors scope ne lit pas le guide.

### D2 — Session rattachee au guide versionne

Une session creee depuis un guide conserve :

```text
guide_id
guide_version
target_schema_id
target_schema_version
```

Modifier le guide ou le template ensuite ne change pas silencieusement la session.

### D3 — Template candidat accepte en prive

Le template CDC `candidate` peut etre utilise dans une session privee authentifiee pour le test
MOTH/CDC, mais ne doit pas etre presente comme canonique ou public.

### D4 — Template non valide refuse pour public

Toute tentative d'utiliser un template non `validated` pour une surface publique, exportable ou
partageable est refusee ou absente du registre.

### D5 — Progression issue du schema

La progression utilise les champs requis du template ou du `target_schema` fige, pas un resume
LLM.

### D6 — Resource Truth non contournee

Si le guide affiche une information factuelle, elle doit venir d'une source verifiee ou etre
marquee comme hypothese/contribution. MOTH ne transforme pas une hypothese en verite.

### D7 — Aucun effet externe sur complete

`complete` marque la session comme terminee privee. Il ne publie pas, n'inscrit personne,
n'envoie pas de mail, ne genere pas d'asset et ne cree pas de devis.

## Donnees minimales visibles pour UI future

La reponse `GET /guided-sessions/:id` doit contenir assez de donnees pour eviter les mocks :

```text
session id/status/access_mode
guide id/name/version/domain/status
current_question
progress completion_ratio/missing_fields/contradictions
structured_record
contributions ou resume source
allowed_actions/gates si disponible
```

Si le backend ne renvoie pas encore `allowed_actions`, l'UI devra se limiter aux endpoints
testes et statuts explicites.

## Refus immediat

- session qui perd la version du guide ;
- session qui ne sait pas quel schema elle remplit ;
- template candidat utilise comme public ;
- progression non deterministe ;
- question hors flow ;
- effet externe sur `complete` ;
- donnees factuelles affichees sans source ni statut.
