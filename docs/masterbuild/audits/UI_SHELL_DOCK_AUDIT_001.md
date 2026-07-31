# Audit USD-001 — Shell, navigation et Command Dock

Date : 2026-07-09

Round : `UI-SHELL-DOCK-001`

Statut : audit ciblé terminé

## Diagnostic simple

Le backend expose déjà l’essentiel pour brancher Shell/Dock en lecture seule. Le frontend runtime
consomme déjà `CurrentContext`, le loadout, les actions et le chat, mais son interface reste plus
technique que la direction produit. Le vrai prototype visuel Shell/Dock existe dans le worktree
`codex/ui-reset-prototype-lab`, avec `/ui-reset`, `/ui-lab`, raccourcis, Tunnel, profils et panels,
mais cette matière n’est pas encore dans la branche V2.

Conclusion : ne pas redessiner. La prochaine tranche doit réconcilier les composants du prototype
avec les contrats runtime déjà présents.

## Sources vérifiées

| Source | Emplacement | Statut | Note |
|---|---|---|---|
| Contrat Shell/Dock | `docs/ui/MASTERFLOW_UI_SURFACE_SHELL_DOCK_V1.md` | canon UI | décrit données, états, raccourcis et interdits |
| Registre UI | `docs/ui/MASTERFLOW_UI_INTEGRATION_REGISTRY_V1.md` | canon UI | classe Shell/Dock en priorité P1 |
| Front runtime actuel | `apps/frontend/src/App.tsx`, `app-shell.tsx`, `mode-runtime.ts` | implémenté partiel | branché sur backend mais DA/layout non canon final |
| Proto V2 branch | `apps/frontend/src/current-ui-demo.tsx` | prototype ancien | route `/current-ui`, non alignée avec `/ui-reset` final |
| Proto visuel avancé | `/Users/malex/Documents/Playground/MASTERFLOW/apps/frontend/src/ui-reset/*` | source prototype | worktree sale, ne pas copier sans tranche dédiée |
| Backend contexte | `apps/backend/src/routers/context.ts` | prêt | fournit `CurrentContext` + `user_runtime_loadout` |
| Backend actions | `apps/backend/src/routers/actions.ts` | prêt | cycle action sécurisé avec preflight/validation/exécution |
| Loadout runtime | `apps/backend/src/services/runtime_loadout.ts` | prêt | fournit apps, actions, shortcuts, modes, verrous |
| API front | `apps/frontend/src/api.ts` | prêt | wrappers context/actions/jobs/inbox disponibles |

## Matrice Lab / Prototype / Runtime

| Bloc | Lab/prototype avancé | Branche V2 actuelle | Runtime actuel | Verdict |
|---|---|---|---|---|
| Route `/ui-reset` | oui dans worktree proto | non, seulement `/current-ui` | non | récupérer route et composants |
| Route `/ui-lab` | oui dans worktree proto | non | non | récupérer Lab avant promotion |
| Navigation rail | composant `PrototypeNavigationRail` | dock simple ancien | `ModeRail` technique | promouvoir depuis proto |
| System bar | `PrototypeSystemChrome` | toolbar ancienne | topbar runtime | fusionner comportement + données |
| Command Dock | `PrototypeCommandDock` | launcher simple | `ChatDock` simple | remplacer par composant unique |
| Raccourcis | `usePrototypeShortcuts` + registre | absents du proto V2 | quasi absents | importer hook/registry avec guards |
| Tunnel | composant prototype mocké | absent | absent | hors P1 exécution, garder placeholder |
| Actions suggérées | proto max 5 + library | actions mockées | actions live + lifecycle | brancher lecture seule d’abord |
| Jobs/inbox badges | prévu doc + proto | mockés | endpoints prêts | brancher compteurs seulement |
| Mobile | panels plein écran dans proto | mobile simple | responsive runtime partiel | récupérer règles proto |

## Matrice backend

| Besoin Shell/Dock | Contrat backend | Statut | Risque | Action recommandée |
|---|---|---|---|---|
| Contexte actif | `GET /api/v1/context/current` | prêt | token absent dans proto | lecture optionnelle, état degraded clair |
| Modes visibles | `user_runtime_loadout.active_mode_cycle`, `available_apps` | prêt | mapping UI incomplet | créer mapping `mode -> app/loadout` |
| Actions visibles | `CurrentContext.available_actions` | prêt | action sensible trop facile | lecture seule d’abord, puis preflight explicite |
| Raccourcis autorisés | `available_shortcuts` | prêt | prototype a raccourcis fixes | filtrer/afficher selon loadout |
| Verrous/futurs | `locked_capabilities`, `disabled_reason_map` | prêt | surafficher le futur | afficher seulement si utile |
| Jobs | `GET /api/v1/jobs` | prêt | bruit dashboard | badge discret uniquement |
| Validation Inbox | `GET /api/v1/validation-inbox` | prêt teacher+ | 403 pour student | masquer ou readonly explicite |
| Action lifecycle | `/actions`, `/preflight`, `/validate`, `/execute` | prêt | clic direct dangereux | P2 après lecture seule |

## Écarts principaux

1. La branche V2 ne contient pas encore le vrai `/ui-reset` ni `/ui-lab` avancés.
2. `apps/frontend/src/main.tsx` V2 route seulement `/current-ui`, alors que les docs et MASTERBUILD
   pointent vers `/ui-reset` et `/ui-lab`.
3. Le runtime actuel consomme bien le backend, mais son Shell/Dock n’a pas encore la DA/ergonomie
   validée dans le prototype.
4. Le prototype avancé consomme déjà le runtime de manière opportuniste, mais il vit dans un
   worktree séparé avec des assets candidats et des retouches locales non prêtes à avaler en bloc.
5. Le bon chemin est une promotion chirurgicale : composants Shell/Dock + registries + shortcuts,
   pas copie complète du worktree prototype.

## Interdits confirmés

- Ne pas merger la PR #214 pendant ce Round.
- Ne pas copier les assets candidats MasterFlex/ProfKrapu.
- Ne pas intégrer Home, personas ou skilltree.
- Ne pas activer micro réel, provider voix/image ou transcription live.
- Ne pas exécuter une action depuis une suggestion.
- Ne pas faire dépendre `/ui-reset` d’un backend live obligatoire.

## Recommandation

Passer au work package `USD-002/003` :

1. récupérer dans une tranche dédiée les composants `ui-reset` utiles au Shell/Dock ;
2. ajouter `/ui-reset` et `/ui-lab` dans la branche V2 ;
3. garder la lecture runtime optionnelle ;
4. brancher uniquement :
   - modes visibles ;
   - actions visibles en lecture ;
   - compteurs jobs/inbox ;
   - raccourcis filtrables ;
5. tester build frontend + smoke humain MALEX.

## Questions à Vincent

1. `available_apps` doit-il rester la source unique des modes visibles ?
2. `active_mode_cycle` doit-il inclure Home et la page persona, ou seulement les apps runtime ?
3. `/actions/available` doit-il rester non filtré, ou faut-il préférer `CurrentContext.available_actions`
   comme source UI principale ?
4. Les compteurs jobs/inbox sont-ils visibles pour `teacher+` seulement ou selon capabilities ?

## Prochaine action MASTERBUILD

Décider la tranche `USD-002/003` : importer/promouvoir les composants Shell/Dock du prototype avancé
dans la branche V2, sans assets candidats et sans Home/persona/skilltree.
