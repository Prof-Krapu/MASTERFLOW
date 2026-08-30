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
Conserver `MASTERFLOW_SEED_PROFILE=preview` pour la recette. La production doit
utiliser `production`, qui n'injecte ni roster historique ni projet de démonstration.

Sur un nouvel hôte, le bootstrap peut générer ces secrets sans les afficher :

```bash
npm run release:bootstrap-env -- \
  --channel preview \
  --release-sha <sha-complet> \
  --output deploy/.env \
  --credentials-out <dossier-prive>/preview-bootstrap-credentials.txt
```

La commande refuse d'écraser un fichier existant. Les deux comptes godmode Vincent
et MALEX sont conservés ; leurs mots de passe sont générés indépendamment.

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
MASTERFLOW_STACK_BASE=https://<stack> \
MASTERFLOW_BACKEND_BASE=https://<backend-optionnel> \
MASTERFLOW_USERNAME=<owner> \
MASTERFLOW_PASSWORD=<mot-de-passe> \
npm run smoke:public
```

`MASTERFLOW_BACKEND_BASE` peut être omis lorsque `/health` traverse le même proxy.
La recette vérifie santé backend, frontend, connexion, contexte, personas,
ressources et WebSocket. Le cockpit owner doit ensuite afficher le même
`MASTERFLOW_RELEASE_SHA` que le commit déployé.

## Sauvegarde et restauration de contrôle

La sauvegarde est créée dans le volume privé, sans arrêter le runtime :

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml \
  exec -T backend npm run backup:runtime --workspace @masterflow/backend
```

La restauration exige toujours une cible séparée et vide. Elle ne remplace jamais
la base active :

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml \
  exec -T backend npm run restore:runtime --workspace @masterflow/backend -- \
  --backup /data/backups/<backup-id> --target /tmp/masterflow-restore-check
```

## Limites assumées

- aucune mise en ligne n'est déclenchée par GitHub ;
- aucune clé ou donnée de production ne vit dans ce dépôt ;
- les upgrades doivent sauvegarder le volume `masterflow_data` avant toute
  migration importante ;
- une release n'est considérée réelle qu'après smoke vert et SHA visible.
