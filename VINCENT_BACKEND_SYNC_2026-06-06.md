# Sync backend à envoyer à Vincent — 2026-06-06

Bonjour Vincent,

Baseline OK côté repo :

- `npm install` OK ;
- `npm test` OK : 13/13 ;
- `npm run lint` OK ;
- branche de travail frontend : `codex/frontend-masterflow`.

Avant de démarrer le frontend complet, on veut identifier ce que tu préfères encore implémenter côté backend pour éviter de construire une UI avec des boutons morts ou des hypothèses fragiles.

Hors scope confirmé côté MALEX : les factories / bots extraits ne sont pas à intégrer dans cette version.

## Points backend à clarifier / éventuellement implémenter

### 1. Capabilities / action registry exploitable par l'UI

Aujourd'hui le seed expose des actions dont certaines ne semblent pas branchées.

Est-ce que tu préfères ajouter un champ type `implemented`, `status`, `locked`, `requires_role`, `ui_enabled`, ou un endpoint `capabilities`, pour que l'UI sache quoi afficher proprement ?

### 2. Alignement endpoints vs seed

Le seed annonce par exemple :

- `POST /actions/preflight`
- `POST /validation/{item_id}/approve`

Mais les endpoints réels semblent être :

- `POST /actions/:id/preflight`
- `POST /actions/:id/validate`

Tu confirmes qu'on consomme les endpoints réels actuels, ou tu veux aligner le seed ?

### 3. `user_runtime_loadout`

Le canon dit que les raccourcis, actions et modes UI viennent du loadout utilisateur.

Est-ce prévu dans cette V1 ? Si oui, il nous faudrait un modèle ou endpoint minimal.

### 4. Validation inbox

On peut consommer `GET /actions/pending` pour une V1.

Est-ce suffisant, ou tu veux une vraie validation inbox séparée ?

### 5. Endpoints utiles pour UI complète

À confirmer si tu veux les livrer maintenant ou plus tard :

- `/da/compile-context`
- `/assets/image/preflight`
- `/assets/render-manifests`
- `/inventory/photo-scan`
- `/subjects/{subject_id}/compile-fullstack`

### 6. Permissions / Godmode / Owner Ops

On veut éviter d'exposer trop côté frontend.

Peux-tu confirmer la frontière entre godmode visible dans l'UI et `owner_ops_private_diagnostic` qui doit rester privé/propriétaire ?

Dès que tu confirmes ça, on attaque par couches : intégration contrat d'abord, UI ensuite.
