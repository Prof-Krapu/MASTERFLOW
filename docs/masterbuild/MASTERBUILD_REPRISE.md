# Reprendre MASTERBUILD ailleurs

## Première installation

```bash
git clone git@github.com:Prof-Krapu/MASTERFLOW.git
cd MASTERFLOW
npm install
npm run masterbuild:boot
npm run dev:masterbuild
```

Ouvrir `http://localhost:5175`.

Le boot crée uniquement un profil local non sensible dans `.masterbuild/local/`. Il ne modifie
pas le profil partagé sans action explicite.

## Reprendre dans Codex

1. Ouvrir le dossier racine `MASTERFLOW`.
2. Dire `Reprends MASTERBUILD` ou invoquer `$masterbuild-resume`.
3. Lire l'étape affichée et la prochaine action.
4. Utiliser `/status` au checkpoint de contexte recommandé.

## Vérifier l'environnement

```bash
npm run masterbuild:doctor
```

Le diagnostic vérifie Node, Git, l'état partagé, les profils et la disponibilité facultative du
backend. Il n'effectue ni installation, ni commit, ni push.

Le diagnostic affiche aussi si le backend produit est arrêté. Ce statut est informatif :
MASTERBUILD fonctionne sans backend.

## Changer de conversation

```bash
npm run masterbuild:handoff
```

Le handoff local contient l'objectif, l'étape, l'état Git, les vérifications et un prompt de
reprise. Il reste hors Git tant qu'il n'est pas explicitement promu comme handoff collaboratif.

## Publication

MASTERBUILD prépare les commandes et explique leur portée. Le commit, le push, la PR et le
déploiement restent exécutés par Codex après GO explicite.

## Premier exercice MALEX

1. Ouvrir le cockpit.
2. Vérifier l'étape et la Drive gauge reportée depuis `/status`.
3. Ouvrir `Git & preuves`.
4. Préparer la séquence complète sans l'exécuter.
5. Créer un handoff.

## Premier exercice Vincent

1. Lancer `npm run masterbuild:doctor`.
2. Sélectionner le profil Vincent lors du premier boot.
3. Ouvrir `MALEX / Vincent` et relire l'audit métier prérempli.
4. Ouvrir le Lab Vincent depuis `Lab & Runtime`.
5. Envoyer un recap court à MALEX.

Le recap est une modification locale Git tant qu'il n'est pas committé et poussé.

## Veille

L'automation `MASTERBUILD coherence hebdo` reste en pause jusqu'à publication de cette brique.
L'activer ensuite dans Codex pour recevoir un audit read-only hebdomadaire en worktree.
