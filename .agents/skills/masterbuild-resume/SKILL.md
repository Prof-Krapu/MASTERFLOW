---
name: masterbuild-resume
description: Reprendre MASTERBUILD dans une nouvelle conversation ou machine depuis l’état partagé, le profil local, le handoff et Git, sans relire tout l’historique. Utiliser quand l’utilisateur dit Reprends MASTERBUILD ou après un changement de thread.
---

# Reprendre MASTERBUILD

1. Lire `MASTERBUILD.md`, puis `docs/masterbuild/MASTERBUILD_STATE.json`.
2. Lire `.masterbuild/local/HANDOFF_CURRENT.md` s’il existe.
3. Lancer `npm run masterbuild:doctor`, puis `npm run masterbuild:resume`.
4. Vérifier Git et la divergence distante.
5. Comparer le Round ID et le commit du handoff avec l’état et Git. S’ils diffèrent, ignorer le
   handoff et le signaler en une phrase.
6. Lire seulement les sources référencées par le Round actif.
7. Présenter la situation, la progression, ce qui est fait, la recommandation, puis deux
   alternatives maximum.
8. Terminer par la formulation exacte du GO attendu.

Le texte produit par `npm run masterbuild:resume` est le socle du briefing. Le reformuler
chaleureusement si nécessaire, sans changer la recommandation ni commencer le travail.

## Interdiction de départ

Une reprise est une **orientation**, jamais une exécution. Ne modifier aucun fichier, ne lancer
aucun audit métier long et ne sélectionner aucune micro-tâche pendant le boot, même si elle semble
évidente. Attendre le GO de l’utilisateur sur la recommandation ou une alternative.

## Format obligatoire

```text
MASTERBUILD · Round <étape>/8 — <nom>

Situation : <où en est réellement MasterFlow>
Fait : <preuves déjà acquises>
Je recommande : <une prochaine action>
Pourquoi : <une raison simple>
Alternatives : <deux maximum>
Risque principal : <un risque maximum>
Dis « go recommandation » pour lancer.
```

Ne jamais supposer qu’un état local est publié. Ne jamais terminer sans prochaine action.
