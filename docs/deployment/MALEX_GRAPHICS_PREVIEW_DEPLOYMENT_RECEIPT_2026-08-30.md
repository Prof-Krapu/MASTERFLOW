# Reçu de déploiement preview privée - Malex Graphics

## Identité de release

- branche : `codex/masterflow-fullstack-preview` ;
- SHA actif : `e01fa0546a4eb566b789cbde5a071de156451ee9` ;
- canal : `preview` ;
- seed : `preview` ;
- IA : `mock` ;
- accès : HTTPS Tailscale Serve, `tailnet only` ;
- port applicatif hôte : `127.0.0.1:8080` uniquement.

## Runtime

- hôte : Malex Graphics, macOS Intel ;
- Docker Desktop : `4.88.1` ;
- Docker Engine : `29.7.2` ;
- Docker Compose : `5.4.0` ;
- checkout : `releases/preview/e01fa0546a4e` ;
- pointeur actif : `releases/preview/current`.

Docker Desktop a été retenu en mode utilisateur car Homebrew et Colima étaient absents et le
serveur n'autorise pas l'élévation non interactive. Aucun privilège système, port public ou clé SSH
privée n'a été ajouté.

## Recette

- backend health : OK ;
- frontend : OK ;
- compte godmode Vincent : auth, contexte, personas, ressources et WebSocket OK ;
- compte godmode MALEX : auth, contexte, personas, ressources et WebSocket OK ;
- SHA annoncé par le cockpit : conforme ;
- redémarrage Compose : persistance confirmée ;
- backup SQLite : créé ;
- restauration vers une cible séparée : `integrity_check=ok` ;
- export hors volume Docker : hash conforme, fichiers privés `600`.

## Continuité

- `com.masterflow.preview` relance Docker puis Compose à l'ouverture de session ;
- `com.masterflow.preview.backup` exporte une sauvegarde chaque jour à 03:15 ;
- aucune suppression ou rétention destructive automatique ;
- les identifiants bootstrap existent uniquement dans les stockages privés serveur et Mac principal.

## Points encore ouverts

- pas de test de reboot complet du Mac, uniquement du démarrage utilisateur et de Compose ;
- pas encore de copie chiffrée automatique hors serveur ;
- pas de rétention 7 quotidiennes / 4 hebdomadaires avant cette copie externe ;
- alertes npm : une faible en production et deux hautes dans la chaîne de build à traiter séparément ;
- aucune IA réelle, stable, fusion `main`, ouverture publique ou absorption de verticale.
