# UI-PAGE-AUDIT-001 — Audit UI page par page

Date : 2026-08-02
Statut : actif, étape 7/8 — Publier
Owner : MALEX
Revue système : Vincent

## Situation

GitHub `main` contient désormais l'UI réellement utilisée, la Home raccordée au contexte, la
console GodMode et le Component Lab partagé. Cette présence dans `main` ne prouve ni que chaque page
est aboutie, ni que toutes ses données et actions sont réellement raccordées, ni qu'un déploiement
partagé existe.

Le CDC Canon V2, absent de la copie reconstruite de `main`, a été retrouvé dans le commit `fcfa68e`
de la branche historique `codex/masterbuild-v2`, puis restauré localement depuis cette preuve Git.
Le registre V1 est conservé comme baseline historique et le registre V2 porte désormais l'état
opérationnel réconcilié avec `main`.

## Objectif

Auditer les pages une par une depuis la version Git unique, puis faire valider leur contrat par
MALEX avant toute modification. La première page est **Home**.

Pour chaque page, distinguer :

- objectif utilisateur et valeur visible dans les dix premières secondes ;
- action principale et choix secondaires ;
- composants et états réellement présents dans `main` ;
- données, permissions et actions réellement consommées ;
- prototype, runtime raccordé, candidat, futur et indisponible ;
- écarts desktop/mobile, accessibilité et surcharge ;
- décisions MALEX nécessaires avant construction.

## Premier work package

`UPA-001 — Auditer et contractualiser la Home actuelle`

Sortie attendue : un contrat Home lisible et vérifiable, sans modification de l'interface.

## Périmètre de l'ouverture

Autorisé : réconciliation documentaire locale et orientation du Round.

Exclus : modification UI ou backend, raccord runtime, asset, branche, commit, push, PR, merge et
déploiement. Les GO d'audit Home et de récupération documentaire ont été consommés sans élargir ce
périmètre.

## Sources initiales

- `apps/frontend/src/current-ui-demo.tsx` ;
- `apps/frontend/src/ui-reset/prototype-profile-registry.ts` ;
- `docs/ui/MASTERFLOW_UI_CDC_CANON_V2.md` ;
- `docs/ui/MASTERFLOW_UI_INTEGRATION_REGISTRY_V1.md` — baseline historique ;
- `docs/ui/MASTERFLOW_UI_INTEGRATION_REGISTRY_V2.md` — registre actif ;
- `docs/masterbuild/MASTERBUILD_FEATURE_REGISTRY.json` ;
- PR #221 — UI réellement utilisée ;
- PR #223 — Home runtime et console GodMode ;
- PR #224 — Component Lab partagé.

## Résultat d'orientation et d'audit Home

- identité, Room, rôle, loadout, jobs, inbox et actions `live` sont consommés partiellement ;
- la Home reste un catalogue de six modes, sans dernière reprise ni prochaine action utile ;
- Project, Teaching, Learn, MasterStory, DA Studio et Inventory sont sélectionnables mais aucune
  page n'est rendue pour eux dans `/ui-reset` ;
- la bibliothèque d'actions utilise des libellés runtime, mais sélectionner une action ferme
  seulement le panneau ;
- le chat, le micro et l'historique restent prototype ;
- Companions est classé futur dans le canon mais exposé comme disponible dans le prototype ;
- MasterBuild est réellement visible au GodMode mais doit encore recevoir son contrat de page.

## Contrat Home V1 recommandé

```txt
contexte actif
-> dernière reprise
-> une action principale réellement pilotable
-> attention utile
-> trois raccourcis maximum vers des pages rendues
```

Variantes à cadrer : GodMode, professeur et étudiant. L'état sans session doit fournir une action
de reconnexion. Un contrôle non raccordé doit être identifié comme prototype ou indisponible.

## Critères de réussite du Round

- aucun écran n'est traité comme terminé parce qu'il existe dans `main` ;
- aucune donnée ou action simulée n'est présentée comme runtime réel ;
- chaque page reçoit une décision MALEX avant construction ;
- les pages suivantes sont ordonnées depuis les dépendances réelles, pas depuis une ancienne queue ;
- publication et déploiement restent des décisions séparées.

## Prochaine action recommandée

Publier la branche `codex/ui-runtime-consolidation-one-shot`, ouvrir une PR prête, demander la revue
Vincent du contrat Companion et merger uniquement après tous les checks verts.

## Résultat du one shot validé

Le plan global validé par MALEX remplace, pour ce lot borné, la restriction initiale de construction
page par page. Il ne transforme pas automatiquement les idées ou archives en canon.

- `/`, `/ui-reset` et `/current-ui` reposent sur le même orchestrateur et le même shell ;
- Home, Project, Teaching, Learn et Inventory utilisent les raccords runtime existants ;
- MasterStory et DA Studio présentent un état indisponible explicite ;
- MasterBuild reste privé au GodMode ;
- chat et historique utilisent le WebSocket réel ; micro et transcription restent désactivés ;
- Companions est une section read-only d'Inventory, servie sans table ni migration nouvelle ;
- tests backend et permissions, lints, builds, MASTERBUILD et smoke trois rôles sont verts localement.

Le merge GitHub ne constitue pas un déploiement. Aucun nouvel asset, fournisseur, coût, déplacement,
suppression, migration ou déploiement ne fait partie de ce Round.

## Clôture HOME-001 — PR #226

La Home respecte désormais son contrat V1 : reprise métier réellement autorisée, première ouverture
honnête sans checkpoint, attention utile, trois raccourcis maximum, Dock fermé au repos et chat sans
autofocus. Le retour Home ne fabrique plus une fausse reprise et les libellés internes ne sont plus
exposés.

Les smokes GodMode, professeur et étudiant, dont étudiant à 390 px, confirment permissions, absence
de débordement et absence d'erreur console. La prochaine page à auditer est Project (`UPA-002`).
