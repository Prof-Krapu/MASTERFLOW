# Receipt — package de release vérifié hors Docker

SHA audité : `2432e87598d8e381d2d991425a1d51a798dc79e7`.

## Vérifications vertes

- backend TypeScript `tsc --noEmit` ;
- backend complet : 84 fichiers, 383 tests ;
- frontend Vite de production ;
- Compose : backend persistant `/data/masterflow.db`, healthcheck local, frontend same-origin ;
- configuration alpha : bind localhost et `LLM_PROVIDER=mock`.

## Limite

Docker/Compose ne sont pas installés sur la machine de recette. Aucune image ni stack n'a donc été
construite ou démarrée. Cette receipt ne vaut ni déploiement Docker, ni smoke live, ni preuve serveur.

## Gate suivant

Exécuter `docker compose ... up -d --build` uniquement sur une machine Docker autorisée avec secrets,
volume/backup et SHA explicitement décidés.
