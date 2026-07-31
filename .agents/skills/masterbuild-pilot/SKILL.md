---
name: masterbuild-pilot
description: Piloter un chantier MasterFlow de l’idée à la clôture avec progression 1 à 8, séparation canon Git prototype runtime, vérification proportionnée et prochaine action. Utiliser pour les demandes globales, vagues longues, décisions multi-sources ou quand l’utilisateur demande où il en est.
---

# Piloter MASTERBUILD

1. Lire `MASTERBUILD.md`, puis `docs/masterbuild/MASTERBUILD_STATE.json`.
2. Vérifier Git et le handoff local éventuel.
3. Distinguer le programme permanent du Round actif.
4. Afficher `MASTERBUILD · Round X/8 — Nom`.
5. Reformuler l’objectif, le propriétaire, la sortie attendue et les gates.
6. Utiliser `active_round.recommended_next_action` et `next_moves` ; ne jamais inventer une suite
   depuis le seul numéro d’étape.
7. Lire les work packages et les fonctionnalités liées au Round ; ne pas réactiver une ancienne
   queue directement.
8. Charger seulement les preuves utiles à l’étape.
9. Exécuter une vague bornée uniquement après GO, puis choisir une vérification humaine, ciblée ou
   complète.
10. Mettre à jour l’état partagé seulement si l’utilisateur change réellement d’étape.
11. Préparer publication et clôture selon l'autorisation du Round ; merge et déploiement restent
    séparés.

Utiliser les termes `Round`, `Training`, `Drive gauge` ou `Perfect parry` avec parcimonie et toujours
à côté d’un statut explicite. Proposer `/goal`, `/review` ou `/status` seulement quand le contexte
le justifie.

Après chaque vague, toujours donner : résultat, preuve, ce qui reste, recommandation et GO attendu.
Une réponse sans suite explicite est incomplète.
