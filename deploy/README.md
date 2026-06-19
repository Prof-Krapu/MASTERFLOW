# MasterFlow — release privée Docker

Ce dossier déploie une instance privée et persistante : frontend React, proxy
same-origin, backend Node et base SQLite sur volume Docker. Il n'active aucun
provider LLM ou image ; `LLM_PROVIDER=mock` reste le défaut de l'alpha.

## Prérequis serveur

- Docker Engine et Docker Compose v2 ;
- accès Git au dépôt ;
- un tunnel ou reverse proxy privé si l'instance doit être accessible depuis
  l'extérieur (Tailscale, VPN ou proxy HTTPS déjà administré).

## Première release

```bash
git clone git@github.com:Prof-Krapu/MASTERFLOW.git
cd MASTERFLOW
git checkout <sha-a-deployer>
cp deploy/.env.example deploy/.env
```

Dans `deploy/.env`, définir un `JWT_SECRET` aléatoire, un mot de passe owner
fort et le SHA exact de `<sha-a-deployer>` dans `MASTERFLOW_RELEASE_SHA`.

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
curl http://127.0.0.1:8080/health
```

Par défaut, le port est limité à `127.0.0.1:8080`. Ne remplacer
`MASTERFLOW_BIND` par `0.0.0.0` qu'après décision explicite sur le proxy, le
TLS et l'accès autorisé.

## Recette de release

Depuis une machine qui peut joindre l'instance :

```bash
MASTERFLOW_BACKEND_BASE=https://<backend-ou-proxy> \
MASTERFLOW_STACK_BASE=https://<stack> \
MASTERFLOW_USERNAME=<owner> \
MASTERFLOW_PASSWORD=<mot-de-passe> \
npm run smoke:public
```

La recette vérifie santé backend, frontend, connexion, contexte, personas,
ressources et WebSocket. Le cockpit owner doit ensuite afficher le même
`MASTERFLOW_RELEASE_SHA` que le commit déployé.

## Limites assumées

- aucune mise en ligne n'est déclenchée par GitHub ;
- aucune clé ou donnée de production ne vit dans ce dépôt ;
- les upgrades doivent sauvegarder le volume `masterflow_data` avant toute
  migration importante ;
- une release n'est considérée réelle qu'après smoke vert et SHA visible.
