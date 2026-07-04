---
name: masterbuild-context
description: Réduire le coût de contexte MasterFlow, décider entre continuer, checkpoint ou nouveau thread, et produire un handoff portable. Utiliser avec la valeur réelle de /status, lors d’un jalon, au-dessus de 50 pour cent ou avant un changement de chantier.
---

# Gérer le contexte

1. Demander ou lire la valeur réelle de `/status`; ne pas l’estimer.
2. Moins de 50 % : continuer avec les seules sources utiles.
3. Entre 50 et 70 % : lancer `npm run masterbuild:handoff` au prochain jalon.
4. Au-dessus de 70 % : finaliser le handoff et recommander un nouveau thread.
5. Inclure objectif, étape, décisions, fichiers, tests, Git, blocages et prompt.
6. Ne pas copier l’historique complet.

Présenter le pourcentage comme une `Drive gauge` seulement si cela clarifie la situation.
