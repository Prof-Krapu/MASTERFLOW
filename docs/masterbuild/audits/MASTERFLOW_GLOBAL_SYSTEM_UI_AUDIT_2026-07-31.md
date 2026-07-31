# Audit global MasterFlow — système, UI et publication

Date : 2026-07-31
Statut : preuve de départ du Round `GIT-CONSOLIDATION-001`
Source de vérité opérable : Git

## Résumé humain

MasterFlow ne manque pas de fondations. Le backend couvre déjà une grande partie du produit, tandis
que le nouveau prototype définit une expérience beaucoup plus avancée que l'interface historique.
Le principal risque n'est donc pas de devoir tout reconstruire : c'est de perdre des fonctionnalités
réelles en remplaçant trop vite l'ancien frontend, ou de faire passer des fixtures du prototype pour
des capacités branchées.

La prochaine étape correcte est une consolidation Git, puis un raccord progressif :
`Lab → prototype → runtime`, surface par surface.

## Preuves Git au début du checkpoint

- branche locale : `codex/masterbuild-v2` ;
- HEAD et branche distante avant checkpoint : `b0fdcf165b270fc7203eb404cee014b7caf4413c` ;
- `origin/main` : `bf041f725003e015fa8f9dc1b44078d41f8b7222` ;
- avance sur `origin/main` : 21 commits, aucun commit entrant ;
- draft PR : [#214](https://github.com/Prof-Krapu/MASTERFLOW/pull/214), ouverte et mergeable ;
- aucun workflow GitHub Actions présent pour fournir une preuve CI automatique.

Le SHA final du checkpoint est volontairement lu depuis Git et le handoff local : un document
contenu dans un commit ne peut pas référencer son propre SHA sans devenir immédiatement périmé.

## État du système

- backend : 39 fichiers de routeurs, 80 fichiers de services, 127 fichiers de tests ;
- adaptateur frontend : 123 fonctions exportées dans `apps/frontend/src/api.ts` ;
- contrats présents pour identité, contexte, rooms, personas, actions, jobs, Validation Inbox,
  projets, ressources, Teaching, Learn, Inventory, DA, MasterStory, sécurité et diagnostics ;
- ancien frontend : visuellement historique mais réellement branché à de nombreux contrats ;
- nouveau prototype `/ui-reset` : expérience avancée, mais seulement trois lectures backend
  directes à ce stade (`context/current`, jobs, Validation Inbox) ;
- Component Lab : disponible pour MALEX et Vincent, sans backend requis ;
- MASTERBUILD : opérable, mais son ancien Round et ses registres devaient être réalignés.

## Matrice de raccord

| Surface | Backend | UI actuelle | Écart principal | Prochaine action |
|---|---|---|---|---|
| Shell / navigation | contexte, loadout, permissions prêts | prototype | navigation encore largement locale | lire le loadout réel sans liste fixe universelle |
| Command Dock | registre d'actions et preflight prêts | prototype | suggestions fixtures | exposer cinq actions réelles maximum, sans exécution sensible directe |
| Home | contexte, orientation, jobs et inbox disponibles | prototype partiellement connecté | prochaine action encore scénarisée | composer une reprise utile depuis les quatre sources |
| Personas | contrats et seeds présents | prototype | profil visuel confondu avec identité runtime | séparer compte, persona, rôle et permissions |
| Skilltree | competencies et gamification partielles | prototype | aucune source XP primaire décidée | définir un agrégat runtime avec Vincent |
| Validation / jobs | vérifié dans `main` | ancien front connecté | présentation à migrer | raccorder au nouveau Shell sans créer de queue parallèle |
| Project | fondations et scopes disponibles | prototype | scène encore locale | migrer après Shell/Home |
| Teaching / Learn | domaines backend riches | prototype | surfaces non raccordées | brancher par verticale après Project |
| Inventory / DA / Story | fondations partielles ou avancées | Lab/prototype | maturités hétérogènes | afficher disponibilité, verrouillage ou futur sans simulation |
| Companions / MOTH | Experience Fabric partielle | concept/prototype | contrat UI à cadrer | traiter après les verticales principales |

## Vérité assets ProfKrapu

- `profkrapu-canon-v4.png` : actif dans le prototype et le Lab ;
- source normalisée identique : archive de provenance ;
- portraits carrés : actifs ;
- Stage Actor reboot du 27 juillet : `archive_process`, quatre preuves seulement ;
- essai directionnel du 30 juillet : `rejected`, non affiché ;
- aucun pack Stage Actor ProfKrapu n'est déclaré prêt.

## Ordre recommandé après consolidation

1. Shell et navigation sur contexte, loadout et permissions.
2. Command Dock sur registre d'actions et preflight.
3. Home sur orientation, jobs et Validation Inbox.
4. Persona et Skilltree avec contrat d'agrégation validé par Vincent.
5. Project, puis Teaching et Learn.
6. Inventory, DA Studio et MasterStory.
7. Companions et couches avancées.

## Stop rules

- ne pas merger la PR #214 en bloc avant classification ;
- ne pas redessiner depuis l'ancien frontend ;
- ne pas jeter ses adaptateurs API ou ses preuves de permissions ;
- ne pas présenter un asset candidat comme canon ;
- ne pas brancher une action sensible comme simple suggestion ;
- ne pas lancer de déploiement pendant le Round de consolidation.
