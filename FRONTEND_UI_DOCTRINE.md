# FRONTEND UI DOCTRINE - MasterFlow

Statut : produit / UI doctrine / avant ecrans finaux
Date : 2026-06-08
Source : synthese MALEX + Drive canon MasterFlow

## Regle fondatrice

Ne jamais afficher une fonctionnalite parce qu'elle existe. Afficher uniquement ce qui aide
l'utilisateur dans le contexte ou il se trouve.

MasterFlow doit montrer la situation, pas l'inventaire des outils.

## Orientation

- L'utilisateur arrive dans une situation lisible : compte, contexte actif, meteo utile,
  objets recents, blocages, prochaines actions.
- Le chat et le clic pilotent tous les deux l'interface.
- Les modes sont des univers de travail, pas de simples menus.
- Les widgets changent selon contexte, role, maturite, donnees et preference.
- Les engines/IA restent majoritairement invisibles : ils ecoutent, classent, preparent,
  routent et proposent.
- Les actions visibles sont rares, evidentes et contextualisees.

## Tunnel premiere connexion

Une seule fois :

```txt
mini Akinator
-> profil d'usage
-> preferences
-> avatar/personnage canon si souhaite
-> interface personnalisee
```

Ensuite MasterFlow connait l'utilisateur et ne refait pas ce tunnel sauf demande explicite.

## Navigation par zoom

Une mecanique commune :

```txt
Accueil
-> Mode
-> Room
-> Objet
-> Detail
```

Exemples :

```txt
Teaching -> Classe -> Eleve -> Competence
Story -> Histoire -> Arc -> Scene
Project -> Projet -> Sprint -> Tache
Learning -> Parcours -> Etape -> Ressource
```

Chaque niveau charge son contexte, choisit ses widgets, puis propose quelques actions utiles.

## Modes

- `Teaching` : classes, sujets, eleves, competences, meteo pedagogique.
- `Story` : histoires, arcs, scenes, personnages, reader graph.
- `Project` : projets, timelines, sprints, taches, livrables.
- `Learning` : parcours, plans, ressources N1-N5, progression.
- `Inventory` : objets stockes, ressources, listes, collections, usages.
- `Admin/Godmode` : supervision, permissions, diagnostics, traces.

Un mode absent du contexte/loadout n'existe pas pour l'utilisateur.

## Widgets attendus

Le widget principal est dynamique. Il peut devenir :

- meteo de classe ;
- progression projet ;
- corrections en attente ;
- ressources inutilisees ;
- histoires recentes ;
- blocages ;
- deadlines ;
- objets a reprendre.

Il doit etre choisi par le contexte, pas epingle comme dashboard fixe.

## Anti-patterns

- Catalogue brut de boutons.
- Gros dashboard permanent.
- Tous les modes visibles tout le temps.
- Fonctions techniques exposees comme experience utilisateur.
- Texte long expliquant le systeme a la place d'un widget utile.
- Generation DA/image affichee comme bouton central alors que l'engine doit souvent agir en fond.

## Implication pour le frontend actuel

La Home Room actuelle reste une couche d'integration. Les prochaines passes doivent la rapprocher
de :

```txt
situation summary
-> mode rail compact
-> main dynamic widget
-> object deck
-> 1-3 next actions
-> chat compact
-> debug godmode seulement
```
