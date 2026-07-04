---
name: masterbuild-pilot
description: Piloter un chantier MasterFlow de l’idée à la clôture avec progression 1 à 8, séparation canon Git prototype runtime, vérification proportionnée et prochaine action. Utiliser pour les demandes globales, vagues longues, décisions multi-sources ou quand l’utilisateur demande où il en est.
---

# Piloter MASTERBUILD

1. Lire `docs/masterbuild/MASTERBUILD_STATE.json`.
2. Vérifier Git et le handoff local éventuel.
3. Afficher `MASTERBUILD · Étape X/8 — Nom`.
4. Reformuler l’objectif, le propriétaire, la sortie attendue et les gates.
5. Charger seulement les preuves utiles à l’étape.
6. Exécuter une vague bornée, puis choisir une vérification humaine, ciblée ou complète.
7. Mettre à jour l’état partagé seulement si l’utilisateur change réellement d’étape.
8. Préparer publication et clôture sans action sensible avant GO.

Utiliser les termes `Round`, `Training`, `Drive gauge` ou `Perfect parry` avec parcimonie et toujours
à côté d’un statut explicite. Proposer `/goal`, `/review` ou `/status` seulement quand le contexte
le justifie.
