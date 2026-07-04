---
name: masterbuild-resume
description: Reprendre MASTERBUILD dans une nouvelle conversation ou machine depuis l’état partagé, le profil local, le handoff et Git, sans relire tout l’historique. Utiliser quand l’utilisateur dit Reprends MASTERBUILD ou après un changement de thread.
---

# Reprendre MASTERBUILD

1. Lire `docs/masterbuild/MASTERBUILD_STATE.json`.
2. Lire `.masterbuild/local/HANDOFF_CURRENT.md` s’il existe.
3. Lancer `npm run masterbuild:doctor`.
4. Vérifier Git et la divergence distante.
5. Lire seulement les sources référencées par l’objectif actif.
6. Afficher étape, fait, reste, alertes et prochaine action sûre.
7. Demander une clarification seulement si une vraie décision produit manque.
8. Ne jamais supposer qu’un état local est publié.
