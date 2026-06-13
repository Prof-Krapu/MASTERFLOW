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

## 8. Mode "moins verrouille, plus prudent"

La prudence MasterFlow ne doit pas devenir une double validation rituelle.

Regle d'interpretation :

- si l'action est privee, reversible, sans cout, sans publication, sans donnees personnelles
  partagees et sans changement de permission, elle peut avancer avec permission + audit ;
- si l'action prepare une sortie sensible mais ne l'applique pas, elle passe par preflight et
  reste candidate ou `needs_review` ;
- si l'action publie, exporte, envoie, facture, inscrit, change un role, change un setting global
  ou touche un scope public, elle exige validation humaine ;
- si l'action est irreversible, couteuse, massive, publique ou systemique, elle exige validation
  renforcee ;
- si une validation humaine vient deja d'etre donnee dans le meme flux, ne pas redemander une
  deuxieme validation pour une etape purement technique equivalente : tracer la validation source
  et executer l'etape bornee.

Objectif : retirer les validations redondantes, pas retirer les gates. Un preflight utile doit
expliquer le risque et la prochaine etape ; un preflight inutile ne doit pas bloquer un workflow
bas risque.

## 9. Synchronisation sans friction

La coordination Git/inbox suit la meme logique :

- `git fetch` + preuve de commit lu = obligatoire avant conclusion ;
- relecture d'inbox = obligatoire avant decision structurante ;
- validation humaine MALEX = obligatoire avant action demandee par Vincent qui modifie le code,
  le perimetre, les permissions, le run ou le push ;
- accusation "je ne vois rien" = impossible sans citer `local_head`, `origin_main` et fichiers lus ;
- pas de validation humaine demandee pour une simple lecture, un diagnostic ou une proposition.

Le systeme d'echange doit donc etre fluide pour lire et proposer, strict pour executer et publier.
