# Malex Graphics - Preflight serveur 2026-08-30

## Statut

Audit en lecture seule terminé. Aucune installation, copie de code, création de dossier ou
modification réseau n'a été effectuée.

## Identité vérifiée

- hôte : `Malex-Graphics.local` ;
- architecture : Intel `x86_64` ;
- macOS : `15.3.2` ;
- compte SSH : `alexcoulot` ;
- racine candidate : `/Users/alexcoulot/Playground`, présente et accessible ;
- Tailscale : actif, sain et joignable dans le tailnet privé.

## Capacité

- CPU : 12 cœurs logiques ;
- mémoire : 32 Go ;
- espace disponible sur le volume système : environ 364 Gio ;
- veille système sur secteur : désactivée ;
- FileVault : actif.

## Runtime

- Git disponible : `2.39.5` ;
- Homebrew absent du `PATH` ;
- Node et npm absents du `PATH` ;
- Docker absent du `PATH` ;
- Colima absent du `PATH`.

## Sauvegarde

- aucune destination Time Machine configurée ;
- les sauvegardes applicatives locales restent possibles, mais elles ne constituent pas une copie
  hors serveur ;
- une copie chiffrée hors serveur et un test de restauration sont obligatoires avant stable.

## Verdict

Le serveur est correctement dimensionné pour la preview. L'installation Homebrew Intel, Docker CLI,
Compose et Colima est nécessaire. Elle reste bloquée derrière un GO explicite.

Configuration initiale candidate Colima :

- 6 CPU ;
- 12 Go de RAM ;
- 100 Go de disque ;
- accès MasterFlow limité à localhost puis relayé par Tailscale ;
- preview et stable dans des projets Compose et volumes distincts.

## Gates restants

1. validation de l'installation du runtime ;
2. choix de la copie chiffrée hors serveur ;
3. préparation d'un commit et d'un manifeste de release ;
4. recette locale Docker avant copie sur Malex Graphics ;
5. aucun provider IA réel avant validation séparée.
