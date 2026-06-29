# AGENT_TASKS — MasterFlow

Board unique pour Codex, Claude Code, Claude/Vincent, assistants.
Chacun lit les tâches `target:` qui le concernent, exécute, et reporte dans l'entrée.

## Règles

- `target:` = un ou plusieurs agents (`codex` | `claude-code` | `claude-vincent` | `assistant` | `all`)
- `status:` = `open` → `claimed` → `done` | `blocked` | `superseded` → `verified`
- `frozen_by:` = SHA du commit où la décision a été figée
- Chaque agent **ajoute** sa ligne signée sous `### updates` (ne réécrit pas l'entête)
- Une tâche `verified` peut être archivée en bas du fichier
- `alert:` dans un update = signale un problème qui mérite décision avant la suite

---

## TASK-338 — VOICE-PERSONA-002 : TTS durci
target: codex
status: done
frozen_by: MALEX « go » 2026-06-29

### scope
- Authentifier TTS et résoudre le speaker réel depuis la Room.
- Retirer la voix libre côté client.
- Borner texte, quota, timeout, taille, cleanup et audit.
- Tester avec générateur mocké, sans provider réel.

### verification
- TTS + persona : 9/9.
- backend : 632/632.
- lint back/front, build frontend et `git diff --check`.

### updates
> 2026-06-29 codex → done local. TTS durci et vérifié, prêt à publication.
> 2026-06-29 codex → PR #183 créée ; l'état GitHub de la PR fait foi.

---

## TASK-337 — VOICE-PERSONA-001 : audit TTS contrôlé
target: codex
status: done
frozen_by: MALEX « go » 2026-06-29

### scope
- Auditer route TTS, persona, frontend, permissions, limites et privacy.
- Séparer voix sémantique et configuration audio technique.
- Préparer auth, speaker Room, whitelist, timeout, rate limit et cleanup.
- Ne lancer aucun provider ni modifier le runtime.

### verification
- Relecture route TTS, WS speaker, seeds persona et frontend audio.
- `git diff --check`.

### updates
> 2026-06-29 codex → done local. Contrat Voice Persona V1 prêt à publication.
> 2026-06-29 codex → PR #182 créée ; l'état GitHub de la PR fait foi.

---

## TASK-336 — SAFETY-STATE-002 : projection runtime pure
target: codex
status: done
frozen_by: MALEX « go » 2026-06-29

### scope
- Projeter les états depuis Trust, récupération et hard stop.
- Exposer une lecture privée admin/godmode.
- Ne rien persister et ne modifier aucun comportement métier.

### verification
- Safety + route : 14/14.
- backend : 628/628.
- lint backend et `git diff --check`.

### updates
> 2026-06-29 codex → done local. Projection Safety vérifiée, prête à publication.
> 2026-06-29 codex → PR #181 créée ; l'état GitHub de la PR fait foi.

---

## TASK-335 — SAFETY-STATE-001 : sécurité narrative non punitive
target: codex
status: done
frozen_by: MALEX « go » 2026-06-29

### scope
- Définir états, transitions, réactions persona et récupération.
- Garder l'état narratif subordonné à Security, Trust, permissions et hard stop.
- Préparer classe, GodMode et assets futurs sans humiliation.
- Ne modifier aucun runtime, prompt, asset, UI, schéma, permission ou sanction.

### verification
- Relecture Security, Trust, hard stop, réactions persona et règles non humiliantes.
- `git diff --check`.

### updates
> 2026-06-29 codex → done local. Contrat Safety State V1 prêt à publication atomique.
> 2026-06-29 codex → PR #180 créée ; l'état GitHub de la PR fait foi.

---

## TASK-334 — TRUST-FABRIC-002 : read model privé
target: codex
status: done
frozen_by: MALEX « go » 2026-06-29

### scope
- Calculer quatre dimensions depuis les données runtime existantes.
- Exposer une lecture admin/godmode sans écriture.
- Garder le signal utilisateur owner-scoped, expirable et réversible.
- Ne créer ni table, score composite, permission, sanction, provider ou UI.

### verification
- Trust + route : 8/8.
- backend : 619/619.
- lint backend et `git diff --check`.

### updates
> 2026-06-29 codex → done local. Read model Trust vérifié, prêt à publication atomique.
> 2026-06-29 codex → PR #179 créée ; l'état GitHub de la PR fait foi.

---

## TASK-333 — TRUST-FABRIC-001 : confiance explicable
target: codex
status: done
frozen_by: MALEX « on continue ? » 2026-06-29

### scope
- Auditer les signaux de confiance, intégrité, risque utilisateur et santé runtime existants.
- Séparer les dimensions et interdire tout score global ou moral.
- Définir reason codes, scope, expiration, réversibilité et règles d'échelle.
- Ne modifier aucun runtime, schéma, permission, provider, sanction ou UI.

### verification
- Relecture RAG, workflow observability, cost governance, LLM routing et owner cockpit.
- `git diff --check`.

### updates
> 2026-06-29 codex → done local. Contrat Trust Fabric V1 prêt à publication atomique.
> 2026-06-29 codex → PR #178 créée ; l'état GitHub de la PR fait foi.

---

## TASK-332 — SECURITY-FABRIC-002 : garde déterministe commun
target: codex
status: done
frozen_by: MALEX « go » 2026-06-29

### scope
- Remplacer la regex RAG isolée par un garde réutilisable.
- Couvrir entrée directe, obfuscation simple et contenu RAG indirect.
- Auditer refus et quarantaines sans contenu brut.
- Ne modifier ni DB, permission, hard stop, session, sanction, provider ou UI.

### verification
- garde + RAG : 19/19.
- backend : 615/615.
- lint backend et `git diff --check`.

### updates
> 2026-06-29 codex → done local. Tranche runtime vérifiée, prête à publication atomique.
> 2026-06-29 codex → PR #177 créée ; l'état GitHub de la PR fait foi.

---

## TASK-331 — SECURITY-FABRIC-001 : frontière de confiance runtime
target: codex
status: done
frozen_by: MALEX « go » 2026-06-29

### scope
- Relier les gardes sécurité existants sans créer de moteur concurrent.
- Définir zones de confiance, réponses graduées, poisoning RAG et alertes GodMode.
- Préparer une première tranche runtime additive et testable.
- Ne modifier aucun runtime, schéma, permission, hard stop, provider, session ou sanction.

### verification
- `git diff --check`.
- Relecture ciblée RAG, Action Engine, hard stop et owner cockpit.

### updates
> 2026-06-29 codex → done local. Contrat Security Fabric V1 prêt à publication atomique.
> 2026-06-29 codex → PR #176 créée ; l'état GitHub de la PR fait foi.

---

## TASK-330 — GLOBAL-ABSORPTION-001 : matrice d'absorption globale
target: codex
status: verified
frozen_by: MALEX « go » 2026-06-29

### scope
- Lire les audits BP récents et les registres source-truth/primitives.
- Classer legacy, factories, OpenMontage/design, voix, sécurité, DA narrative, UI et learning.
- Choisir la prochaine vague sans coder de runtime.
- Corriger le statut de la vague anti-coupure publiée via PR #173.

### verification
- `git diff --check` requis avant publication.

### updates
> 2026-06-29 codex → done local. Matrice globale créée ; prochaine vague recommandée : `SECURITY-FABRIC-001`.
> 2026-06-29 codex → verified. PR #174 mergée sur `main` (`1aa6f62`).

---

## TASK-329 — GLOBAL-ABSORPTION-RESUME-000 : reprise anti-coupure crédits
target: codex
status: verified
frozen_by: MALEX « PLEASE IMPLEMENT THIS PLAN » 2026-06-29

### scope
- Inscrire le rituel de reprise anti-coupure dans le poste de contrôle.
- Ajouter une queue globale unique des vagues restantes.
- Ajouter un bloc `VAGUE ACTIVE` en tête de `SUIVI.md`.
- Ne modifier aucun runtime, provider, permission, seed, migration, endpoint ou UI.

### verification
- `git diff --check` requis avant publication.

### updates
> 2026-06-29 codex → done local. Reprise anti-coupure documentée ; publication non lancée.
> 2026-06-29 codex → verified. PR #173 mergée sur `main` (`4ca2702`).

---

## TASK-328 — THEME-STUDIO-UI-001 : grammaire visuelle explicable
target: codex
status: verified
frozen_by: MALEX « Go / continue » 2026-06-29

### scope
- Ajouter Theme Studio comme outil GodMode chargé à la demande.
- Lire un manifest D08 via Visual Narrative Grammar.
- Exposer signes, arc émotionnel, justification et diagnostics.
- Ne pas appliquer de thème, générer, canoniser ou publier.

### verification
- backend complet : 605/605.
- lint frontend/backend, build frontend et diff-check : OK.
- smoke : état vide honnête ; manifest local = 3 signes, 0 arc, 2 alertes ;
  aucun débordement à 390 px.

### updates
> 2026-06-29 codex → done local. Theme Studio diagnostic vérifié ; publication atomique prête.
> 2026-06-29 codex → verified. PR #172 mergée sur `main` (`2e958e7`).

---

## TASK-327 — MASTERSTORY-UI-001 : lecture canon progressive
target: codex
status: done
frozen_by: MALEX « Go » 2026-06-29

### scope
- Construire une lecture canon par public depuis le workbench sélectionné.
- Masquer réellement les spoilers en mode lecteur.
- Exposer setup/payoff, cohérence et storylets candidates.
- Ne modifier ni source, canon, export ou publication.

### verification
- backend complet : 605/605.
- lint frontend/backend, build frontend et diff-check : OK.
- smoke Batrasia : lecteur 30 faits visibles / 8 spoilers masqués ; atelier 0 spoiler masqué ;
  storylet pending validation ; aucun débordement à 390 px.

### updates
> 2026-06-29 codex → done local. Lecture MasterStory vérifiée ; publication atomique prête.

---

## TASK-326 — EXPERIENCE-UI-001 : cockpit GodMode progressif
target: codex
status: done
frozen_by: MALEX « Go » 2026-06-29

### scope
- Charger l’Experience Fabric uniquement à la demande depuis le cockpit owner.
- Réunir événements, précédents, analyse et plans candidats.
- Garder un affichage synthétique, explicable et responsive.
- Ne créer aucune Action, rétention mémoire, permission ou sélection automatique.

### verification
- backend complet : 605/605.
- lint frontend/backend, build frontend et diff-check : OK.
- smoke navigateur : chargement volontaire, 17 événements, 2 précédents, 1 proposition ;
  aucune Action créée ; aucun débordement à 390 px.

### updates
> 2026-06-29 codex → done local. Cockpit Experience Fabric vérifié ; publication atomique prête.

---

## TASK-325 — VISIBLE-PREFLIGHT-002 : panneau UI progressif
target: codex
status: done
frozen_by: MALEX « Next » 2026-06-29

### scope
- Étendre la trace d’action existante avec le contrat de préflight lisible.
- Permettre validation/rejet uniquement via la route backend existante.
- Afficher `modify` comme future et désactivée.
- Conserver l’exécution comme geste séparé après validation.

### verification
- backend complet : 605/605.
- lint frontend/backend, build frontend et diff-check : OK.
- smoke navigateur desktop 1280 px et mobile 390 px : panneau visible, aucun débordement.

### updates
> 2026-06-29 codex → done local. Surface UI vérifiée ; publication atomique prête.

---

## TASK-324 — VISIBLE-PREFLIGHT-001 : contrat UI explicable
target: codex
status: done
frozen_by: MALEX « Go » 2026-06-29

### scope
- Enrichir le préflight existant sans créer de moteur parallèle.
- Exposer proposition, ressources concernées, aperçu avant/après et choix bornés.
- Ne jamais recopier le payload métier dans l’explication.
- Ne créer aucune exécution, permission ou automatisation.

### verification
- test ciblé Action Lifecycle : 15/15.
- backend complet : 605/605.
- lint backend, build frontend et diff-check : OK.

### updates
> 2026-06-29 codex → done local. Contrat partagé et moteur vérifiés ; publication atomique prête.

---

## TASK-323 — EXPERIENCE-FABRIC-007B : Blackboard privé contrôlé
target: codex
status: done
frozen_by: MALEX « finir les vagues précédentes avant EXPRESSIVE_CANON » 2026-06-29

### scope
- Consolider les contributions privées du cycle MAPE-K.
- Garder un seul porte-parole sémantique.
- Ne créer aucune Action, aucune rétention mémoire et aucune permission nouvelle.
- Préparer GodMode/Teaching/MasterStory sans construire l'UI dans cette tranche.

### verification
- tests ciblés MAPE-K + Blackboard : 8/8.
- backend complet : 604/604.
- lint backend/frontend, build frontend et diff-check : OK.

### updates
> 2026-06-29 codex → claimed. Tranche 7.2 implémentée localement dans le worktree Experience.
> 2026-06-29 codex → done local. Tranche 7.2 prête à publication atomique.

---

## TASK-322 — EXPERIENCE-FABRIC-007A : Cycle MAPE-K contrôlé
target: codex
status: verified
frozen_by: MALEX « go » 2026-06-29

### scope
- Assembler Event Spine, précédents et storylets dans un cycle Monitor/Analyze/Plan.
- Garder Execute à `not_executed`.
- Ne créer aucune Action et ne retenir aucun résultat automatiquement.
- Préparer le Blackboard sans construire de dialogue multi-personas dans cette tranche.

### verification
- tests ciblés MAPE-K : 5/5.
- tests ciblés Storylet Engine : 4/4.
- tests ciblés Event Spine : 8/8.
- backend complet : 601/601.
- lint backend/frontend, build frontend et diff-check : OK.

### updates
> 2026-06-29 codex → claimed. Tranche 7.1 implémentée localement, validation complète en cours.
> 2026-06-29 codex → done local. Tranche 7.1 prête à publication atomique.
> 2026-06-29 codex → verified. PR #164 mergée sur GitHub main (`da07f38`).

---

## TASK-321 — EXPERIENCE-FABRIC-006C : Monstre-idée Ours d’Or
target: codex
status: verified
frozen_by: MALEX « go » 2026-06-29

### scope
- Projeter naissance V0, mutation et stabilisation candidates depuis un projet/session Ours d'Or.
- Reprendre les verrous legacy de gimmick, empathie, silhouette et non-humiliation.
- Garder nom/lore sous contrôle du créateur.
- Ne pas générer d'image, promouvoir un canon, publier, exporter ou créer une galerie.

### verification
- tests ciblés Project Monster : 5/5.
- tests ciblés Living Companion : 7/7.
- tests ciblés Storylet Engine : 4/4.
- backend complet : 596/596.
- lint backend/frontend, build frontend et diff-check : OK.

### updates
> 2026-06-29 codex → claimed. Tranche 6.3 implémentée localement, validation complète en cours.
> 2026-06-29 codex → done local. Tranche 6.3 prête à publication atomique.
> 2026-06-29 codex → verified. PR #163 mergée sur GitHub main (`8d7fdd4`).

---

## TASK-320 — EXPERIENCE-FABRIC-006B : MOTH Living Companion
target: codex
status: verified
frozen_by: MALEX « go » 2026-06-29

### scope
- Étendre Living Companion à MOTH sans moteur parallèle.
- Exiger une assignation explicite par guide/session.
- Garder MOTH comme garde-fou CDC distinct du persona personnel.
- Ne pas générer d'asset, faire évoluer visuellement, publier, exporter ou appeler un provider.

### verification
- tests ciblés Living Companion : 7/7.
- tests ciblés Storylet Engine : 4/4.
- backend complet : 591/591.
- lint backend/frontend, build frontend et diff-check : OK.

### updates
> 2026-06-29 codex → claimed. Tranche 6.2 implémentée localement, validation complète en cours.
> 2026-06-29 codex → done local. Tranche 6.2 prête à publication atomique.
> 2026-06-29 codex → verified. PR #162 mergée sur GitHub main (`3afee8d`).

---

## TASK-319 — EXPERIENCE-FABRIC-006A : Living Companion / Robot CDC
target: codex
status: verified
frozen_by: MALEX « go » 2026-06-29

### scope
- Projeter un compagnon CDC depuis Guided Runtime, progression et storylets.
- Orienter sans produire le travail à la place du groupe.
- Conserver scope privé, guide figé, persona sans permission et validation humaine sur contradiction.
- Ne pas générer d'asset, faire évoluer le compagnon, publier, exporter ou appeler un provider.

### verification
- tests ciblés Living Companion : 5/5.
- tests ciblés Storylet Engine : 4/4.
- backend complet : 589/589.
- lint backend/frontend, build frontend et diff-check : OK.

### updates
> 2026-06-29 codex → claimed. Tranche 6.1 implémentée localement, validation complète en cours.
> 2026-06-29 codex → done local. Tranche 6.1 prête à publication atomique.
> 2026-06-29 codex → verified. PR #161 mergée sur GitHub main (`84291eb`).

---

## TASK-318 — EXPERIENCE-FABRIC-005 : Visual Narrative Grammar
target: codex
status: verified
frozen_by: MALEX « PLEASE IMPLEMENT THIS PLAN » 2026-06-28

### scope
- Relier D08, références visuelles, canon narratif et thèmes en rapport explicable.
- Garder la politique `explain_only`.
- Ne pas générer, appeler un provider, appliquer un thème, exporter ou canoniser automatiquement.

### verification
- test ciblé Visual Narrative Grammar : 5/5.

### updates
> 2026-06-29 codex → done local. Vague 5 prête à publication.
> 2026-06-29 codex → verified. PR #160 mergée sur GitHub main (`dd76353`).

---

## TASK-317 — EXPERIENCE-FABRIC-004 : Storylet Engine
target: codex
status: verified
frozen_by: MALEX « PLEASE IMPLEMENT THIS PLAN » 2026-06-28

### scope
- Évaluer des storylets candidates depuis Narrative Canon Graph, Precedent Engine et Event Spine.
- Garder la politique `suggest_only`.
- Ne pas exécuter, planifier, canoniser, générer ou changer de mode automatiquement.

### verification
- test ciblé Storylet Engine : 4/4.
- backend complet 579/579, lint backend/frontend, build frontend et diff-check OK.

### updates
> 2026-06-28 codex → done local. Vague 4 prête à publication.
> 2026-06-29 codex → verified. PR #159 mergée sur GitHub main (`0532406`).

---

## TASK-316 — EXPERIENCE-FABRIC-003 : Narrative Canon Graph
target: codex
status: verified
frozen_by: MALEX « PLEASE IMPLEMENT THIS PLAN » 2026-06-28

### scope
- Séparer faits narratifs et présentation sans spoiler.
- Projeter personnages, connaissance, objectifs et setup/payoff.
- Ne pas créer de delta canon, storylet, génération image ou UI dédiée.

### verification
- test ciblé Narrative Canon Graph : 5/5.
- backend complet 575/575, lint backend/frontend, build frontend et diff-check OK.

### updates
> 2026-06-28 codex → done local. Vague 3 prête à publication.
> 2026-06-29 codex → verified. PR #158 mergée sur GitHub main (`5f833a3`).

---

## TASK-315 — EXPERIENCE-FABRIC-002 : Precedent Engine
target: codex
status: verified
frozen_by: MALEX « PLEASE IMPLEMENT THIS PLAN » 2026-06-28

### scope
- Retrouver des cas comparables depuis mémoire, checkpoints, décisions et timeline.
- Toujours demander adaptation + validation humaine avant réutilisation.
- Ne créer ni table de précédents, ni embeddings, ni exécution automatique en V1.

### verification
- test ciblé Experience Fabric : 8/8.
- backend complet 570/570, lint backend/frontend, build frontend et diff-check OK.

### updates
> 2026-06-28 codex → done local. Vague 2 prête à publication.
> 2026-06-29 codex → verified. PR #156 mergée sur GitHub main (`0a3a2ef`).

---

## TASK-314 — EXPERIENCE-FABRIC-001 : Event Spine
target: codex
status: verified
frozen_by: MALEX « PLEASE IMPLEMENT THIS PLAN » 2026-06-28

### scope
- Projeter les événements existants dans une timeline commune permissionnée.
- Ajouter un snapshot explicable sans event store ou replay actif.
- Ne jamais exposer les payloads bruts ni traverser un projet privé par rang global.

### verification
- test ciblé Experience Fabric : 4/4 ;
- lint backend/frontend et diff-check : OK.

### updates
> 2026-06-28 codex → verified. PR #155 mergée sur GitHub main (`63381f5`).

---

## TASK-313 — UI-001C : séparer conversation et messages système
target: codex
status: done
frozen_by: MALEX « go » 2026-06-28

### scope
- Garder le chat métier réservé aux échanges utilisateur/persona.
- Sortir les événements système existants dans une surface compacte dédiée.
- Ne modifier ni le protocole WebSocket, ni l'historique, ni les permissions.

### files créés/modifiés
- `apps/frontend/src/system-messages.tsx`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/styles.css`
- `docs/ui/MASTERFLOW_INTERFACE_EXECUTION_PLAN.md`
- `SUIVI.md`
- `AGENT_TASKS.md`
- `MASTERFLOW_ACTION_QUEUE.md`

### verification
- `npm run lint:frontend` : OK.
- `npm run build:frontend` : OK.
- smoke navigateur : deux tours métier visibles, zéro tour système dans `.chat-log`.
- viewport 390 px : `scrollWidth == clientWidth == 390`.

### updates
> 2026-06-28 codex → done local. Séparation de rendu uniquement ; événements et contrats runtime inchangés.

---

## TASK-311 — UI-001B : Pilotage Control / Admin / Ops
target: codex
status: done
frozen_by: MALEX « go » 2026-06-28

### scope
- Séparer les surfaces privées de pilotage des workspaces métier.
- Ne créer aucun mode backend et ne contourner aucun loadout.
- Conserver les gates `canAdmin`, `canValidate` et `isGodmode`.

### files créés/modifiés
- `apps/frontend/src/control-workspace.tsx`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/styles.css`
- `SUIVI.md`
- `AGENT_TASKS.md`
- `MASTERFLOW_ACTION_QUEUE.md`

### verification
- `npm run lint:frontend` : OK.
- `npm run build:frontend` : OK.
- `npm run lint` : OK.
- `git diff --check` : OK.
- smoke navigateur Control/Admin/Ops : OK.
- viewport 390 px : `scrollWidth == clientWidth == 390`.

### updates
> 2026-06-28 big-pickle → done_unverified. Première séparation locale proposée.
> 2026-06-28 codex → done local. Accès Pilotage réparé hors mode admin, gates et validation teacher vérifiés.

---

## TASK-310 — UI-001A : première extraction App Shell
target: codex
status: done
frozen_by: MALEX « go » 2026-06-28

### scope
- Extraire une première couche App Shell sans changer les comportements runtime.
- Garder `App.tsx` propriétaire des handlers, appels API et décisions d'état pendant cette tranche.
- Isoler les composants présentations : cadre général, situation, navigation de modes.
- Ne pas toucher au backend, aux permissions, aux endpoints, aux seeds, au provider, aux migrations ou au déploiement.

### files créés/modifiés
- `apps/frontend/src/app-shell.tsx`
- `apps/frontend/src/App.tsx`
- `docs/ui/MASTERFLOW_INTERFACE_EXECUTION_PLAN.md`
- `SUIVI.md`
- `AGENT_TASKS.md`
- `MASTERFLOW_ACTION_QUEUE.md`

### verification
- `npm run lint` : OK.
- `npm run build:frontend` : OK.
- `git diff --check` : OK.
- backend local `/health` : OK.
- frontend local `http://localhost:5174` : OK.

### updates
> 2026-06-28 codex → done local. App Shell extrait en composants purement présentations ; aucun contrat backend ou permission modifié.

---

## TASK-309 — Correction frontière Factories : atelier Bureau, primitives Git
target: codex
status: done
frozen_by: MALEX « pas besoin des audits de facto sur git » 2026-06-28

### scope
- Retirer l'audit détaillé des Factories de la couche active Git.
- Retirer le CDC commun de bots de la couche active Git.
- Poser la règle : Factories travaillées dans `/Users/malex/Desktop/FACTORIES/`, Git seulement pour primitives/contrats/guardrails utiles à MasterFlow.
- Conserver un pont Factory → MasterFlow et un routeur de primitives.
- Ne pas toucher aux dossiers Factories actifs.

### files créés/modifiés
- `docs/factories/FACTORY_DESKTOP_WORKSHOP_TO_MASTERFLOW_BRIDGE_2026-06-28.md`
- `docs/factories/FACTORY_PRIMITIVE_ROUTER_2026-06-27.md`
- `docs/source-truth/EXTERNAL_PRIMITIVE_HARVEST_REGISTRY_2026-06-27.md`
- `docs/source-truth/GIT_OPERABLE_SOURCE_OF_TRUTH_AND_EXTERNAL_PRIMITIVE_HARVEST_AUDIT_2026-06-27.md`
- `SUIVI.md`
- `AGENT_TASKS.md`
- `MASTERFLOW_ACTION_QUEUE.md`

### files retirés de la couche active Git
- `docs/factories/FACTORY_PRIMITIVES_AUDIT_PASS_1_2026-06-27.md`
- `docs/factories/FACTORY_COMMON_CDC_2026-06-27.md`

### updates
> 2026-06-28 codex → done local. Frontière corrigée : Factories = atelier Bureau ; Git = primitives MasterFlow seulement.

---

## TASK-308 — D08-GATE-001 : neutraliser route narrative generate-visual
target: codex
status: done
frozen_by: audit D08-VISUAL-REFS-001 2026-06-27

### scope
- Auditer la route `POST /api/v1/narrative/nodes/:id/generate-visual`.
- Empêcher la création directe d'un job image hors action sensible approuvée.
- Conserver la compilation de contexte/manifest pour prévisualisation.
- Ajouter un test HTTP prouvant qu'aucun job `asset_prepare` n'est créé.

### files créés/modifiés
- `apps/backend/src/routers/narrative_runtime.ts`
- `apps/backend/tests/narrative_runtime_router.test.ts`
- `SUIVI.md`
- `AGENT_TASKS.md`
- `MASTERFLOW_ACTION_QUEUE.md`

### verification
- `npx vitest run apps/backend/tests/narrative_runtime_router.test.ts` : 1/1.
- `npm test` : 98 fichiers, 535/535.
- `npm run lint` : TypeScript backend vert.
- `git diff --check` : OK.

### updates
> 2026-06-27 codex → done local. Route neutralisée en `generation_blocked_action_gate`; job image réservé à `create_render_manifest` après action approuvée.

---

## TASK-307 — D08-VISUAL-REFS-001 : taxonomie références visuelles
target: codex
status: done
frozen_by: FACTORY-PRIMITIVES-001 2026-06-27

### scope
- Auditer D08 Git + Factories visuelles en lecture seule.
- Formaliser une taxonomie provenance/droits/confiance, rôle visuel autorisé et statut manifest.
- Mapper la taxonomie avec `VisualReferenceStatusSchema`.
- Verrouiller `GO IMAGE` exact et le rapport DA post-sortie.
- Clarifier que storage/assets privés ne valent pas génération image complète.

### files créés/modifiés
- `docs/d08/D08_VISUAL_REFERENCE_TAXONOMY_AND_FACTORY_REF_GATE_2026-06-27.md`
- `SUIVI.md`
- `AGENT_TASKS.md`
- `MASTERFLOW_ACTION_QUEUE.md`
- `docs/source-truth/EXTERNAL_PRIMITIVE_HARVEST_REGISTRY_2026-06-27.md`

### verification
- Lecture des contrats D08 existants, shared schemas et action registry.
- Aucun code runtime modifié.
- Aucun provider, runner image, Drive ou dossier Factory actif modifié.

### updates
> 2026-06-27 codex → done local. Taxonomie D08 refs créée ; prochain audit sûr : `D08-GATE-001` route narrative `generate-visual`.

---

## TASK-306 — FACTORY-PRIMITIVES-001 : audit des Factories actives
target: codex
status: superseded
frozen_by: MALEX « go » 2026-06-27

### scope
- Ancienne passe d'audit détaillé, désormais remplacée par `TASK-309`.
- Garder seulement le principe : identifier des primitives utiles sans copier les bots autonomes dans MasterFlow.
- Ne plus utiliser cette tâche comme consigne d'audit Git des Factories.

### files remplacés
- Audit détaillé et CDC de bots retirés de la couche active Git par `TASK-309`.
- `docs/factories/FACTORY_PRIMITIVE_ROUTER_2026-06-27.md` reste comme routeur de primitives MasterFlow uniquement.

### verification
- Aucune modification des Factories actives.
- Aucun runtime, provider, migration ou Drive modifié dans cette ancienne passe.

### updates
> 2026-06-27 codex → done local. Primitives communes identifiées ; CDC commun et routeur de primitives créés. Prochaines tranches sûres : `D08-VISUAL-REFS-001`, `MASTERCLASS-SUBJECTS-001`, `MASTERINVENTORY-OCR-001`.
> 2026-06-28 codex → superseded. MALEX corrige la frontière : pas d'audits détaillés Factories dans Git. Les audits/CDC de bots vivent côté Bureau ; Git garde seulement les primitives utiles.

---

## TASK-305 — Source truth : Git opérable + récolte de primitives externes
target: codex
status: done
frozen_by: MALEX « la source de vérité c'est le clone git » 2026-06-27

### scope
- Acter que le repo Git publiable est la vérité opérable.
- Déclasser legacy, ex-canon Drive et Factories en sources candidates tant qu'elles ne sont pas représentées dans Git.
- Créer une matrice initiale des familles externes encore à récolter, rejeter, bloquer ou mettre en queue.
- Corrigé ensuite : ne pas inventorier les Factories actives dans Git ; travailler l'inventaire détaillé côté Bureau.
- Verrouiller la règle : une Factory est un bot/extraction autonome, jamais une brique à importer telle quelle dans MasterFlow.
- Identifier les premiers risques restants : D08 gate narratif, UI/source truth transversal, primitives Factory à remonter seulement si utiles.

### files créés/modifiés
- `docs/source-truth/GIT_OPERABLE_SOURCE_OF_TRUTH_AND_EXTERNAL_PRIMITIVE_HARVEST_AUDIT_2026-06-27.md`
- `docs/source-truth/EXTERNAL_PRIMITIVE_HARVEST_REGISTRY_2026-06-27.md`
- `docs/factories/FACTORY_REQUEST_ROUTING_PROTOCOL_2026-06-27.md`
- `CLAUDE.md`
- `SUIVI.md`
- `MASTERFLOW_ACTION_QUEUE.md`

### verification
- `git fetch --all --prune` OK.
- `HEAD == origin/main` avant modifications locales, SHA `0518db30659b8a009aa4fe492ade345e832450a7`.
- `git diff --check` à exécuter avant publication.

### updates
> 2026-06-27 codex → done local. Doctrine Git opérable posée ; sources externes transformées en registre de récolte de primitives. Les Factories ne sont pas à absorber telles quelles. Prochaine étape recommandée : publier les docs locales puis lancer FACTORY-PRIMITIVES-001.
> 2026-06-27 codex → protocole de routage Factory ajouté : extraction-first, audit existant, nouvelle spec, patch, récolte primitive, queue runtime ou blocage.

---

## TASK-304 — DATAVIZ-001 : Dataviz / Factory→Mode / MasterHelp
target: codex
status: done
frozen_by: MALEX « go faire tous les chantiers » 2026-06-27

### scope
- Auditer documentairement Dataviz / Graph / Widget entre legacy, canon Drive, Git et Factories.
- Poser un contrat candidat Dataviz portable.
- Poser l'arbitrage Factory → Mode MasterFlow candidat.
- Poser `MasterHelp / Situation Companion` comme abstraction de Roadtrip hors GPS.
- Préparer, à l'époque, un prompt Big Pickle pour compléter l'audit/extraction sans canoniser.

### files créés
- `docs/dataviz/MASTERFLOW_DATAVIZ_GRAPH_WIDGET_AUDIT_2026-06-27.md`
- `docs/dataviz/MASTERFLOW_DATAVIZ_PORTABLE_PRIMITIVE_CONTRACT_2026-06-27.md`
- `docs/factories/MASTERFLOW_FACTORY_TO_MODE_ARBITRATION_2026-06-27.md`
- `docs/factories/ROADTRIP_MOTO_PILOT_DATAVIZ_MASTERHELP_PLAN_2026-06-27.md`
- `docs/factories/ROADTRIP_MOTO_FACTORY_PATCH_RECEIPT_2026-06-27.md`
- `docs/masterhelp/MASTERHELP_SITUATION_COMPANION_CANDIDATE_SPEC_2026-06-27.md`
- `docs/archive/opencode-legacy/2026-06-28/BIG_PICKLE_DATAVIZ_FACTORY_MASTERHELP_PROMPT_2026-06-27.md`

### verification
- documentaire Git local uniquement côté repo ; aucun runtime, migration, provider ou canon Drive modifié.
- Factory Roadtrip active patchée hors Git avec archive préalable, ZIP vérifié et SHA consigné.

### updates
> 2026-06-27 codex → done local. À relire avant commit/push ; prochaine étape possible : patch Roadtrip Factory avec archivage ou demander l'audit complémentaire à Big Pickle.
> 2026-06-27 codex → patch Factory Roadtrip V1.4 appliqué localement. Archive créée, ZIP actif vérifié, reçu ajouté. Prochaine étape : test pilote ChatGPT ou publication Git des docs/reçus.
> 2026-06-28 codex → ancien prompt archivé ; toute délégation passe désormais uniquement par `.opencode/INBOX.md`.

---

## TASK-303 — Storage fichier réel D07/D08
target: codex
status: verified
frozen_by: MALEX « toutes » 2026-06-27

### scope
- Upload privé multipart et base64 vers `storage://`.
- Persistance couplée fichier + ligne `generated_assets`, avec nettoyage en cas d'échec BDD.
- Scan Inventory écrit et vérifie l'image réelle au lieu de produire des items mockés.
- Lecture metadata owner-only ; aucun téléchargement public, provider, export ou canon automatique.

### verification
- `npm test` = 97 fichiers, 534/534 tests.
- `npm run lint` = OK.
- `git diff --check` = OK.
- Reçu : `docs/d08/D07_D08_FILE_STORAGE_LOCAL_RECEIPT_2026-06-27.md`.

### updates
> 2026-06-27 codex → verified. PR #147 mergée sur GitHub `main`, SHA `6d8023a`. Snapshot canon Drive à rafraîchir avec cette preuve.

---

## TASK-302 — Codex hardening pré-merge absorption Big Pickle
target: codex
status: verified
frozen_by: MALEX GO 2026-06-27

### scope
- Audit lecture seule des changements Big Pickle.
- Acceptation explicite MALEX : les vrais étudiants du seed peuvent être poussés.
- Patch de sécurité avant merge : owner/project guards, teacher gates, action registry prudent.

### files touchés
- DA runtime : `src/services/da_runtime.ts`, `src/routers/da_runtime.ts`, `tests/da_runtime.test.ts`
- Narrative runtime : `src/services/narrative_runtime.ts`, `src/services/story_characters.ts`, `src/services/story_workbenches.ts`, `src/routers/narrative_runtime.ts`, `tests/narrative_runtime.test.ts`
- Mirrors : `src/services/learning_mirror_engine.ts`, `src/services/style_mirror_engine.ts`, routers + tests
- Competencies/gamification : services, routers, tests
- Action registry : `src/seeds/action_registry_seed.v1.json`
- Suivi : `CLAUDE_LOG.md`, `SUIVI.md`

### verification
- `npm test` = 96 fichiers, 529/529 tests
- `npm run lint` = OK

### updates
> 2026-06-27 codex → verified. Les briques Big Pickle restent absorbées, mais les capacités sensibles ne sont plus exposées comme faux-live sans validation.

---

## TASK-001 — Infrastructure : AGENT_TASKS + CLAUDE_LOG
target: claude-code
status: verified
frozen_by: MALEX décision orale 2026-06-26

### steps
1. Créer AGENT_TASKS.md (ce fichier)
2. Créer CLAUDE_LOG.md
3. Poser la structure avant toute absorption

### updates
> 2026-06-26 claude-code → done. Fichiers créés, structure prête.

---

## TASK-002 — Seed pedagogical_error_patterns
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire _ERRORS_DATASET.json — source introuvable (ni Drive ni legacy)
2. 15 patterns déjà seedés dans pedagogical_error_patterns_seed.json (seed-err-001 à 015)
3. Table déjà créée dans schema.ts, INSERT OR IGNORE dans seed.ts
4. Pas de source Drive à ajouter

### verification
- npm run lint = 0
- npm test = 485/485
- SELECT count(*) FROM pedagogical_error_patterns = 15

### updates
> 2026-06-27 claude-code → done. Source _ERRORS_DATASET.json introuvable ; 15 patterns déjà présents dans le seed. Aucune action nécessaire.

---

## TASK-301 — Synthèse narrative + DA bridge (Build 1A/1B + Phase 2/3) — JUIN 2026
target: claude-code
status: verified
frozen_by: SYNTHESE_NARRATIVE_DA_JUIN2026

### scope
- **Build 1A** : bridge engine `story_da_bridge.ts`, characters CRUD (`story_characters.ts`), visual gen endpoint avec executor, reader spoiler filtering, 19 tests
- **Build 1B** : canon lock, action registry alignment (0 future, 2 out_of_scope, 35 actions live), `layer_data_json` enrichi (12 layers), Batrasia seed (8 arcs, 8 chars) enrichi lore complet
- **Phase 2** : ProfKrapu/MasterFlex config enrichie, owner registry (8 entrées)
- **Phase 3** : Ours d'Or factory seedée (6 arcs, 6 chars), fix flaky test rooms_auth
- **Seed DA** : gates (14), layers (12), actions (35), owners (8) en seeds/*.json
- **Routes CRUD complètes** : deleteNode/deleteEvent, reorderNodes, get/update/delete workbench, get/approve/reject manifest, filter manifests by workbench/node
- **Scènes seed** : 15 scènes Batrasia + 9 scènes Ours d'Or sous les arcs

### files créés/modifiés
- `src/engines/story_da_bridge.ts` — compile_da_context, intent resolver (10 archetypes), post-gen gates (5)
- `src/engines/executors.ts` — generate_scene_visual, create_render_manifest
- `src/services/story_characters.ts` — CRUD avec canon lock
- `src/services/narrative_runtime.ts` — nodes/events + deleteNode/deleteEvent/reorderNodes
- `src/services/story_workbenches.ts` — CRUD + canon lock + getStoryWorkbench
- `src/services/visual_manifests.ts` — CRUD + approveVisualManifest/rejectVisualManifest
- `src/routers/narrative_runtime.ts` — 9 routes narratives
- `src/routers/story_workbenches.ts` — 8 routes workbench
- `src/routers/visual_manifests.ts` — 7 routes manifest
- `src/db/seed.ts` — seed complet (personas, 3 workbenches, 24 scènes, registry seeds)
- `src/seeds/*.json` — da_gate (14), da_layer (12), action_registry (35+), owner_registry (8)
- `tests/narrative_runtime.test.ts` — 40 tests
- `tests/action_lifecycle.test.ts` — 15 tests
- `tests/runtime_loadout.test.ts` — 3 tests

### verification
- npm run lint = 0
- npm test = 485/485 (92 fichiers)
- npm run seed = idempotent (INSERT OR IGNORE)

### notes
- Registres DA en `src/seeds/` (pas `seeds/absorption/`) : gate_data_json, layer_data_json lus dynamiquement
- NARRATIVE_RUNTIME_API dans shared à mettre à jour avec les nouvelles routes
- approve/reject manifest non connecté à validation_inbox (flux direct)
- TASK-004 superseded par cette implémentation (registres DA déjà seedés)

### updates
> 2026-06-27 claude-code → done

---

## TASK-003 — Seed 227 étudiants complémentaires
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Comparer STUDENT_FAST_INDEX.json (227) avec le seed P1 existant (333)
2. Dédoublonnage par slug → 227/227 déjà présents dans le seed existant
3. Les 106 étudiants surnuméraires du seed sont des cohorts supérieures (3-5) non couvertes par le Fast Index
4. Aucun nouvel étudiant à ajouter

### verification
- npm run lint = 0
- npm test = 485/485
- Fast Index 227 slugs × existing seed 333 slugs → intersection = 227, delta Fast = 0

### updates
> 2026-06-27 claude-code → done. Fast Index entièrement contenu dans le seed existant. Aucun ajout nécessaire.

---

## TASK-004 — Seed registres DA (gates, layers, roles, payload)
target: claude-code
status: superseded
frozen_by: audit absorption 2026-06-27

### steps
SUPERSEDED par Build 1B : tables da_gate_registry + da_layer_registry créées dans schema.ts, seeds/*.json (14 gates, 12 layers) lus dynamiquement par seed.ts depuis la legacy archive. VISUAL_REFERENCE_ROLE_REGISTRY et IMAGE_GENERATION_PAYLOAD_SCHEMA existent dans la legacy archive mais non utilisés (périmètre DA/assets futur).

### updates
> 2026-06-27 claude-code → superseded. Déjà implémenté dans Build 1B.

---

## TASK-005 — Seed RAG allowlist
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire RAG_ALLOWLIST.json (legacy archive, KERNEL_RC/registries/) — 5 release_resources
2. Table rag_allowlist déjà créée dans schema.ts (INSERT OR IGNORE)
3. Seeds/rag_allowlist_seed.json déjà présent avec les mêmes 5 entrées (correspondance 5/5)
4. La source contient aussi des meta (policies, excluded_by_default, refusal_conditions) — stockées dans les 5 entrées existantes

### verification
- npm run lint = 0
- npm test = 485/485
- 5 resources identiques source vs seed (kernel_authority_contract, personal_canon_pipeline, kernel_capability_cards, kernel_schemas, release_manifest)

### updates
> 2026-06-27 claude-code → done. Les 5 ressources RAG ALLOWLIST sont déjà dans le seed. Aucune modification nécessaire.

---

## TASK-006 — Seed opportunity + owner registries
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire opportunity_registry_initial.json (Drive canon, 06_REGISTRIES/) — 19 opportunities
2. Lire owner_registry_initial.json (Drive canon, 06_REGISTRIES/) — 7 owners système
3. Tables déjà créées dans schema.ts (opportunity_registry, owner_registry)
4. Créer opportunity_registry_seed.json (19 items transformés du Drive)
5. Mettre à jour owner_registry_seed.json (8 existants + 7 Drive = 15 total)
6. INSERT OR IGNORE déjà dans seed.ts

### verification
- npm run lint = 0
- npm test = 485/485
- opportunity_registry = 19 entrées
- owner_registry = 15 entrées (8 originaux + 7 système)

### updates
> 2026-06-27 claude-code → done. Opportunity registry seedée (19 items). Owner registry enrichie (8→15).

---

## TASK-007 — Seed pedagogical routing + subject library
target: claude-code
status: verified
frozen_by: audit absorption 2026-06-27

### steps
1. Lire ROUTING_PEDAGO_LEGACY.json (19614 lignes) — 49 vidéos avec notions/chapitres
2. Structurer : chaque vidéo = 1 row avec colonnes clés (video_id, title, duration, software, topics, url, data_json)
3. Créer table pedagogical_video_resources dans schema.ts
4. Créer pedagogical_video_resources_seed.json (49 items)
5. Importer dans seed.ts (INSERT OR IGNORE dans registryTx)

### constraints
- Garder la structure exacte des données source (chapitres/notions dans data_json)
- Pas de routes ni services (seulement le seed)

### verification
- npm run lint = 0
- npm test = 485/485
- pedagogical_video_resources = 49 entrées (1 par vidéo)

### updates
> 2026-06-27 claude-code → done. 49 vidéos seedées dans pedagogical_video_resources.
