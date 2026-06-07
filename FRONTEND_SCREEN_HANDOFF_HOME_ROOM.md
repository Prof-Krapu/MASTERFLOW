# FRONTEND SCREEN HANDOFF - Home Room

Statut : handoff UI / avant couche suivante
Date : 2026-06-07  
Source canon : Drive MASTERFLOW (`START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md`,
`START_HERE_VINCENT_CLAUDE_UI_MASTERFLOW.md`,
`MASTERFLOW_USAGE_LAYER_RESOLUTION_MAP.md`,
`MASTERFLOW_RUNTIME_CONTROL_PANEL_AND_ACTION_SURFACE_CONTRACT.md`,
`FRONTEND_UI_DOCTRINE.md`)

```yaml
screen_handoff:
  screen_or_room: Home Room
  purpose: Montrer la situation active et les prochaines actions utiles, pas le catalogue des fonctionnalites.
  active_context: GET /api/v1/context/current
  features:
    - login/auth state
    - current context
    - personas disponibles
    - contextual actions depuis le registre
    - etat reseau et retry
  widgets:
    - situation summary
    - dynamic main widget
    - mode rail compact
    - object deck selon contexte
    - next best actions
    - source truth strip
    - validation/status strip si donnees disponibles
  contextual_actions:
    - afficher seulement les actions live comme executables
    - afficher les futures en locked/debug selon role
    - masquer out_of_scope pour l'utilisateur normal
  required_data:
    - AuthResponse
    - CurrentContext
    - Persona[]
    - ActionRegistryEntry[]
  api_calls:
    - POST /api/v1/auth/login
    - GET /api/v1/context/current
    - GET /api/v1/personas
    - GET /api/v1/actions/available
  bdd_reads:
    - users/session
    - room_instance courante
    - personas
    - actions registry
    - resources validees quand source truth est branche
  bdd_writes:
    - aucune mutation UI directe hors login/session
  drive_refs:
    - Drive MASTERFLOW = canon lent, jamais BDD runtime
    - specs longues consultables par owner/index, pas scan complet
  permissions:
    - permission avant preference
    - persona ne donne jamais de droits
    - godmode voit debug, user voit experience
  performance_budget:
    - shell lisible sans backend distant
    - appels initiaux paralleles apres login
    - pas de scan Drive runtime
  empty_states:
    - backend indisponible
    - aucune action live
    - aucune ressource validee
    - persona non charge
  onboarding_questions:
    - quel premier usage concret Home Room doit-elle optimiser ?
    - quelles actions live doivent rester visibles hors godmode ?
    - quels modes doivent etre proposes apres le tunnel initial ?
  user_preferences:
    - densite compacte par defaut
    - debug visible seulement pour godmode
  canon_constraints:
    - pas de dashboard permanent geant
    - pas de catalogue brut de fonctionnalites
    - chat compactable
    - widgets seulement utiles maintenant
    - actions sensibles via preflight/validation
    - source truth avant ressource/lien
```
