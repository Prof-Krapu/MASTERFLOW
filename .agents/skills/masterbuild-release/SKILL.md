---
name: masterbuild-release
description: Préparer et prouver une publication MasterFlow avec périmètre, tests, commit, push, PR, merge et runtime, tout en respectant les gates MALEX Vincent. Utiliser lorsqu’une vague est vérifiée et doit devenir visible sur GitHub ou déployée.
---

# Préparer une release

1. Formuler intention, canon, changement, invariants, succès, risque et validation.
2. Vérifier branche, remote, divergence, worktree et fichiers hors périmètre.
3. Exécuter les tests proportionnés puis la gate complète si publication.
4. Présenter une séquence unique : stage ciblé, commit, push, PR, revue, merge, preuve runtime.
5. Attendre le GO explicite avant commit ou push.
6. Après GO, conserver SHA, branche, PR, merge et preuve runtime séparément.
7. Ne jamais déclarer `publié` à partir d’un simple build local.

Chercher le `Perfect parry` : empêcher un fichier hors périmètre d’entrer dans le commit.
