# PROTOCOLE — Sync Git + inbox

Objectif : eviter qu'un agent lise une vieille branche, un clone non fetch, ou une inbox locale
obsolète et conclue a tort qu'aucun message n'existe.

Ce protocole s'applique a MALEX/Codex, Vincent/Claude et tout assistant appele sur le repo.

## Regle courte

Avant toute reponse de coordination, reprise backend/frontend, run local, modification de contrat,
permission, endpoint, action, UI ou perimetre :

```bash
git fetch --all --prune
git status --short --branch
git rev-list --left-right --count HEAD...origin/main
git log --oneline --decorate -5 origin/main
```

Si `gh` est disponible et authentifie, verifier aussi l'etat GitHub distant. Ce check ne remplace
pas Git, il sert a prouver que l'agent regarde le depot public attendu et pas seulement un clone
local :

```bash
gh auth status
gh repo view Prof-Krapu/MASTERFLOW --json nameWithOwner,defaultBranchRef,pushedAt,url
gh api repos/Prof-Krapu/MASTERFLOW/commits/main --jq '{sha: .sha, date: .commit.committer.date}'
```

Ensuite lire les fichiers depuis la ref la plus a jour. Si `HEAD` differe de `origin/main`, ne
pas conclure depuis les fichiers locaux sans lire aussi la version distante :

```bash
git show origin/main:SUIVI.md
git show origin/main:SYNC_THREAD_MALEX_VINCENT.md
git show origin/main:INBOX_MALEX.md
git show origin/main:INBOX_VINCENT.md
```

## Ordre de lecture obligatoire

1. `CLAUDE.md`
2. `SUIVI.md`
3. `SYNC_THREAD_MALEX_VINCENT.md`
4. `INBOX_MALEX.md`
5. `INBOX_VINCENT.md`

Une inbox lue sans `git fetch` prealable vaut contexte incomplet.
Une inbox modifiee localement mais non commit/push vaut message non transmis : Vincent/Claude ne
peut pas la voir, meme si Codex local la lit.

## Communication proportionnee

Le protocole ne doit pas transformer chaque message en ceremonie lourde.

| Situation | Exigence |
|---|---|
| simple diagnostic / lecture | `fetch`, lecture des fichiers, `SYNC_PROOF` court |
| proposition sans modification | `SYNC_PROOF` court + pas de validation humaine requise |
| modification locale non publiee | annoncer les fichiers touches + pas de commit/push sans GO |
| commit/push/merge/rebase | validation humaine MALEX explicite |
| run backend, URL partagee, secret, permission, endpoint sensible | validation humaine explicite avant execution |
| divergence Git | lire `origin/main:<fichier>` avant toute conclusion |
| message introuvable par l'autre agent | citer la branche distante lue + dernier SHA GitHub/`origin/main` + statut commit/push |

But : moins de blocage sur les etapes de lecture, plus de preuve sur l'etat reel du repo.

## Bloc de preuve obligatoire

Toute reponse de sync doit citer :

```text
SYNC_PROOF
- local_branch:
- local_head:
- origin_main:
- github_main:
- head_vs_origin_main:
- fichiers_lus:
- conclusion:
```

Exemple :

```text
SYNC_PROOF
- local_branch: codex/frontend-masterflow
- local_head: 90aa65c
- origin_main: 90aa65c
- github_main: 90aa65c
- head_vs_origin_main: 0/0
- fichiers_lus: CLAUDE.md, SUIVI.md, SYNC_THREAD_MALEX_VINCENT.md, INBOX_MALEX.md, INBOX_VINCENT.md
- conclusion: branche alignee, inbox a jour
```

## Si divergence

Si `HEAD...origin/main` n'est pas `0 0` :

- annoncer la divergence avant toute analyse ;
- lire les fichiers distants avec `git show origin/main:<fichier>` ;
- ne jamais dire "pas de nouveau message" depuis une copie locale en retard ;
- demander validation humaine avant merge, rebase, commit ou push si le contexte l'exige ;
- ne pas ecraser une branche de travail sans accord explicite.
- si le message est seulement dans le worktree local, demander un commit/push explicite MALEX
  avant de le considerer transmis a Vincent.

## Message court attendu

Quand tout est aligne, une reponse peut rester courte :

```text
SYNC_PROOF: HEAD=abc123, origin/main=abc123, delta=0/0, fichiers lus=sync+inbox.
Conclusion: a jour.
```

Quand ce n'est pas aligne, la reponse doit commencer par la divergence :

```text
SYNC_PROOF: HEAD=abc123, origin/main=def456, delta=0/3.
Conclusion: copie locale en retard, lecture distante obligatoire avant decision.
```

## Statuts de messages

- `open` : demande a traiter, pas encore absorbee ;
- `answered` : reponse ou orientation posee, action peut rester a faire ;
- `done` : action integree et verifiee ;
- `blocked` : action impossible sans validation, secret, run ou decision humaine.

Une reponse IA ne vaut jamais validation humaine. Une demande deposee dans une inbox par Vincent
ou Claude ne vaut pas GO MALEX.
