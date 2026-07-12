# MASTERBUILD Review Guide

Ce guide explique comment lire une PR MasterFlow sans relire toute la conversation.

## Principe

GitHub garde la preuve officielle. Le Lab sert d'écran lisible pour comprendre quoi vérifier.

- `/ui-reset` : prototype partagé.
- `/ui-lab` : espace de test MALEX.
- `/ui-lab/vincent` : espace de test Vincent.
- PR GitHub : preuve, discussion, checks et décision.

## Lecture rapide

1. Ouvrir l'onglet `review` dans le Lab.
2. Lire le round actif et la décision attendue.
3. Ouvrir les liens de test.
4. Suivre sa checklist : MALEX pour UI/DA/expérience, Vincent pour runtime/contrats/lancement.
5. Reporter les blocages dans la PR ou dans le fichier de suivi demandé par MASTERBUILD.

## Validation MALEX

MALEX vérifie :

- l'expérience utilisateur ;
- la navigation ;
- la DA, les assets, logos et couleurs ;
- la microcopy ;
- le respect du périmètre produit.

Une validation MALEX ne vaut pas merge automatique.

## Validation Vincent

Vincent vérifie :

- le lancement local ;
- les routes utiles ;
- les profils séparés ;
- l'absence d'impact backend non prévu ;
- les permissions, contrats et contraintes runtime si concernés.

Une validation Vincent ne remplace pas une décision produit MALEX.

## Hors périmètre par défaut

Sauf GO explicite, une PR de review ne fait pas :

- merge dans `main` ;
- déploiement ;
- migration ;
- dépense provider ;
- suppression ;
- changement de canon.

## Quand bloquer

Bloquer la PR si :

- le Lab ne démarre pas ;
- un profil écrase l'autre ;
- le prototype ne correspond plus à la décision UI ;
- un backend ou contrat API change sans être annoncé ;
- une action sensible devient accessible sans gate ;
- le hors périmètre est violé.

## Phrase utile

Si tout est bon :

```text
Review OK pour mon périmètre. Rien à bloquer. Pas de GO merge implicite.
```

Si ce n'est pas bon :

```text
Review bloquée sur mon périmètre : [problème]. Impact probable : [impact]. Preuve : [lien/capture/fichier].
```
