# PR #214 — stratégie de découpe

Date : 2026-07-31
Décision : découper
Statut : Lots 1 et 2 mergés ; Lot 3 prêt à décider ; Lot 4 non exécuté
Source : branche `codex/masterbuild-v2`, checkpoint `65e9c0e`

## Décision

La PR #214 reste ouverte et inchangée comme branche-source et preuve globale. Elle ne doit pas être
mergée en bloc.

La publication future doit reconstruire des lots sélectifs depuis `origin/main`, en récupérant les
chemins utiles depuis `65e9c0e`. Les commits existants mélangent plusieurs périmètres : le découpage
ne doit donc pas reposer sur de simples cherry-picks.

La PR #214 ne sera fermée qu'après validation des PR de remplacement et avec un GO explicite.

## Lot 1 — MASTERBUILD Core

Objectif : publier le pilote et sa vérité partagée sans embarquer l'UI produit ni les assets.

Inclure :

- `apps/masterbuild/` ;
- `MASTERBUILD.md` ;
- état, registres, rounds, audits, handoffs et protocole sous `docs/masterbuild/` ;
- scripts et dépendances workspace strictement nécessaires à MASTERBUILD ;
- adaptateurs MASTERBUILD pour Codex, Claude, Gemini et OpenCode.

Exclure :

- code du prototype UI ;
- assets personas ;
- templates GitHub transversaux sans dépendance directe ;
- toute connexion UI/backend supplémentaire.

Gate : tests MASTERBUILD, JSON, TypeScript, build du cockpit et `git diff --check`.

Publication : PR #215 mergée dans `main` au SHA `65807a8`.

## Lot 2 — Gouvernance GitHub

Objectif : faire revoir séparément les règles qui changent le fonctionnement du dépôt.

Inclure :

- `CODEOWNERS` ;
- templates d'issues et de pull request ;
- instructions GitHub transversales.

Exclure :

- cockpit MASTERBUILD ;
- prototype UI ;
- assets ;
- changement de permission, déploiement ou runtime.

Gate : revue MALEX et Vincent sur ownership, catégories et charge opérationnelle.

Préparation : allowlist de sept fichiers, labels existants uniquement, aucune protection de branche
ajoutée. Rapport : `docs/masterbuild/reports/GITHUB_GOVERNANCE_IMPACT_REVIEW_001.md`.

Publication : draft PR #217, branche `codex/github-governance`, en attente de revue MALEX + Vincent.

Résultat : PR #217 mergée dans `main` au SHA `cd9f26b`.

## Lot 3 — Shell/Dock et assets actifs

Objectif : isoler la tranche d'expérience déjà construite sans promouvoir les candidats.

Inclure après allowlist précise :

- Shell, navigation et Command Dock ;
- composants de prototype nécessaires à cette tranche ;
- portraits actifs MasterFlex et ProfKrapu ;
- canons actifs MasterFlex et ProfKrapu V4 ;
- logo et wordmark MasterFlow.

Exclure :

- Stage Actor candidat ;
- archives et rejets ;
- Home, Persona, Skilltree ou verticales hors contrat de la tranche ;
- nouveau raccord UI/backend.

Les retraits de `masterflex-ui-v2.png` et `profkrapu-ui-v2.png` appartiennent uniquement à ce lot et
doivent être validés par build avant publication.

Gate : Design Preflight, build frontend, contrôles responsive/accessibilité ciblés et preuve que les
permissions/runtime existants ne régressent pas.

## Lot 4 — Component Lab et assets candidats/process

Objectif : conserver l'atelier et les preuves sans les présenter comme runtime ou canon.

Inclure :

- Component Lab et registre d'assets ;
- Stage Actor MasterFlex candidat ;
- preuves et archives ProfKrapu ;
- pipeline Identity Assets, docs et scripts associés.

Statut de publication : draft ou hold. Ce lot n'est pas une cible de merge automatique.

Exclure :

- promotion candidat vers actif ;
- import massif de sources lourdes ;
- provider, génération, migration ou déploiement ;
- toute utilisation runtime des archives et rejets.

Gate : revue visuelle MALEX, revue ProfKrapu Vincent, contrôle des volumes et décision séparée sur
le stockage des archives lourdes.

## Ordre recommandé

1. MASTERBUILD Core.
2. Gouvernance GitHub, indépendante ou après le Core.
3. Shell/Dock et assets actifs, après contrat GTC-005.
4. Component Lab et candidats/process, maintenu en draft ou hold jusqu'aux revues humaines.

## Stop rules

- ne pas modifier, fermer ou merger la PR #214 pendant la préparation ;
- ne pas créer de branche de découpe sans nouveau GO ;
- ne pas perdre les changements documentaires locaux GTC-001 à GTC-004 ;
- ne pas promouvoir un asset candidat par simple inclusion dans un lot ;
- ne pas brancher l'UI au backend pendant la préparation du découpage ;
- nouveau GO avant commit, push, PR, fermeture de #214, merge ou déploiement.

## Prochaine étape

GTC-005 prépare le contrat Shell/Dock et sa première tranche. Il ne réalise ni le découpage Git ni
le raccord UI/backend sans autorisation distincte.
