---
name: masterbuild-boot
description: Initialiser ou réaligner un poste MALEX ou Vincent avec MASTERBUILD, son rôle, son métier, son niveau de guidance et les frontières prototype runtime canon déploiement. Utiliser au premier boot, sur une nouvelle machine ou si le profil local est absent.
---

# Boot MASTERBUILD

1. Lancer `npm run masterbuild:doctor`.
2. Lire les profils partagés dans `MASTERBUILD_STATE.json`.
3. Si le profil local manque, lancer `npm run masterbuild:boot`.
4. Scanner les sources disponibles pour préremplir rôle, responsabilités et habitudes.
5. Poser au maximum trois questions sur les incertitudes restantes.
6. Confirmer ownerships, métier, besoins, frictions et mode guidé, assisté ou rapide.
7. Enregistrer uniquement les préférences non sensibles dans `.masterbuild/local/`.
8. Indiquer l’objectif partagé, l’étape et la prochaine action.

Ne pas parler du système de recaps privés pendant le boot. Ne jamais stocker secret ou token.
