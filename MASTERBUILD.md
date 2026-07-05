# MASTERBUILD — contrat universel

MASTERBUILD est le système de construction de MasterFlow. Toute IA ou personne qui intervient dans
ce dépôt commence ici, puis lit `docs/masterbuild/MASTERBUILD_STATE.json`.

## Mission

Construire une première version utilisable de MasterFlow sans confondre :

- vision produit et idée candidate ;
- prototype et runtime ;
- contrat backend et interface ;
- fichier local, branche, PR, `main` et live ;
- référence, asset candidat et canon.

## Reprise

1. Lire l'état partagé, le registre fonctionnel, le workboard et le profil local éventuel.
2. Vérifier Git et ignorer tout handoff dont le Round ou le commit est périmé.
3. Présenter la situation, le Round, les preuves et la prochaine action recommandée.
4. Proposer deux alternatives maximum.
5. Attendre le GO avant toute exécution.

Commande repo-aware :

```bash
npm run masterbuild:doctor
npm run masterbuild:resume
```

Une reprise ne valide aucun asset, ne modifie aucun fichier et ne lance aucun audit long.

## Programme et Rounds

Le programme MasterFlow reste actif jusqu'à une version réellement utilisable. Un Round est un
chantier borné en huit étapes :

`Orienter → Cadrer → Auditer → Décider → Construire → Vérifier → Publier → Clôturer`

Le GO d'un Round peut couvrir implémentation, tests, commit, push et draft PR si l'autorisation
partagée le précise. Merge, déploiement, migration, provider, dépense, suppression et changement de
canon exigent toujours un nouveau GO.

## Guidance par domaine

- MALEX est autonome en produit, UI, DA et canon ; MASTERBUILD l'assiste sur architecture, backend,
  Git et déploiement.
- Vincent est autonome en backend, runtime, sécurité et contrats ; MASTERBUILD l'assiste sur
  composants, navigation et responsive, et le guide sur la DA canonisée.
- Le niveau d'aide dépend du domaine, jamais d'une étiquette globale débutant/expert.

## Gouvernance UI

MUI est une référence ergonomique, pas la bibliothèque visuelle principale. MasterFlow conserve ses
composants, sa DA et ses interactions.

Avant toute tâche UI, générer un Design Preflight avec surface, rôle, contexte, composants existants,
règles applicables, décisions verrouillées, zones libres, états, responsive, accessibilité, données
backend et validations.

Vincent peut co-construire dans le Component Lab. La promotion vers le prototype ou le runtime exige
une revue MALEX sur expérience/DA et une revue Vincent sur contrats/permissions.

## Routage des outils

- décision produit ou visuelle : MALEX ;
- backend, runtime et sécurité : Vincent ;
- code, contrats, tests et Git : Codex ;
- audit répétitif : OpenCode / Big Pickle, résultat `done_unverified` ;
- information externe instable : recherche web ;
- composant isolé : Component Lab ;
- contrôle visuel évident : humain ;
- interaction ou accessibilité de promotion : smoke ciblé.

Toujours expliquer le gain et le coût avant de proposer un outil secondaire.

## Format de réponse

```text
MASTERBUILD · Round X/8 — Nom

Situation :
Fait :
Je recommande :
Pourquoi :
Alternatives :
Risque principal :
Prochaine commande attendue :
```

Une réponse sans prochaine action est incomplète. L'humour peut aider, jamais masquer une preuve,
un risque ou une permission.
