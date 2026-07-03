# MasterFlow Component Lab V2

Statut : prototype local.

Cette vague rend `/ui-lab` plus utile pour travailler les composants sans retoucher toute la page `/ui-reset`.

## Objectif

Accélérer les itérations UI en isolant les états importants :

- repos ;
- clavier ouvert ;
- version mobile ;
- mode Tunnel ;
- conflit de panneaux.

Le Lab ne remplace pas `/ui-reset`. Il sert à tester les composants et leurs états.

## Ajouts

- Deux espaces persistants sur le même Lab :
  - `/ui-lab/malex`
  - `/ui-lab/vincent`
- Scénarios rapides dans la barre du Lab :
  - `Repos`
  - `Édition`
  - `Mobile`
  - `Tunnel`
  - `Conflit`
- Fiche d'état persistante :
  - profil actif ;
  - thème clair/sombre ;
  - viewport ;
  - onglet courant ;
  - surface active ;
  - états UI ouverts.

## Règles

- Les espaces MALEX et Vincent partagent le même code composant.
- Les préférences et l'état de travail sont persistés séparément.
- Le Lab lit les mêmes profils que `/ui-reset`.
- Un scénario ferme d'abord les surfaces temporaires, puis pose un état propre.
- Le scénario `Conflit` sert à tester les priorités d'overlay, pas à représenter une vraie UX.
- Aucun backend, provider, API, publication ou commit n'est impliqué.

## Usage Recommandé

1. Modifier un composant dans le Lab.
2. Tester les scénarios rapides.
3. Vérifier ensuite seulement `/ui-reset` si le composant est stable.
4. Ne pas recopier une fixture divergente si la donnée existe dans la registry prototype.
5. Quand la vague de composants est terminée, lancer `npm run build:ui-lab`.

## Critère De Succès

On doit pouvoir tester une interaction globale sans refaire manuellement toute la navigation du prototype.
