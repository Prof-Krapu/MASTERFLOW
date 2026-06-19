# Audit état hard-stop persistant — 2026-06-19

Statut : `DECISION_VALIDATED_RUNTIME_IMPLEMENTED_LOCAL`

Mise à jour : MALEX a validé la recommandation par `next`. La tranche runtime owner + Room est
implémentée localement avec activation/reprise explicites et gate preflight sensible-only.

## Diagnostic simple

MasterFlow sait maintenant prévisualiser puis geler une sélection explicite d'actions sensibles.
En revanche, il ne mémorise pas encore qu'un stop reste actif. Une nouvelle action sensible peut
donc être créée après le gel si l'utilisateur continue à travailler.

Ce manque ne doit pas être comblé par un stop global implicite. Le canon impose une granularité de
reset et une priorité forte au stop, mais ne tranche pas encore précisément la portée persistante ni
la règle de reprise.

## Sources canon relues

- Drive :
  `90_WORKBENCH/DEPLOYMENT_HANDOFF/GITHUB_DEPLOYMENT_HANDOFF_PROCESS_ACTIVATION_CONTEXT_LOADOUT_2026-06-18.md`
  — primitives `HARD_STOP_ACTION_PRIORITY`, `RESET_GRANULARITY`,
  `ACTION_EXPIRES_AFTER_CONTEXT_CHANGE` ;
- Git : `docs/process-activation/PROCESS_CONTROL_STRIP_SPEC_2026-06-18.md` — état stop/reset et
  scopes candidats `current_output`, `current_process`, `room_context`, `reference_board`,
  `session` ;
- Git : `docs/process-activation/ACTION_EXPIRY_AFTER_CONTEXT_CHANGE_SPEC_2026-06-18.md` — stale,
  re-preflight et actions bloquées ;
- GitHub `main` : PR #21 — application atomique aux actions explicitement sélectionnées.

## Matrice canon → GitHub ciblée

| Élément canon | Statut GitHub | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| Priorité du hard-stop | partiel | Le signal est diagnostiqué et les actions choisies peuvent être gelées ; aucun état actif persistant. | moyen | Définir un état borné avant code. |
| Granularité du reset | partiel | La sélection explicite couvre les actions existantes ; la portée des futures actions n'est pas choisie. | élevé | Retenir une vraie Room, jamais owner/projet global par défaut. |
| Reprise explicite | absent | Aucun contrat indiquant qui peut lever le stop ni ce qui est revalidé. | élevé | Exiger une reprise manuelle teacher+ dans le même scope. |
| Blocage des nouvelles actions | absent | `createAction` et `preflightAction` ne consultent aucun état stop. | élevé | Bloquer au preflight les actions sensibles seulement. |
| Lecture et contrôle pendant stop | absent | Aucun allowlist formalisé. | moyen | Laisser les lectures low-risk, la revue et la commande de reprise accessibles. |
| Traçabilité | partiel | Les actions rendues stale sont auditées ; activation/reprise du stop ne le sont pas. | moyen | Tracer activation, portée, raison, auteur et reprise. |

## Recommandation produit

Première portée persistante recommandée : **owner + Room réelle**.

- le stop ne peut être activé que si un `room_id` réel est connu et accessible ;
- il ne s'étend jamais automatiquement à toutes les Rooms, à tout un projet ou à toutes les
  actions de l'owner ;
- il bloque au preflight les nouvelles actions sensibles de cette Room ;
- les actions low-risk de lecture, la revue du stop et la reprise restent disponibles ;
- la reprise est explicite, teacher+, dans la même Room ;
- reprendre ne réactive jamais les actions `stale` : elles doivent repasser par un nouveau cycle ;
- le texte brut « stop » reste diagnostic seulement et ne crée pas l'état persistant.

Pourquoi cette option : la Room est le plus petit scope runtime déjà présent dans les actions et
le contexte. Le scope `mine` actuel du cockpit est trop large pour devenir un verrou persistant.

## Contrat candidat — pas encore autorisé à coder

- Intention produit : maintenir un stop explicite dans une Room jusqu'à reprise humaine.
- Partie du canon : hard-stop priority, reset granularity, process control strip.
- Doit changer : état actif/released audité ; gate preflight des actions sensibles de la Room ;
  commande de reprise explicite.
- Ne doit pas changer : aucune activation depuis le texte brut ; aucun blocage global owner/projet ;
  aucune suppression, reprise automatique d'action stale ou annulation de job.
- Succès : pendant le stop, une nouvelle action sensible de la Room ne passe pas le preflight ;
  une lecture low-risk reste disponible ; après reprise, un nouveau cycle peut commencer.
- Risque de dérive : élevé tant que la portée Room et les capacités autorisées pendant stop ne sont
  pas validées.
- Validation nécessaire : oui.

## Décision produit à prendre

Valider ou refuser cette règle :

> Le premier hard-stop persistant est limité à l'owner dans la Room courante. Il bloque seulement
> les nouveaux preflights sensibles de cette Room et se lève par une reprise manuelle teacher+.

## Stop rule

Cette stop rule a été levée par validation MALEX. Les interdits restants demeurent : aucun scope
global implicite, aucune activation depuis le texte brut et aucune réactivation d'action stale.
