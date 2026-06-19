# Identity Review UI V1 — Delivery

Statut : `MERGED_ON_MAIN`

Publication : PR #67 — `4ccda9a2265de5829a8ade62973a8bc603a76762`

## Intention produit

Donner au professeur un écran simple pour résoudre les ambiguïtés entre une copie et
l'identité d'un élève, sans jamais appliquer un rapprochement automatiquement.

## Livré dans cette tranche

- lecture des candidates d'identité pending accessibles au professeur ;
- options limitées aux identités du roster figé dans le contexte de correction ;
- affichage dans Teaching du nom observé, de la copie et des identités possibles ;
- gestes explicites `Confirmer` et `Rejeter` ;
- état vide compréhensible quand aucune ambiguïté n'est à traiter ;
- rafraîchissement de la liste après chaque décision.

## Ce qui ne change pas

- aucun matching automatique ;
- aucune fusion ou suppression d'identité ;
- aucune modification du transcript, de la note ou du feedback final ;
- aucune migration ou activation sur une base live ;
- aucune exposition d'un roster hors du périmètre autorisé.

## Vérifications locales

- backend : 363/363 tests verts ;
- TypeScript backend et frontend : vert ;
- build frontend : vert ;
- navigateur intégré : section Teaching visible, état vide vérifié ;
- responsive : aucun débordement horizontal à 1280 px et 390 px ;
- console navigateur : aucune erreur.

## Critère de succès

Le professeur comprend qu'une identité demande sa décision et peut la confirmer ou la
rejeter, tandis que MasterFlow ne décide jamais à sa place.
