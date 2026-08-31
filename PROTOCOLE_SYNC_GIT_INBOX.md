# PROTOCOLE — Sync serveur + clone local + inbox

Objectif : éviter qu'un agent confonde le clone local, un ancien état GitHub et la release qui
tourne réellement sur le serveur privé.

Ce protocole s'applique a MALEX/Codex, Vincent/Claude et tout assistant appele sur le repo.

## Regle courte

Avant toute reponse de coordination, reprise backend/frontend, run local, modification de contrat,
permission, endpoint, action, UI ou perimetre :

```bash
npm run server:preflight
git status --short --branch
git rev-parse HEAD
```

Le preflight serveur est prioritaire. Il doit confirmer le pointeur `current`, le health et les
trois conteneurs preview. Le clone local peut être en avance ou différent : cet écart est un
candidat, pas une dérive du serveur.

GitHub est en pause depuis le 2026-08-31. Ne pas lancer `git fetch`, `git push`, `gh pr` ou un merge
distant par défaut. Un contrôle GitHub n'est permis que si MALEX réactive explicitement le miroir.

## Ordre de lecture obligatoire

1. `CLAUDE.md`
2. `SUIVI.md`
3. `SYNC_THREAD_MALEX_VINCENT.md`
4. `INBOX_MALEX.md`
5. `INBOX_VINCENT.md`

Une inbox lue sans preflight serveur vaut contexte runtime incomplet. Une inbox modifiée dans le
clone reste un message local tant qu'aucun canal externe n'a été explicitement validé.

## Communication proportionnee

Le protocole ne doit pas transformer chaque message en ceremonie lourde.

| Situation | Exigence |
|---|---|
| simple diagnostic / lecture | preflight serveur, lecture des fichiers, `SERVER_SYNC_PROOF` court |
| proposition sans modification | `SYNC_PROOF` court + pas de validation humaine requise |
| modification locale non déployée | annoncer les fichiers touchés + ne pas la présenter comme live |
| commit local / merge local | validation humaine selon le Round actif |
| push/PR/merge GitHub | interdit par défaut tant que le miroir est en pause |
| run backend, URL partagee, secret, permission, endpoint sensible | validation humaine explicite avant execution |
| delta clone → serveur | le nommer candidat et citer la release active |
| message introuvable par l'autre agent | citer le canal réellement utilisé ; ne pas supposer GitHub actif |

But : moins de blocage sur les etapes de lecture, plus de preuve sur l'etat reel du repo.

## Bloc de preuve obligatoire

Toute reponse de sync doit citer :

```text
SERVER_SYNC_PROOF
- server_release_path:
- server_release_id:
- server_health:
- server_containers:
- local_branch:
- local_head:
- local_vs_server:
- fichiers_lus:
- conclusion:
```

Exemple :

```text
SERVER_SYNC_PROOF
- server_release_path: <serverRoot>/releases/preview/33f553fb8bbd
- server_release_id: 33f553fb8bbd
- server_health: ok
- server_containers: backend, frontend, export-runner actifs
- local_branch: codex/example
- local_head: abc1234
- local_vs_server: candidat local non déployé
- fichiers_lus: CLAUDE.md, SUIVI.md, inbox
- conclusion: serveur sain, clone candidat
```

## Si le clone diffère du serveur

Si le HEAD local ou les fichiers diffèrent de la release active :

- annoncer `candidat local non déployé` ;
- ne jamais prétendre que la fonction est live ;
- ne jamais modifier la release active à la main ;
- préparer un snapshot immuable, un manifeste et les preuves locales ;
- demander un GO séparé avant déploiement ou migration ;
- conserver le rollback vers la release serveur précédente.

## Message court attendu

Quand tout est aligne, une reponse peut rester courte :

```text
SERVER_SYNC_PROOF: release=33f553fb8bbd, health=ok, containers=3/3, local=abc1234.
Conclusion: serveur sain ; clone local candidat.
```

Quand le serveur n'est pas joignable, la réponse doit commencer par la limite :

```text
SERVER_SYNC_PROOF: serveur injoignable, dernière release vérifiée=33f553fb8bbd, local=abc1234.
Conclusion: vérité runtime courante inconnue ; aucune promotion implicite du clone.
```

## Statuts de messages

- `open` : demande a traiter, pas encore absorbee ;
- `answered` : reponse ou orientation posee, action peut rester a faire ;
- `done` : action integree et verifiee ;
- `blocked` : action impossible sans validation, secret, run ou decision humaine.

Une reponse IA ne vaut jamais validation humaine. Une demande deposee dans une inbox par Vincent
ou Claude ne vaut pas GO MALEX.
