# MasterFlow — Contrat Marathon de Réconciliation et Déploiement

## Objectif final

Réinjecter et déployer la solution MasterFlow archi-complète : extraire la valeur utile du legacy,
la réintégrer sans chaos dans le canon Drive, la traduire en runtime GitHub testé, puis prouver une
instance live sauvegardée, lisible et sans dérive.

## Ordre obligatoire

```txt
legacy evidence → classification → canon patch → Canon/Git matrix → tested runtime → release proof
```

## Autonomie

Enchaîner sans micro-validation : inventaires, audits, raccordements évidents, ledgers, queues,
contrats, tests, branches, commits, pushes, PR, merges et ponts Drive/Git.

Améliorer directement une feature quand cela renforce le canon, la sécurité, la source de vérité,
la continuité ou l’usage réel. Toute amélioration doit garder sa preuve, son impact et son test.

## Cycle de publication obligatoire

Une vague n'est pas terminée quand les fichiers existent seulement dans le Drive ou sur le disque
local. Pour chaque lot validé et publiable, le marathon enchaîne automatiquement :

```txt
preflight canon/Git/inbox
-> patch canon + miroir Git
-> tests et diff-check
-> commit borné
-> push de branche
-> PR explicable
-> merge sur main
-> fetch/contrôle du SHA main
-> mise à jour du ledger et de la carte de progression
```

Règles :

- commit, push, PR et merge font partie du travail normal du marathon ;
- aucun lot ne peut être annoncé « livré GitHub » avant preuve du SHA sur `main` ;
- si authentification, réseau, CI ou protection de branche bloque la publication, déclencher une
  alerte claire et garder le lot prêt sans le présenter comme synchronisé ;
- après reprise du blocage, publier d'abord les lots locaux en attente avant d'ouvrir une nouvelle
  vague de code ;
- ne jamais regrouper silencieusement des modifications étrangères ou sans rapport dans le commit.

## Non-dérive

- Drive = canon produit ; GitHub = vérité runtime ; legacy = preuve read-only.
- Aucun legacy ne devient canon sans classification et trace.
- Candidate, validé, canon, implémenté, live et vérifié restent des états distincts.
- Les factories restent Passport + owner + scope + candidate D11 ; jamais importées ou activées en masse.
- Backend et tests avant UI ; UI après contrat consommable.

## Seuls bloqueurs autorisés

1. contradiction réelle entre décisions produit ;
2. droit, consentement ou donnée personnelle sensible ;
3. migration ou risque de perte de données ;
4. coût, provider externe ou déploiement public ;
5. accès externe ou owner impossible à établir.

Tout le reste est traité automatiquement et inscrit dans le ledger.

## Définition de fini

1. chaque capacité legacy importante est absorbée, restaurée, dépréciée ou explicitement future ;
2. le canon couvre données vivantes, pédagogie, DA, assets, mémoire, story, organisations,
   factories, versions et continuité ;
3. chaque contrat canon possède un statut Git explicite et des tests quand implémenté ;
4. les parcours réels fonctionnent avec contexte automatique et preuves ;
5. le live expose un SHA, un smoke vert, une sauvegarde et une procédure de recovery ;
6. le cockpit explique à tout instant : canon, code, live, écart, prochaine action.
