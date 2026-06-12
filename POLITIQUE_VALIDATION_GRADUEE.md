# POLITIQUE — Validation graduee MasterFlow

Statut : `DECISION MALEX / 2026-06-12`

## 1. Decision

MasterFlow ne doit pas imposer une double validation humaine systematique.

La regle devient :

```text
permission_check toujours
preflight selon l'action
validation humaine selon le risque, l'effet et le scope
validation renforcee uniquement pour les actions critiques
```

Une validation humaine reste obligatoire quand l'action est sensible. Elle n'est pas obligatoire
pour chaque clic, chaque brouillon, chaque reponse guidee ou chaque operation interne reversible.

## 2. Objectif

Reduire la friction sans affaiblir les garanties :

- ne pas bloquer les workflows bas risque ;
- garder une trace claire des decisions ;
- eviter les validations redondantes ;
- proteger publications, exports, donnees personnelles, actions couteuses, changements globaux
  et operations irreversibles.

## 3. Niveaux de gate

| Niveau | Nom | Exemples | Gate |
|---:|---|---|---|
| 0 | lecture / brouillon | lire son contexte, creer un guide draft, repondre a une session autorisee | permission seule |
| 1 | mutation interne reversible | modifier son draft, ajouter une contribution candidate, changer une preference locale | permission + audit |
| 2 | preflight simple | cloturer une session privee sans publication, preparer un manifest candidat | permission + preflight + audit |
| 3 | sensible | publier, envoyer, exporter, inscrire, valider une ressource, ecrire un setting global | permission + preflight + validation humaine |
| 4 | critique | action publique large, donnees personnelles en masse, cout eleve, suppression definitive, changement systeme | permission + preflight + validation renforcee |

## 4. Validation renforcee

La validation renforcee n'est pas le mode normal. Elle s'applique seulement aux actions critiques.

Elle peut prendre l'une de ces formes :

- role plus eleve (`admin` ou `godmode`) ;
- confirmation explicite supplementaire dans la meme session ;
- second approver lorsque l'organisation l'exige ;
- delai ou dry-run obligatoire ;
- rollback plan documente.

## 5. Application a PR-1 Guided Runtime prive

PR-1 MOTH/CDC doit eviter la double validation :

| Operation | Gate |
|---|---|
| creer un guide draft | teacher+ owner, audit |
| modifier son guide draft | owner/admin, audit |
| creer une session privee authentifiee | owner/admin, audit |
| repondre dans une session autorisee | participant scope, audit contribution |
| avancer la prochaine question | owner/animateur, progression deterministe, audit |
| marquer une session comme complete sans publication | owner/animateur, preflight simple, audit |
| publier un guide | hors PR-1, validation humaine admin+ |
| ouvrir au public | hors PR-1, validation humaine admin+ et gates publics |
| envoyer email, inscrire event, generer asset, emettre devis | hors PR-1, validation humaine selon engine |

## 6. Invariants conserves

- Un persona ne donne jamais de droits.
- Une proposition IA ne vaut jamais validation.
- Toute action sensible garde un preflight.
- Toute publication/export/envoi externe exige validation humaine.
- Les donnees personnelles restent privees par defaut.
- Les actions irreversibles ou couteuses ne passent jamais en auto.

## 7. Impact backend attendu

Le registre d'action doit exprimer :

```text
risk_level
preflight_required
validation_required
validator_role optionnel
confirmation_required optionnel
```

`validation_required=false` ne signifie pas absence de securite. Cela signifie que permission,
scope, preflight eventuel et audit suffisent pour ce niveau d'action.

