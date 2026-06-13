# PROTOCOLE — Revue des PRs Vincent

Statut : `REVIEW PROTOCOL / 2026-06-13`

## 1. Objectif

Auditer chaque PR backend de Vincent de maniere stable, sans improviser la definition de done a
chaque tour.

## 2. Ordre de revue

1. Lire `SUIVI.md`, `INBOX_MALEX.md`, `INBOX_VINCENT.md`, `SYNC_THREAD_MALEX_VINCENT.md`.
2. Verifier la branche et les commits.
3. Lire la spec liee a la PR.
4. Lire la recette liee a la PR.
5. Lire le diff code.
6. Verifier migrations, schemas shared, routes, engines/services, tests.
7. Lancer tests/lint pertinents.
8. Produire verdict.

## 3. Verdicts possibles

```text
ACCEPT
ACCEPT_WITH_NOTES
REQUEST_CHANGES
BLOCKED_BY_SCOPE
REJECT_UNSAFE
```

## 4. Bloquants generiques

- endpoint sans permission ;
- action sensible sans preflight ;
- validation humaine contournee ;
- statut `live` sans test ;
- UI ou contrat qui invente une feature ;
- secret dans repo, logs ou fixtures ;
- mutation Drive/Git non autorisee ;
- donnees personnelles exposees ;
- runner/connecteur puissant branche sans gateway ;
- absence de recette ou tests minimum.

## 5. Checklist par PR

```text
spec citee
recette citee
schemas partages
migration idempotente
routes gates
engines/services bornes
tests positifs
tests refus permission
tests refus scope
audit logs
SUIVI mis a jour
aucun secret
aucune UI deceptive
```

## 6. Format de retour

```text
Verdict :
Commit audite :
Specs/recettes utilisees :
Checks lances :
Findings bloquants :
Findings non bloquants :
Risques residuels :
Decision MALEX requise :
```

## 7. Regle de protection

Une PR qui fait plus que son scope doit etre scindee. Une bonne PR MasterFlow a une intention
claire, une migration explicite, des tests minimum et aucun raccourci de permission.

