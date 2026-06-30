# SUIVI — MasterFlow

Journal de construction. Le quoi/pourquoi, daté et concis.

---

## VAGUE ACTIVE — reprise anti-coupure crédits

- id : `PUBLICATION-GROUPED-REVIEW-001`
- objectif : décider si la pile locale du rush système sans UI doit être publiée en PR groupée ou découpée.
- statut : `awaiting_malex_validation`
- dernière action terminée : cohérence globale verte après Expressive Canon et Resources/Outputs.
- prochaine action : si MALEX valide, préparer le contrat de publication puis commit/push/PR ; sinon continuer audit ou découper.
- fichiers/domaines concernés : Orientation Fabric, Inventory, Resources, DA assets, Expressive Canon, Security/Trust, Factory Backflow.
- tests à relancer : aucun avant décision ; relancer backend complet, lint, build frontend et `git diff --check` juste avant publication.
- publication : aucune ; branche locale `codex/visual-knowledge-fabric`, base GitHub `730e912`.
- blocage : aucun ; UI, génération, canonisation, import massif DA, migration de données, provider voix/image et runner live restent fermés.

## 2026-06-30 — GLOBAL-COHERENCE-TESTS-001 : rush système sans UI vérifié

- backend complet : 127 fichiers, 699/699 tests ;
- lint backend : OK ;
- build frontend de sécurité : OK ;
- `git diff --check` : OK ;
- aucune UI étendue dans cette tranche ;
- aucun provider, génération, canonisation, migration, import massif, déploiement ou publication.

Statut : pile locale prête pour décision MALEX : publication groupée, découpage, ou poursuite audit.

## 2026-06-30 — INVENTORY-RESOURCES-OUTPUTS-001 : carte Resources / Outputs

- ajout du contrat `ResourceOutputCapabilityMap` ;
- ajout du service `buildResourceOutputCapabilityMap` ;
- ajout de l’endpoint admin `GET /api/v1/diagnostics/resource-output/capability-map` ;
- la carte distingue Resource Truth, RAG projection, Visual Manifests, Generated Assets et Output Registry futur ;
- invariants explicites : ressource candidate non servie par défaut, manifest ≠ génération, asset candidat à revoir, export/live sous gate humain ;
- raccord Orientation Fabric via `resource_output_capability_map`.

Vérifications :

- `npx vitest apps/backend/tests/resource_output_capability_map.test.ts apps/backend/tests/orientation_fabric.test.ts` — 6/6 ;
- `npm run lint` — OK.

Statut : local, non publié.

## 2026-06-30 — EXPRESSIVE-CANON-VOICE-001 : carte Style Mirror / Voice

- ajout du contrat `ExpressiveCanonCapabilityMap` ;
- ajout du service `buildExpressiveCanonCapabilityMap` ;
- ajout de l’endpoint admin `GET /api/v1/diagnostics/expressive-canon/capability-map` ;
- Style Mirror reste la base : aucune table `behavior_profiles` concurrente ;
- la carte compte profils actifs, injectables, pending consent et revoked ;
- policy explicite : consentement sujet, révocation effective, pas de texte source privé, pas d’effet sur permissions/faits/sources/méthode ;
- TTS reste partiel et verrouillé : cette carte ne déclenche aucun provider voix ;
- raccord Orientation Fabric via `style_mirror_expressive_canon`.

Vérifications :

- `npx vitest apps/backend/tests/expressive_canon_capability_map.test.ts apps/backend/tests/orientation_fabric.test.ts` — 6/6 ;
- `npm run lint` — OK.

Statut : local, non publié.

## 2026-06-30 — ORIENTATION-FABRIC-001 : rush système sans UI

- UI/prototype retiré du rush système ; l’autre conversation peut le traiter séparément ;
- audit transversal ajouté : `docs/experience-fabric/SYSTEM_ORIENTATION_FABRIC_AUDIT_2026-06-30.md` ;
- ajout d’un contrat partagé `MasterFlowOrientationSnapshot` ;
- ajout d’une couche backend `orientation_fabric` diagnostic-only ;
- endpoint `GET /api/v1/experience/orientation` ;
- la boussole lit actions, runtime packs, Visual Knowledge Fabric et routeur factories externe ;
- le kernel visuel reste sans entités/outputs propriétaires mais reçoit des jauges système génériques
  pour morphologie, style, texture, détail, couleur, acting, continuité et lisibilité output ;
- les gaps Story, Inventory, Security, Voice et Teaching sont maintenant visibles comme cartes système,
  sans être présentés comme actions exécutables si leur contrat est incomplet ;
- les factories restent candidates externes : aucun pack n’est importé ;
- les prochaines actions candidates sont proposées depuis les capacités disponibles, sans exécution ;
- invariants exposés : pas d’exécution, pas de permission nouvelle, pas d’import Factory complet, UI hors rush.

Statut : local, non publié.

Vérifications locales :

- `npx vitest apps/backend/tests/orientation_fabric.test.ts apps/backend/tests/visual_knowledge_fabric.test.ts` — 16/16 ;
- `npm run lint` — OK ;
- `npm test` — backend complet 124 fichiers, 694/694 ;
- `npm run build:frontend` — OK ;
- `git diff --check` — OK.

## 2026-06-30 — ORIENTATION-FABRIC-002 : cartes système renforcées

- Story : `narrative_canon_graph` et `storylet_engine` explicités ;
- Inventory : gap verrouillé `inventory_registry_gap`, pour éviter de prétendre que le registry explicable est fini ;
- Security : `security_guard_and_safety_state` + `trust_fabric` visibles ;
- Personas/Voice : `style_mirror_expressive_canon` et `voice_persona_tts` verrouillés par consentement/provider/coût ;
- Teaching : `teaching_learning_integrity` visible comme fondation partielle ;
- aucune UI, aucun provider, aucune permission, aucune importation Factory.

Vérifications :

- `npx vitest apps/backend/tests/orientation_fabric.test.ts` — 5/5 ;
- `npm run lint` — OK ;
- `git diff --check` — OK.

Statut : local, non publié.

## 2026-06-30 — FACTORY-BACKFLOW-NATIVE-001 : carte de routing native

- ajout du contrat `FactoryBackflowCapabilityMap` ;
- ajout du service `buildFactoryBackflowCapabilityMap` ;
- ajout de l’endpoint admin `GET /api/v1/backflow/capability-map` ;
- la carte expose les décisions possibles : primitive MasterFlow, dual track, workshop, blocked ;
- les interdits restent explicites : import complet, ZIP direct, fetch externe, auto-canon, activation runtime ;
- raccord dans Orientation Fabric via `factory_backflow_capability_map` ;
- aucune Factory Desktop importée, aucun fichier externe dereferencé, aucune canonisation.

Vérifications :

- `npx vitest apps/backend/tests/factory_backflow_intake.test.ts` — 6/6 ;
- `npm run lint` — OK ;
- `git diff --check` — OK.

Statut : local, non publié.

## 2026-06-30 — INVENTORY-CAPABILITY-MAP-001 : carte Inventory scoped

- ajout du contrat `InventoryCapabilityMap` ;
- ajout de `buildInventoryCapabilityMap(actor, projectId)` ;
- ajout de l’endpoint `GET /api/v1/inventory/capability-map` ;
- compte uniquement les items/collections lisibles par l’acteur ;
- expose les primitives : items, collections, besoins projet, OCR/photo candidates, outputs futurs ;
- verrouille les invariants : candidate ≠ canon, disponibilité jamais garantie, matching consultatif, OCR à relire ;
- raccord dans Orientation Fabric via `inventory_registry_gap` maintenant disponible comme capability map.

Vérifications :

- `npx vitest apps/backend/tests/inventory_core.test.ts apps/backend/tests/orientation_fabric.test.ts` — 14/14 ;
- `npm run lint` — OK ;
- `git diff --check` — OK.

Statut : local, non publié.

## 2026-06-30 — SECURITY-TRUST-FABRIC-001 : carte Security/Trust

- ajout du contrat `SecurityTrustCapabilityMap` ;
- ajout du service `buildSecurityTrustCapabilityMap` ;
- ajout de l’endpoint admin `GET /api/v1/diagnostics/security-trust/capability-map` ;
- la carte relie Security Guard, Trust Fabric et Safety State ;
- policy explicite : curiosité autorisée, explication pédagogique autorisée, inputs suspects warn/refuse ;
- aucun ban automatique : sanction/rétablissement restent godmode manuels ;
- raccord Orientation Fabric via `security_guard_and_safety_state`.

Vérifications :

- `npx vitest apps/backend/tests/security_trust_capability_map.test.ts apps/backend/tests/orientation_fabric.test.ts` — 6/6 ;
- `npm run lint` — OK ;
- `git diff --check` — OK.

Statut : local, non publié.

## 2026-06-30 — VISUAL-KNOWLEDGE-FABRIC-001 : contrat

- construire l'encyclopédie graphique exécutable avant d'y absorber les bibles DA ;
- conserver un kernel vide capable de refuser proprement les entités, layers ou outputs inconnus ;
- adapter le registre DA historique en lecture seule au lieu de créer un quatrième cerveau ;
- rendre layers, jauges, références, outputs et règles réellement composables ;
- produire un `CompiledVisualPlan` déterministe et explicable, jamais un prompt provider ;
- conserver Theme Studio comme fondation du futur DA Studio ;
- ne générer, canoniser, publier ou importer aucun asset réel.

Implémentation locale :

- kernel vide versionné, sans contenu DA propriétaire ;
- projection explicite de l'ancien registre, jamais assimilée au nouveau canon ;
- composition déterministe des layers, héritages, incompatibilités, jauges, outputs et annotations ;
- refus des traits obligatoires absents et des overrides sur traits verrouillés ;
- `CompiledVisualPlan` explicable, sans prompt provider ni génération ;
- DA Studio : lecture du kernel, projection historique, comptages et compilation d'un plan témoin ;
- Living Entity Kernel : définitions, assignations, paliers, signaux, propositions d'évolution et Codex ;
- aucune évolution, génération ou canonisation automatique.

Vérifications finales locales :

- 12/12 tests ciblés ;
- backend complet : 123 fichiers, 685/685 tests ;
- `npm run lint` — OK ;
- `npm run build:frontend` — OK ;
- `git diff --check` — OK.
- smoke navigateur : kernel vide, projection historique, lint et plan témoin — OK ;
- responsive 390 px : aucun débordement horizontal.

Statut : implémentation locale vérifiée, non commitée et non publiée.

## 2026-06-30 — VISUAL-KNOWLEDGE-FABRIC-009A : workbench DA Studio

- Explorer : choix de l'entité et lecture de sa famille ;
- Output Lab : sélection d'une recette et lecture de ses contraintes ;
- Layer Composer : layers hérités visibles et activation non destructive de layers optionnels ;
- Gauge Console : réglages bornés par les plages sûres du registre ;
- Reference Board : rôle, région, droits et provenance des références assignées ;
- compilation : stack, jauges finales, conflits, manques et hash déterministe ;
- Theme Studio reste un module du DA Studio ;
- aucune persistance, génération, canonisation ou import massif.

Vérifications :

- build frontend — OK ;
- lint — OK ;
- 12/12 tests ciblés — OK ;
- smoke réel : sélection de la couche Ours d'Or et recompilation du plan — OK ;
- responsive 390 px : aucun débordement horizontal.

Statut : local uniquement, publication groupée différée à la demande de MALEX.

## 2026-06-30 — VISUAL-KNOWLEDGE-FABRIC-010A : pont D08 candidat

- projette un `CompiledVisualPlan` en demande D08 lisible ;
- conserve entités, racine, layers, filtres, output, provenance et annotations ;
- sépare les annotations du registre des vrais `visual_reference_ids` persistés ;
- impose une revue owner avant matérialisation des références ;
- bloque si le plan contient un conflit canon ou une donnée obligatoire absente ;
- `persistence_allowed=false`, `generation_allowed=false`, `canon_promotion_allowed=false`.

Vérifications :

- 13/13 tests ciblés — OK ;
- lint — OK ;
- build frontend — OK.

Statut : local uniquement, aucun manifest D08 écrit.

## 2026-06-30 — VISUAL-KNOWLEDGE-FABRIC-011 : pilotes minimaux

- personnage humain fictif → avatar ;
- décor neutre fictif → scène ;
- objet symbolique fictif → scène avec render layer ;
- MasterFlex → projection historique explicite ;
- monstre projet et MOTH → même Living Entity Kernel ;
- outputs et candidats D08 restent sans génération ni canonisation.

Vérifications :

- 16/16 tests ciblés — OK ;
- lint — OK ;
- `git diff --check` — OK.

Statut : capacités génériques prouvées ; aucun contenu pilote promu dans le registre actif.

## 2026-06-30 — SUIVI-CLEANUP-001 : DA-002 publiée et reprise DA-003

- correction du checkpoint anti-coupure : DA-002 n'est plus en attente locale ;
- publication confirmée : PR #211, merge `c99cd0d` ;
- prochaine vague explicitée : `DA-REGISTRY-ACTING-003`, cas pilotes resolver DA ;
- aucune modification runtime, aucun provider, aucune génération image, aucune canonisation.

Statut : local, prêt pour publication documentaire si souhaité.

## 2026-06-30 — DA-REGISTRY-ACTING-002 : surface “pourquoi ce visuel ?”

Contrat :

- exposer le resolver DA Registry déjà publié ;
- permettre de lire stack DA, acting, références, jauges, gates, negative locks et manques ;
- intégrer une surface dans Theme Studio et D08 ;
- ne pas générer d’image ;
- ne pas canoniser d’asset ;
- ne pas modifier backend, schéma, permissions, provider ou pipeline de génération.

Implémentation locale vérifiée :

- `getVisualDaResolverPreview` ajouté au client frontend ;
- nouveau composant `VisualDaPreviewPanel` réutilisable ;
- Theme Studio affiche un bloc `Resolver DA Registry` avec contrôles persona/surface/état/couche ;
- D08 peut préparer l’explication DA depuis un manifest sélectionné ;
- affichage : statut, stack, acting narratif, références typées, jauges DA, gates, manques, interdits et cartes d’explication.

Vérifications :

- `npm run build:frontend` — OK ;
- `npm run lint` — OK ;
- `git diff --check` — OK ;
- `npm test` — backend complet 121 fichiers, 673/673.

Statut : publié via PR #211 (`c99cd0d`).

## 2026-06-30 — UI-PROTOTYPE-NAVIGATION-001 : protocole de visionnage Vincent

Objectif : permettre à Vincent de voir rapidement le prototype d’interface sans confondre avec le runtime final.

Périmètre :

- prototype navigable local, frontend uniquement ;
- Home / dock de navigation / actions rapides / panneaux contextuels / persona rail / chat mocké ;
- assets locaux `masterflex-ui-v2.png` et `profkrapu-ui-v2.png` ;
- aucun backend nouveau, aucune permission, aucune donnée réelle, aucune génération image.

Pour tester depuis le repo :

```bash
git pull
npm install
npm run dev:frontend
```

Puis ouvrir :

```txt
http://localhost:5174/current-ui
```

À regarder en priorité :

- barre latérale gauche : icônes seules au repos, dépliage au survol ;
- Home : cockpit léger, état actif et actions principales ;
- personas : MasterFlex à gauche, ProfKrapu comme interlocuteur consulté ;
- chat : bulles différenciées, contexte visible, logique de simulation ;
- cohérence DA : sobre, RPG assumé mais pas criard.

Points à ne pas juger comme runtime final :

- les messages sont mockés ;
- les états persona ne sont pas encore reliés au resolver DA ;
- les assets sont des placeholders de prototype, pas des assets canon définitifs ;
- aucune sauvegarde utilisateur ni appel backend n’est ajouté par cette tranche.

Retour demandé à Vincent :

- la navigation est-elle claire ?
- le dock rétractable est-il confortable ?
- la lecture Home / chat / personas tient-elle en usage quotidien ?
- qu’est-ce qui doit rester prototype et qu’est-ce qui peut devenir composant runtime ?

Statut : publié via PR #210 (`1b6c132`).

## 2026-06-30 — DA-REGISTRY-ACTING-001 : contrat de tranche

- absorber uniquement les sources legacy utiles au registre DA/narratif, pas relancer un audit géant ;
- poser MasterFlow Core comme racine DA et Ours d’Or comme couche événementielle branchable ;
- piloter d’abord `masterflex-001` : canon visuel, acting, refs, anti-dérives et sorties UI/avatar ;
- produire un resolver preview explicable : stack DA, acting, refs, briques, gates, negative locks, manques ;
- ne générer aucune image, ne canoniser aucun asset, ne toucher à aucun provider ;
- séparer ProfKrapu/Batrasia/Nicok en couches dédiées ou candidates sans polluer la racine globale.

Implémentation locale vérifiée :

- nouveaux contrats partagés `VisualDaRoot`, `VisualDaLayer`, `VisualEntityProfile`,
  `VisualClassProfile`, `VisualAtomicBrick`, `VisualReferenceBoard`, `VisualPipelineSlice`,
  `NarrativeActingProfile` et `VisualDaResolverPreview` ;
- seed déclaratif `visual_da_registry_seed.v1.json` avec MasterFlow Core, MasterFlex, Ours d’Or,
  ProfKrapu, Batrasia, Nicok, classes de rôles, briques, planches et slices ;
- complément 001b depuis les factories Ours d’Or / Badge / ProfKrapu :
  ProfKrapu comme entité dédiée, acting science-pulp, rôles Ours d’Or fins, badge container,
  politique logo officiel et jauges DA ;
- service `visual_da_registry` : preview only, aucune génération, aucune canonisation ;
- endpoint authentifié `/api/v1/experience/da-registry/preview` ;
- audit ciblé documenté dans `docs/experience-fabric/DA_REGISTRY_NARRATIVE_ACTING_ABSORPTION_2026-06-30.md`.

Vérifications :

- `npx vitest apps/backend/tests/visual_da_registry.test.ts` — 8/8 ;
- `npm run lint` — OK ;
- `git diff --check` — OK ;
- `npm test` — backend complet 121 fichiers, 673/673 ;
- `npm run build:frontend` — OK.

Statut : publié via PR #209 (`760e70f`).

## 2026-06-30 — UI-005-CLASS-PROJECTION : contrat de tranche

- consommer l'endpoint existant du `LivingCompanion` pour une session guidée CDC ;
- afficher uniquement un compagnon réellement assigné, jamais un subpersona inventé ;
- projection plein écran : rôle, bulle, question, progression, contexte et limites ;
- micro marqué indisponible tant qu'aucun adapter STT live n'est prouvé ;
- fallback texte par retour direct au formulaire réel du sujet guidé ;
- aucun dialogue autonome, génération d'asset, météo collective, backend ou permission nouvelle.

Implémentation vérifiée :

- client frontend de l'endpoint Living Companion existant ;
- chargement limité aux sessions actives CDC et compagnon réellement assigné ;
- projection plein écran avec identité, rôle, bulle, question, progression et contexte ;
- fallback visuel clairement provisoire ; fermeture, touche Échap et retour cockpit ;
- micro indiqué indisponible et réponse routée vers le formulaire guidé existant.

Vérifications : backend complet 665/665 ; lint backend/frontend ; build frontend ;
`git diff --check`.

Statut : publié via PR #207 (`931c796`).

## 2026-06-30 — UI-004-TEACHING-COCKPIT : contrat de tranche

- réutiliser `TeachingReadiness`, les cohortes, rosters, sujets, assignments, corrections et revues ;
- afficher d'abord classe/cohorte, état synthétique, prochaine action et alertes importantes ;
- conserver le sujet guidé et l'aide pédagogique visibles ;
- regrouper les formulaires de fabrication/correction dans un atelier avancé fermé au repos ;
- ne pas inventer de météo de classe tant que le runtime ne la calcule pas à ce scope ;
- aucun backend, endpoint, permission, schéma, provider ou migration.

Implémentation vérifiée :

- cohorte active, roster, sujets, assignments, corrections et alertes synthétisés ;
- prochain geste sûr issu des données Teaching existantes, avec rafraîchissement explicite ;
- aide pédagogique et sujet guidé gardés visibles ;
- identités, sujets, rosters, barèmes et corrections regroupés dans un atelier fermé au repos ;
- météo collective signalée indisponible au lieu d'être inférée depuis un utilisateur.

Vérifications : backend complet 665/665 ; lint backend/frontend ; build frontend ;
`git diff --check`.

Statut : publié via PR #205 (`fb348b6`).

## 2026-06-30 — UI-003-ADAPTIVE-PROJECT-PAGE : contrat de tranche

- créer une structure réutilisable : contexte, résumé, statut, prochaine action, zone métier et
  colonne contextuelle ;
- l'appliquer au mode Project qui possède déjà projets, membres, ressources et permissions ;
- préserver les appels API, la sélection de projet et le rattachement de ressource existants ;
- ne pas généraliser aux classes/sujets tant que cette première verticale n'est pas validée ;
- aucun backend, endpoint, permission, schéma, provider ou migration.

Implémentation vérifiée :

- composant `AdaptiveWorkspacePage` borné à la composition visuelle, sans inférence métier ;
- Project expose projet actif, statut, prochaine action réelle, ressources et personnes liées ;
- colonne contexte masquable localement, sans préférence persistante inventée ;
- états vides et absence de rôle explicités sans surclasser l'utilisateur ;
- anciens appels Project/Scope et contrôles de rattachement inchangés.

Vérifications : backend complet 665/665 ; lint backend/frontend ; build frontend ;
`git diff --check`.

Statut : publié via PR #203 (`74f7a5c`).

## 2026-06-30 — UI-002-PERSONA-RAIL-CHAT : contrat de tranche

- persona actif visible sur la Home avec nom, domaine, état courant et statut d'asset explicite ;
- fallback graphique local si aucun asset validé n'est disponible ;
- chat compact au repos, extensible à la demande, attribution claire des tours ;
- aides disponibles dans la room affichées sans prétendre les inviter ni leur donner des droits ;
- WebSocket, porte-parole unique, permissions, historique et messages système inchangés ;
- aucun backend, schéma, provider, migration, génération ou canonisation.

Implémentation vérifiée :

- état persona dérivé uniquement du socket, du texte saisi et du tour conversationnel courant ;
- fallback visuel teinté par la palette déclarée, sans prétendre disposer d'un asset canon ;
- actions `Parler`, `Aide` et `Détails` sans exécution métier silencieuse ;
- chat extensible au focus, historique borné visuellement et TTS existant conservé ;
- tri stable des audits RAG par `created_at, rowid` pour éviter deux événements à la même
  milliseconde ; aucun runtime Security/RAG modifié.

Vérifications : RAG ciblé 12/12 ; backend complet 665/665 ; lint backend/frontend ; build
frontend ; `git diff --check`.

Statut : publié via PR #201 (`8d41ea9`).

## 2026-06-29 — RED-TEAM-TESTS-003 : permissions router et UI Safety

- ajout d'un test routeur prouvant qu'une tentative répétée remonte `suspicious` sans sanction,
  sans publication finale et sans modification de permission ;
- ajout d'un test d'intégration prouvant que les gates admin/diagnostics ne bloquent pas
  `/pedagogical-assistance/classify` pour un étudiant authentifié ;
- aucun runtime, schéma, permission, provider, UI ou migration modifié.

Vérifications : assistance pédagogique routeur + ordre des gates 7/7 ; ciblés Red Team
Security/RAG/assistance/gates 31/31 ; backend complet 665/665 ; lint backend/frontend ;
`git diff --check`.

Statut : publié via PR #199 (`58992b2`).

## 2026-06-29 — RED-TEAM-TESTS-002 : auth, révocation et rôle effectif

- ajout d'un test prouvant qu'un token explicitement révoqué est refusé immédiatement ;
- ajout d'un test prouvant qu'un JWT avec rôle surclassé ne traverse pas l'autorité BDD ;
- aucune modification du middleware, des permissions, des sessions, du schéma ou des routes.

Vérifications : auth ciblé 9/9 ; backend complet 663/663 ; lint backend/frontend ;
`git diff --check`.

Statut : publié via PR #197 (`629e190`).

## 2026-06-29 — RED-TEAM-TESTS-001 : injection, RAG poisoning et Safety

- ajout de tests Security Guard pour percent-encoding, sortie de scope, outil sans validation et
  markup caché ;
- ajout d'un test RAG end-to-end : une requête obfusquée ne produit aucune citation fiable ;
- ajout de tests Safety : `tool_misuse` devient suspicieux et le hard-stop réel prime sur tout ;
- aucun runtime, schéma, permission, provider, UI ou migration modifié.

Vérifications : ciblés Security Guard, RAG service/router, Trust Fabric, Safety State et
intégrité pédagogique 51/51 ; backend complet 661/661 ; lint backend/frontend ; `git diff --check`.

Statut : publié via PR #196 (`d63efc9`).

## 2026-06-29 — OBSERVABILITY-GODMODE-RECONCILIATION-001 : cockpit existant confirmé

- confirmation que `OwnerCockpit` et `ExperienceCockpit` existent déjà côté frontend ;
- confirmation des endpoints privés `/diagnostics/owner-cockpit`, `/diagnostics/trust`,
  `/diagnostics/safety-state` et `/diagnostics/token-usage` ;
- décision de ne pas créer de dashboard parallèle ni de nouvelle queue d'alertes ;
- Observabilité/GodMode reste un agrégateur lisible : timeline, précédents, recommandations,
  confiance, Safety, coûts, stale actions et hard-stop ;
- prochaine tranche utile : `RED-TEAM-TESTS-001`.

Vérifications : preflight GitHub/local, lecture cockpit/inbox, recherche ciblée OwnerCockpit,
ExperienceCockpit, diagnostics, trust, safety-state et token usage, puis tests ciblés
OwnerCockpit/token usage 13/13.

Statut : publié via PR #195 (`46c1646`).

## 2026-06-29 — UI-PROGRESSIVE-LEARNING-001 : publication GitHub

La surface Learn a été publiée via PR #194 (`b29366a`). Le statut local “à publier” est donc
clos : GitHub `main` contient le workspace Learn lazy-loadé, le profil self-read et le cadre
d'aide Learn.

## 2026-06-29 — UI-PROGRESSIVE-LEARNING-001 : premier workspace Learn

- ajout d'un workspace Learn chargé uniquement à l'ouverture du mode ;
- lecture du profil d'aide courant, sans édition ;
- profil brouillon clairement marqué comme non appliqué comme vérité ;
- réutilisation du cadre d'aide avec intentions adaptées à Learn ;
- sources fiables comptées, ressources candidates maintenues hors vérité ;
- aucun autoplay, rendu final, note, publication ou action automatique.

Vérifications : backend 654/654, lint backend/frontend, build frontend, chunks Learn séparés,
smoke navigateur desktop/mobile 390 px et `git diff --check`.

Statut : publié via PR #194 (`b29366a`).

## 2026-06-29 — LEARNING-MODE-ACCESS-001 : accès Learning borné

- ajout additif de `learning` au cycle des Home Vincent/MALEX, sans retirer aucun mode ;
- action de lecture du profil Learning disponible dès `student` ;
- lecture autorisée uniquement pour son propre profil ou un scope déjà autorisé ;
- écritures de profil, statuts et contextes d'aide toujours limitées aux professeurs ;
- aucune nouvelle table, migration, publication, note ou collecte automatique.

Vérifications : 19/19 ciblés, backend 654/654, lint backend/frontend, build frontend,
Learning visible et ouvrable dans le navigateur local, `git diff --check`.

Statut : publié via PR #193 (`c02843a`).

## 2026-06-29 — UI-PROGRESSIVE-SURFACES-001 : cadre d'aide dans Teaching

- ajout d'une route authentifiée de classification, sans écriture ni exécution ;
- rôle dérivé du token serveur : le client ne peut pas se surclasser ;
- panneau réutilisable « Comment MasterFlow peut m'aider ? » dans Teaching ;
- lecture simple de l'aide autorisée, des sorties interdites et de la validation humaine ;
- recadrage visible d'une demande de rendu final, sans humiliation ni sanction ;
- responsive 390 px sans débordement, aucune erreur navigateur.

Vérifications : 12/12 ciblés, backend 648/648, lint backend/frontend, build frontend,
smoke navigateur desktop/mobile et `git diff --check`.

Statut : publié via PR #192 (`8f41537`).

## 2026-06-29 — LEARNING-TEACHING-INTEGRITY-RUNTIME-001 : décision pédagogique pure

- ajout du contrat partagé d'entrée/sortie pour Learn, Teaching, Project et Story ;
- classification `guide`, `explain`, `coach`, `candidate_output` ou `blocked_integrity` ;
- correction et cadrage sensibles maintenus comme candidats à validation humaine ;
- ressources limitées aux sources validées ou explicitement candidates ;
- contournement répété limité à un hint Safety narratif, sans sanction ni changement de permission ;
- aucune route, migration, note finale, publication, provider ou UI lourde.

Vérifications ciblées : 9/9, backend 645/645, lint backend/frontend et build frontend verts.

Statut : publié via PR #191 (`7d00d60`).

## 2026-06-29 — LEARNING-TEACHING-INTEGRITY-001 : contrat d'intégrité pédagogique

- consolidation des verrous dispersés : `guide_only`, validation professeur, correction candidate,
  export privé, Safety non punitive et ressources timecodées ;
- matrice Canon → GitHub pour Learning, Teaching, correction, storylets, Safety et Trust ;
- politique de réponse pédagogique : expliquer, guider, coacher, relire, proposer candidat ou
  bloquer une demande de rendu complet ;
- décision de ne pas créer de moteur Learning parallèle ;
- prochaine tranche recommandée : fonction pure `classifyPedagogicalAssistance`, sans migration.

Livrable : `docs/d05-d06/LEARNING_TEACHING_INTEGRITY_CONTRACT_V1_2026-06-29.md`.

Vérifications locales à publier : lecture ciblée + `git diff --check`.

Statut : publié via PR #190 (`b358f5c`).

## 2026-06-29 — THEME-STUDIO-ACTIVATION-PREFLIGHT-001 : préflight activation thème

- ajout de l'action `activate_theme_pack_candidate` dans le registre d'actions ;
- préflight visible via l'Action Engine existant ;
- validation obligatoire `godmode` ;
- payload métier non divulgué dans l'explication UI ;
- exécution volontairement bloquée en `not_implemented` tant que stockage, application UI et
  rollback réel ne sont pas conçus ;
- aucun ThemePack actif, CSS, font, asset, génération, canonisation, provider ou migration.

Livrable : `docs/theme-studio/THEME_STUDIO_ACTIVATION_PREFLIGHT_V1.md`.

Vérifications locales à publier : action lifecycle ciblé, Theme Studio asset pack, backend complet,
lint backend/frontend, build frontend et diff-check.

Statut : publié via PR #188 (`2a95fee`).

## 2026-06-29 — THEME-STUDIO-ASSET-PACKS-001 : preview de packs thème/assets

- ajout d'un preview `ThemeStudioAssetPackPreview` en lecture seule ;
- route `/experience/theme-studio/asset-pack` derrière authentification ;
- pack candidat avec palette, typos Google Fonts sourcées, refs D08, groupes d'assets et lint ;
- affichage dans le panneau Theme Studio existant ;
- aucun thème actif, aucun téléchargement de fonte, aucune génération, aucune canonisation.

Livrable : `docs/theme-studio/THEME_STUDIO_ASSET_PACKS_V1.md`.

Vérifications : Theme Studio asset pack ciblé, lint backend/frontend, build frontend et diff-check.

Statut : publié via PR #186 (`d0a58ae`).

## 2026-06-29 — DA-NARRATIVE-BRIDGE-001 : ponts DA narrative

- cartographie des autorités entre MasterStory, Experience Fabric, D08, Visual Narrative Grammar,
  Theme Studio, Living Companions et Safety ;
- confirmation que plusieurs ponts existent déjà en runtime, donc pas de nouveau moteur à créer ;
- routage des demandes DA/narratives vers la bonne brique sans provider ni canonisation ;
- règles d'évolution des subpersonas / monstres : identité initiale validée, évolution pilotée par
  indicateurs, manifest avant asset ;
- prochaine tranche recommandée : `THEME-STUDIO-ASSET-PACKS-001`.

Livrable : `docs/experience-fabric/DA_NARRATIVE_BRIDGE_MAP_V1.md`.

Vérifications : lecture ciblée des services existants et `git diff --check`.

Statut : publié via PR #184 (`a52eb64`).

## 2026-06-29 — VOICE-PERSONA-002 : TTS durci

- route TTS authentifiée et body strict ;
- porte-parole résolu depuis la Room avec le même moteur que le chat ;
- voix provider libre supprimée du client ;
- whitelist serveur minimale, texte 1 200 caractères, quota, timeout et taille bornée ;
- nettoyage temporaire garanti et audit sans texte brut ;
- frontend adapté, générateur mocké dans les tests, aucun appel Edge TTS.

Vérifications : TTS + persona 9/9, backend 632/632, lint back/front, build frontend et diff-check.

Statut : publié via PR #183 (`21132ae`).

## 2026-06-29 — VOICE-PERSONA-001 : audit TTS contrôlé

- PoC confirmé mais route non authentifiée et paramètres trop libres ;
- séparation voix sémantique et configuration TTS technique ;
- résolution obligatoire du porte-parole depuis la Room ;
- whitelist serveur, texte borné, débit, timeout, taille et cleanup ;
- fallback texte, audit sans contenu brut et aucun blocage du chat ;
- STT, clonage, provider payant et lecture automatique restent fermés.

Livrable : `docs/voice/VOICE_PERSONA_TTS_V1_2026-06-29.md`.

Statut : contrat porté par la PR #182 ; son état GitHub fait foi.

## 2026-06-29 — SAFETY-STATE-002 : projection runtime pure

- fonction pure de projection depuis Trust, récupération et hard stop ;
- endpoint privé `/diagnostics/safety-state` admin/godmode ;
- réactions persona et stratégies de message sémantiques ;
- récupération détectable sans nouvelle table ;
- aucune persistance, permission, sanction, prompt persona, asset ou UI.

Vérifications : Safety + route 14/14, backend 628/628, lint backend et diff-check.

Statut : runtime porté par la PR #181 ; son état GitHub fait foi.

## 2026-06-29 — SAFETY-STATE-001 : sécurité narrative non punitive

- sept états : normal, vigilant, recadrage, suspicious, closed, hard stop et recovered ;
- transitions dérivées uniquement de Security, Trust et hard stop réels ;
- réactions persona sémantiques sans génération d'asset ;
- règles privées, classe et intégrité académique non humiliantes ;
- récupération et expiration obligatoires ;
- aucune autorité métier, permission, sanction ou ban ajoutés.

Livrable : `docs/safety/SAFETY_STATE_MACHINE_V1_2026-06-29.md`.

Statut : contrat porté par la PR #180 ; son état GitHub fait foi.

## 2026-06-29 — TRUST-FABRIC-002 : read model privé

- nouvelle lecture `/diagnostics/trust`, réservée admin/godmode ;
- quatre dimensions séparées : source, intégrité artifact, risque contextuel et santé runtime ;
- calcul depuis les tables existantes, sans migration ni rétention supplémentaire ;
- signal utilisateur owner-scoped, borné à quinze minutes, explicable et réversible ;
- intégrité fichier/lien laissée à `unknown` tant que les preuves communes n'existent pas ;
- aucune moyenne globale, permission, sanction, provider ou UI modifiée.

Vérifications : Trust + route 8/8, backend 619/619, lint backend et diff-check.

Statut : runtime porté par la PR #179 ; son état GitHub fait foi.

## 2026-06-29 — TRUST-FABRIC-001 : confiance explicable

- séparation de quatre dimensions : source, fichier/lien, signal de risque contextuel et santé
  système/provider ;
- refus d'un score global ou moral de l'utilisateur ;
- signaux datés, scopés, réversibles, avec raison, preuve et expiration ;
- règles d'échelle : agrégation, TTL, faible cardinalité et alertes groupées ;
- première tranche runtime limitée à un read model calculé depuis l'existant.

Livrable : `docs/trust/TRUST_FABRIC_V1_2026-06-29.md`.

Statut : contrat porté par la PR #178 ; son état GitHub fait foi.

## 2026-06-29 — SECURITY-FABRIC-002 : garde déterministe commun

- remplacement de la regex RAG isolée par un garde réutilisable ;
- détection directe, base64, lettres espacées, typoglycémie simple, secret et markup actif ;
- usage pédagogique reconnu en avertissement sans ouvrir de capacité sensible ;
- ingestion RAG hostile refusée et chunk hostile exclu au dernier moment ;
- audit limité à identifiants, hash et famille de menace, sans contenu brut ;
- aucune permission, session, sanction, hard stop, DB, provider ou UI modifiée.

Vérifications : garde + RAG 19/19, backend 615/615, lint backend et diff-check.

Statut : runtime porté par la PR #177 ; son état GitHub fait foi.

## 2026-06-29 — SECURITY-FABRIC-001 : frontière de confiance runtime

- cartographie des protections déjà réelles : RAG fiable/scopé, permissions, Action Engine,
  hard stop, audit et cockpit ;
- séparation explicite instructions/données sur chat, documents, outils, OCR, mémoire et sorties ;
- réponses graduées `allow`, avertissement, refus, quarantaine et recommandation de hard stop ;
- contrat d'alerte GodMode borné, dédupliqué et sans contenu brut ;
- première tranche runtime limitée à un garde déterministe partagé, sans sanction automatique.

Livrable : `docs/security/SECURITY_FABRIC_V1_2026-06-29.md`.

Statut : contrat porté par la PR #176 ; son état GitHub fait foi.

## 2026-06-29 — GLOBAL-ABSORPTION-001 : matrice d'absorption globale

- lecture et consolidation des audits BP récents, de la doctrine source-truth, du registre de
  primitives externes, des traces Factories/OpenMontage/design et de l'inbox voix/TUI ;
- création d'une matrice unique : déjà implémenté, documenté, gap runtime, futur ou bloqué ;
- décision d'ordre : Security Fabric doit passer avant Trust, Safety narrative, Voice et UI ;
- rappel : Factories restent atelier externe ; Git absorbe seulement les primitives utiles ;
- aucun runtime, provider, permission, DB, seed, endpoint, UI ou dossier externe modifié.

Livrable : `docs/runtime-queue/GLOBAL_ABSORPTION_MATRIX_2026-06-29.md`.

Statut : publié via PR #174 (`1aa6f62`).

## 2026-06-29 — GLOBAL-ABSORPTION-RESUME-000 : reprise anti-coupure crédits

- ajout du rituel de reprise obligatoire dans `CLAUDE.md` ;
- ajout d'une queue globale des vagues dans `docs/runtime-queue/MASTERFLOW_GLOBAL_ABSORPTION_RESUME_PLAN_2026-06-29.md` ;
- ajout du bloc `VAGUE ACTIVE` en tête de `SUIVI.md` pour éviter les reprises à l'aveugle ;
- Big Pickle reste piloté uniquement par `.opencode/INBOX.md` et ne reçoit aucune tâche prête ;
- aucune modification runtime, permission, provider, DB, seed, endpoint ou UI.

Statut : publié via PR #173 (`4ca2702`).

## 2026-06-29 — THEME-STUDIO-UI-001 : grammaire visuelle explicable

- Theme Studio devient un outil GodMode distinct et chargé uniquement à la demande ;
- il sélectionne un manifest D08 et projette vocabulaire visuel, color script, continuité,
  justification et diagnostics ;
- l’état vide renvoie honnêtement vers le cadrage D08 au lieu d’inventer une DA ;
- le moteur reste `explain_only` : aucun ThemePack appliqué, provider, génération ou canonisation.

Vérifications : backend 605/605, lint frontend/backend, build frontend et diff-check. Smoke :
manifest local de recette = 3 signes visuels, 0 étape émotionnelle et 2 alertes de continuité ;
aucun débordement à 390 px.

Statut : publié via PR #172 (`2e958e7`).

## 2026-06-29 — MASTERSTORY-UI-001 : lecture canon progressive

- le workbench D09 peut construire une lecture `reader`, `workshop` ou `full_spoilers` à la demande ;
- seuls les faits autorisés par la présentation sont affichés ;
- setup/payoff, connaissances personnages, diagnostics et storylets narratives sont synthétisés ;
- changer de niveau de révélation exige de reconstruire explicitement la lecture ;
- aucune source, vérité canon, storylet, export ou publication n’est modifiée.

Vérifications : backend 605/605, lint frontend/backend, build frontend et diff-check. Smoke Batrasia :
30 faits visibles et 8 spoilers masqués en lecteur ; 0 spoiler masqué en atelier ; storylet
`pending_validation` ; aucun débordement à 390 px.

Statut : publié via PR #171 (`9a336a7`).

## 2026-06-29 — EXPERIENCE-UI-001 : cockpit GodMode progressif

- le cockpit owner contient une entrée Experience Fabric fermée par défaut ;
- le clic charge en parallèle la chronologie, les précédents et le cycle MAPE-K du scope actif ;
- la surface répond simplement : ce qui s’est passé, ce qui ressemble au contexte, ce qui est
  proposé et pourquoi ;
- les plans restent candidats, la sélection reste humaine et l’exécution reste absente ;
- aucun appel Experience n’est lancé au chargement normal de la Home.

Vérifications : backend 605/605, lint frontend/backend, build frontend, diff-check et smoke
navigateur à 1280/390 px. Runtime de test : 17 événements, 2 précédents et 1 proposition lus,
zéro Action créée.

Statut : publié via PR #170 (`c6323be`).

## 2026-06-29 — VISIBLE-PREFLIGHT-002 : panneau UI progressif

- la trace d’action existante affiche maintenant le préflight sous forme de panneau lisible ;
- proposition, risque, état avant/après et ressources concernées restent visibles sans payload ;
- un validateur autorisé peut approuver ou rejeter via la route backend réelle ;
- la validation ne lance rien : l’exécution reste un geste séparé ;
- `Modifier` est visible mais désactivé et marqué « à venir » ;
- le panneau se replie verticalement sur mobile.

Vérifications : backend 605/605, lint frontend/backend, build frontend, diff-check et smoke navigateur à
1280 px puis 390 px sans débordement.

Statut : publié via PR #169 (`1c46fee`).

## 2026-06-29 — VISIBLE-PREFLIGHT-001 : contrat UI explicable

- le préflight Action Engine expose désormais une explication déterministe et bornée ;
- l’interface peut afficher la proposition, les ressources concernées, un aperçu avant/après et
  les choix `approve/modify/reject` lorsque la validation humaine est requise ;
- `modify` est explicitement marqué `future`, car aucune route de modification directe n’existe
  encore ; l’interface ne doit donc pas le présenter comme fonctionnel ;
- le payload métier n’est jamais recopié dans cette explication (`payload_disclosed: false`) ;
- le préflight ne produit toujours aucun effet et n’ajoute aucune permission.

Vérifications : Action Lifecycle 15/15, backend complet 605/605, lint backend, build frontend et
diff-check OK.

Statut : publié via PR #168 (`bb03628`).

## 2026-06-29 — EXPRESSIVE-CANON-P1 : Style Mirror consenti

- `EXPRESSIVE_CANON` est implémenté comme durcissement de `StyleMirrorProfile`, sans table
  `behavior_profiles` concurrente ;
- ajout d'un contrat `ExpressiveBehaviorConfig` borné : rythme, chaleur, franchise, ludisme,
  densité technique, expressions, mouvements de signature et tons interdits ;
- ajout de consentement sujet `pending/granted/revoked`, validation, version, source refs sans
  texte brut et référence visuelle canon nullable ;
- un profil n'est injecté dans le chat que s'il est `active`, consenti, validé et non révoqué ;
- un professeur peut proposer un profil, mais seul le sujet peut l'activer ;
- le chat passe désormais le `project_id` réel à Style Mirror et sélectionne dans l'ordre :
  projet/persona, projet/générique, global/persona, global/générique ;
- le bloc expressif est borné à 1 200 caractères, rappelle que le style ne modifie jamais
  permissions, faits, sources ou méthode métier, et limite les signatures ;
- le protocole WebSocket `chat_start` peut exposer un metadata `Voix stylisée` sans répéter ce
  label dans chaque réponse.

Vérifications : Style Mirror ciblé 10/10, backend complet 605/605, lint backend, build frontend et
diff-check OK.

Statut : publié via PR #167 (`eb1fd61`). Aucun provider, collecte automatique, psychologie
inférée, avatar runtime, permission bypass ou migration destructive.

## 2026-06-29 — AUDIT-BP-PLAN-001 : rapports Big Pickle relus et arbitrés

Rapports lus :

- `EXPRESSIVE_CANON_BEHAVIOR_GRAPH_AUDIT_2026-06-29.md`
- `VISION_PRODUCT_ABSORPTION_AUDIT_2026-06-29.md`
- `FACTORIES_VS_MASTERFLOW_CONFRONTATION_AUDIT_2026-06-29.md`
- `MASTER_AUDIT_SYNTHESIS_2026-06-27.md`
- `D08_COHERENCE_AUDIT_2026-06-27.md`
- `OCR_COHERENCE_AUDIT_2026-06-27.md`
- `BOOT_CONTEXT_AUDIT_2026-06-27.md`
- `FACTORIES_BACKFLOW_AUDIT_2026-06-27.md`

Arbitrage Codex :

- les rapports du 27/06 sont majoritairement des reçus historiques : les points critiques D08
  `approved/rejected`, `generate-visual` et stockage fichier sont déjà corrigés/neutralisés sur
  le `main` actuel ;
- `EXPRESSIVE_CANON` est valide comme direction, mais doit évoluer `StyleMirrorProfile` existant :
  pas de nouvelle table concurrente `behavior_profiles` en P1 ;
- `VISION_PRODUCT_ABSORPTION` devient une roadmap de primitives, pas une autorisation à créer
  Note Engine, LMS, OCR/provider, C2PA ou Design Tokens sans tranche dédiée ;
- `FACTORIES_CONFRONTATION` reste atelier Desktop : Git absorbe seulement primitives, verrous et
  validateurs utiles, jamais les factories complètes.

P1 recommandé avant code EXPRESSIVE :

1. fixer le contrat `EXPRESSIVE_CANON` comme extension Style Mirror ;
2. garder Big Pickle en pause : aucune tâche n'est prête tant que Codex n'a pas figé une tranche
   mécanique bornée ;
3. garder SELF_DEBUG, kill switch, audit cryptographique, decoding-time control, avatar swap,
   OCR/provider et LMS en chantiers séparés P2/P3.

Livrable : `docs/audits/CODEX_BP_AUDIT_ABSORPTION_VERDICT_2026-06-29.md`.

Statut : arbitrage prêt à publication. Aucune migration, permission, provider, tâche Big Pickle ou
implémentation Expressive lancée.

## 2026-06-29 — EXPERIENCE-FABRIC-007B : Blackboard privé publié

PR #165 mergée sur GitHub `main` (`8566d5b`) :

- contrat `BlackboardContribution`, `BlackboardSynthesis` et `BlackboardReport` ;
- endpoint `GET /experience/autonomy/blackboard` ;
- synthèse privée du cycle MAPE-K sans Action, permission, mémoire automatique ni
  multi-porte-parole.

Vérifications pré-publication : 8/8 ciblés MAPE-K + Blackboard, backend complet 604/604,
lint backend/frontend, build frontend et diff-check OK.

## 2026-06-29 — EXPERIENCE-FABRIC-007A : Cycle MAPE-K contrôlé

- contrat `AutonomyCycle` et `AutonomyPlanCandidate` ;
- Monitor depuis Event Spine et snapshot permissionnés ;
- Analyze depuis blockers, validations, précédents et storylets ;
- Plan candidat classé, sourcé et sans sélection automatique ;
- Execute figé à `not_executed` avec zéro `Action` créée ;
- Knowledge sans rétention automatique ;
- endpoint `GET /experience/autonomy/cycle` ;
- scopes projet, workbench et session guidée conservés.

Vérifications : 5/5 ciblés MAPE-K, 4/4 Storylet Engine, 8/8 Event Spine,
backend complet 601/601, lint backend/frontend, build frontend et diff-check OK.

Statut : publié via PR #164 (`da07f38`).

## 2026-06-29 — EXPERIENCE-FABRIC-007B : Blackboard privé contrôlé

- contrat `BlackboardContribution`, `BlackboardSynthesis` et `BlackboardReport` ;
- consolidation privée du cycle MAPE-K : monitor, storylets, précédents, garde-fous et compagnon
  assigné lorsqu'une session guidée est fournie ;
- endpoint `GET /experience/autonomy/blackboard` ;
- contributions `cycle_private`, jamais exposées comme dialogue multi-personas ;
- synthèse par porte-parole sémantique unique ;
- garde-fous explicites : aucune Action créée, aucune permission modifiée, aucune rétention mémoire
  automatique, aucun multi-porte-parole.

Vérifications : 8/8 ciblés MAPE-K + Blackboard, backend complet 604/604, lint backend/frontend,
build frontend et diff-check OK.

Statut : vague 7.2 locale prête à publication atomique.

## 2026-06-29 — EXPERIENCE-FABRIC-006C : Monstre-idée Ours d’Or

- extension `LivingCompanion` au type `project_monster` en bulle contextuelle ;
- rapport `ProjectMonsterEvolutionReport` lié à une session et un projet privés ;
- nom et lore déclarés par le créateur, jamais inventés par le runtime ;
- trois étapes candidates issues des contrats legacy : `seed`, `mutation`, `stabilized` ;
- calcul depuis complétude, `creative_gimmick`, `dominant_emotion` et contradictions ;
- continuité verrouillée : silhouette, gimmick, émotion, non-humiliation et comportement avant forme ;
- plan d'asset Ours d'Or exposé mais `generation_allowed: false` et `canon_promotion_allowed: false` ;
- endpoint `GET /experience/companions/project-monsters/guided-sessions/:sessionId`.

Vérifications : 5/5 ciblés Project Monster, 7/7 Living Companion, 4/4 Storylet Engine,
backend complet 596/596, lint backend/frontend, build frontend et diff-check OK.

Statut : publié via PR #163 (`8d7fdd4`).

## 2026-06-29 — EXPERIENCE-FABRIC-006B : MOTH Living Companion

- extension additive de `LivingCompanion` aux types `cdc_robot` et `moth` ;
- activation MOTH uniquement via `ui_manifest.companion_type = moth` sur un guide assigné ;
- scopes d'assignation explicites : session, projet et room disponibles ;
- rôle de garde-fou CDC, bulle contextuelle et limites distinctes du Robot CDC ;
- présence `assigned_context_only` : MOTH ne remplace jamais le persona personnel ;
- type inconnu refusé au lieu d'être inféré ;
- aucune permission, autonomie, génération, évolution visuelle, publication ou export ajouté.

Vérifications : 7/7 ciblés Living Companion, 4/4 Storylet Engine, backend complet 591/591,
lint backend/frontend, build frontend et diff-check OK.

Statut : publié via PR #162 (`3afee8d`).

## 2026-06-29 — EXPERIENCE-FABRIC-006A : Living Companion / Robot CDC

- projection `LivingCompanion` depuis le Guided Runtime privé existant ;
- premier pilote `cdc_robot` : rôle, limites, question courante, progression, bulle contextuelle
  et intentions disponibles ;
- storylets `companion` pour continuer le cadrage, résoudre une contradiction, réparer une
  configuration ou relire une synthèse ;
- endpoint `GET /experience/companions/guided-sessions/:sessionId` ;
- scope de session conservé et références persona diagnostiquées sans donner de permission ;
- politique stricte `guide_only` : aucune rédaction autonome, génération d'asset, évolution,
  publication, export, provider ou écriture canon.

Vérifications : 5/5 ciblés Living Companion, 4/4 Storylet Engine, backend complet 589/589,
lint backend/frontend, build frontend et diff-check OK.

Statut : publié via PR #161 (`84291eb`).

## 2026-06-29 — EXPERIENCE-FABRIC-005 : Visual Narrative Grammar

- contrats `VisualGrammarElement`, `EmotionalArcPoint`, `VisualNarrativeGrammar`
  et `VisualNarrativeGrammarReport` ;
- projection read-only depuis les manifests D08, les références visuelles, le canon narratif
  et la racine DA/thème disponible ;
- endpoint `GET /experience/visual-grammar` ;
- rapport explicable : motifs, template, arc émotionnel, sources et cartes « pourquoi ce visuel ? » ;
- diagnostics de dérive graphique, évolution injustifiée, motif décoratif sans fonction et trou de
  continuité ;
- politique d'exécution stricte `explain_only` : aucune génération, provider, application de thème,
  canonisation, export ou publication.

Vérifications : 5/5 ciblés Visual Narrative Grammar.

Statut : publié via PR #160 (`dd76353`).

## 2026-06-28 — EXPERIENCE-FABRIC-004 : Storylet Engine

- contrats `StoryletDefinition`, `StoryletInstance` et `StoryletEvaluation` ;
- évaluateur read-only depuis `NarrativeCanonGraph`, `PrecedentCase` et `DomainEventEnvelope` ;
- endpoint `GET /experience/storylets` ;
- storylets narratives, précédents et notifications blockers en V1 ;
- politique d'exécution stricte `suggest_only` : aucune action, job, canonisation ou changement
  de mode silencieux.

Vérifications : 4/4 ciblés Storylet Engine, backend complet 579/579, lint backend/frontend,
build frontend et diff-check.

Statut : publié via PR #159 (`0532406`).

## 2026-06-28 — EXPERIENCE-FABRIC-003 : Narrative Canon Graph

- contrats `NarrativeFact`, `NarrativePresentation`, `CharacterKnowledge`, `CharacterGoal`,
  `SetupPayoff` et `NarrativeCanonGraph` ;
- projection read-only depuis `story_nodes`, `narrative_events` et `story_characters` ;
- séparation nette entre faits narratifs et présentation `reader`, `workshop`, `full_spoilers`
  ou `export` ;
- mode reader sans spoiler : les faits critiques restent dans le graph mais sortent de la
  présentation visible ;
- endpoint `GET /narrative/workbench/:id/canon-graph` ;
- aucun delta canon, storylet, génération visuelle, table nouvelle ou publication externe.

Vérifications : 5/5 ciblés Narrative Canon Graph, backend complet 575/575, lint backend/frontend,
build frontend et diff-check.

Statut : publié via PR #158 (`5f833a3`).

## 2026-06-28 — EXPERIENCE-FABRIC-002 : Precedent Engine

- projection read-only des précédents depuis `memory_cards`, `room_checkpoints`,
  décisions de checkpoint et timeline `DomainEventEnvelope` ;
- contrat `PrecedentCase` et recherche scorée avec raisons de match et note d'adaptation ;
- endpoint `GET /experience/precedents` et détail `GET /experience/precedents/:caseId` ;
- les cas candidats restent masqués sauf demande explicite et chaque cas porte
  `requires_human_validation: true` ;
- aucun embedding, table de précédents, exécution automatique, canonisation ou UI nouvelle.

Vérifications : 8/8 ciblés Experience Fabric, backend complet 570/570, lint backend/frontend,
build frontend et diff-check.

Statut : publié via PR #156 (`0a3a2ef`).

## 2026-06-28 — EXPERIENCE-FABRIC-001 : Event Spine publiée

PR #155 mergée sur GitHub `main` (`63381f5`) : timeline, snapshot et preuve de provenance
servent désormais de socle à la vague Precedent Engine.

## 2026-06-28 — EXPERIENCE-FABRIC-001 : Event Spine permissionnée

- contrat `DomainEventEnvelope` commun aux événements audit, workflow, narration, jobs et progression ;
- timeline et snapshot read-only avec provenance, résultat, compteurs et fingerprint déterministe ;
- payloads bruts exclus et projets privés isolés, y compris face à un godmode extérieur ;
- aucun event store parallèle, replay actif, action, provider ou canonisation.

Vérifications : 4 tests ciblés, lint backend/frontend, build frontend et diff-check.

Statut : publié via PR #155.

## 2026-06-28 — KNOWLEDGE-FABRIC-001 : cartes mémoire reliées et graphes permissionnés

- réutilisation de `memory_cards` comme unité atomique, sans nouveau système de notes parallèle ;
- relations candidates typées en familles sémantiques, provenance et opérationnelles ;
- justification, source, confiance et validation humaine obligatoires avant activation d'un lien ;
- consultation des cartes et liens entrants/sortants, plus diagnostic de santé mémoire ;
- détection des cartes actives orphelines, contradictions, doublons et liens obsolètes ;
- refus des secrets, auto-liens et relations entre scopes incompatibles ;
- accès au graphe pédagogique verrouillé par owner et permissions projet.

Sources d'arbitrage : contrat legacy `MASTERFLOW_GRAPH_OS_AND_DEPLOYABLE_KNOWLEDGE_CONTRACT`,
archive Luhmann, documentation Obsidian et recommandations W3C SKOS / PROV-O / SHACL.

Vérifications : tests ciblés 52/52, backend complet 562/562, lint backend/frontend, build frontend,
diff-check et smoke HTTP local `GET /api/v1/memory/health` OK.

Hors périmètre : aucune canonisation automatique, nouvelle UI, donnée utilisateur, migration
destructive, provider, embedding ou activation RAG.

Statut : branche `codex/knowledge-fabric-v1`, publication ouverte via PR #154.

## 2026-06-28 — UI-001E : Home légère et point de reprise

- reprise et correction de la proposition Home OpenCode avant publication ;
- six cartes maximum : contexte, prochaine action, reprise, validation, ressources et modes ;
- chat compact conservant le texte utile, modes réellement cliquables ;
- outils D08/D09/D10 retirés de la Home et toujours chargés uniquement à la demande ;
- libellés trompeurs ou techniques retirés ; déconnexion rendue explicite ;
- aucun backend, endpoint, permission, provider ou contrat réseau modifié.

Vérifications : lint frontend, build frontend et diff-check OK ; smoke navigateur desktop
1280 px et mobile 390 px sans débordement ; navigation Home → Teaching → Home OK.

Statut : branche `codex/ui-home-lightweight`, PR #153 avant merge.

## 2026-06-28 — Fondations composables clean-room

- ajout d'un registre de packs runtime fondé sur les actions et permissions réelles ;
- ajout du guidage contextuel et de ponts inter-modes proposés, sans navigation automatique ;
- fondation Theme Studio avec portées, polices, couleurs, accessibilité et contrôle de licence ;
- promesse de sortie, quality gate, trace de décision et préflight de coût structurés ;
- `design.md` (Apache-2.0) absorbé par réimplémentation ; OpenMontage (AGPL-3.0)
  utilisé uniquement comme source de concepts, sans copie de code ;
- provider, application de thème, migration de données et déploiement live inchangés.

Vérifications : 104 fichiers de tests, 557 tests OK ; lint backend/frontend, build
frontend et diff-check OK.

Statut : publié sur GitHub `main` au commit `661f3fa` par intégration fast-forward
directe ; aucune PR revendiquée, les accès API PR étant indisponibles.

## 2026-06-28 — UI-001D : chargement progressif des surfaces frontend

- les surfaces lourdes frontend passent en chargement à la demande ;
- D08, D09 et D10 ne sont plus montés automatiquement pour les rôles admin/godmode ;
- Inventory, Teaching, Pilotage, Admin, Ops et panneaux privés restent disponibles uniquement quand l'utilisateur les ouvre ;
- aucun endpoint, seed, rôle, permission, provider, migration ou déploiement live modifié ;
- le bundle principal frontend descend à `248.34 kB` gzip `73.78 kB` au build local.

Vérifications : lint frontend OK, build frontend OK, diff-check OK, smoke local backend/frontend OK.

Statut : publié sur GitHub `main` via PR #151, merge `ed45d74014875b463352fdace29f337ae57ecffd`.

## 2026-06-28 — UI-001C : conversation métier séparée des messages système

- le fil Chat n'affiche plus que les tours utilisateur/persona ;
- les événements `system` existants sont projetés dans une surface compacte `État du chat` ;
- aucun événement WebSocket, historique, endpoint, rôle ou permission modifié ;
- le libellé de secours d'un tour assistant devient `Assistant`, jamais `Système` ;
- smoke navigateur local :
  - message utilisateur et réponse ProfKrapu visibles dans le fil ;
  - zéro `.chat-turn--system` dans le fil ;
  - desktop et viewport 390 px sans débordement horizontal.

Statut : publié sur GitHub `main` via PR #150, merge `f6fb1b375d4e21d4a652f030397a9a7e205c1887`.

## 2026-06-28 — UI-001B : Pilotage Control / Admin / Ops

- surface locale `Pilotage` séparée des modes métier ;
- `Contrôle` regroupe Owner Cockpit, Validation Inbox, Jobs, mémoire de coordination et Debug godmode ;
- `Admin` conserve utilisateurs, invitations, routage LLM et coûts ;
- `Ops` regroupe release, backup et incidents ;
- aucun mode backend ajouté : le loadout local ne contenait pas `admin`, l'accès reste une surface
  frontend distincte protégée par `canAdmin` ;
- Validation Inbox teacher conservée dans Teaching ;
- D08, D09, D10, Inventory, Teaching, Project et Chat restent hors de Pilotage ;
- aucun endpoint, seed, rôle, permission ou contrat shared modifié.

Vérifications : lint frontend OK, build frontend OK, lint backend OK, diff-check OK, smoke
navigateur Control/Admin/Ops OK, 390 px sans overflow.

Statut : publié sur GitHub `main` via PR #150, merge `f6fb1b375d4e21d4a652f030397a9a7e205c1887`.

## 2026-06-28 — UI-001A : première extraction App Shell

- environnement local UI vérifié : backend `http://localhost:8000`, frontend `http://localhost:5174` ;
- extraction d'une première couche shell sans changement métier :
  - `MasterFlowShell` pour le cadre général ;
  - `SituationPanel` pour la projection de contexte courant ;
  - `ModeRail` pour la navigation de modes ;
- `App.tsx` conserve les handlers, appels API, permissions et comportements existants ;
- aucun endpoint, seed, action registry, permission, provider, migration ou déploiement modifié ;
- le plan UI actif consigne le checkpoint local et la prochaine direction ;
- validations : `npm run lint` OK, `npm run build:frontend` OK, `git diff --check` OK.

Statut : publié sur GitHub `main` via PR #150, merge `f6fb1b375d4e21d4a652f030397a9a7e205c1887`.

## 2026-06-28 — Correction frontière Factories : atelier Bureau, primitives Git

- correction MALEX : les audits détaillés de Factories ne doivent pas vivre dans Git ;
- décision : `/Users/malex/Desktop/FACTORIES/` reste l'atelier actif pour versions, CDC de bots, audits détaillés, prompts, archives et patchs ;
- Git garde seulement le pont Factory → MasterFlow, le routeur de primitives et les specs réellement utiles au logiciel ;
- suppression de la couche active Git `FACTORY_PRIMITIVES_AUDIT_PASS_1` et du CDC commun de bots ;
- ajout du pont `docs/factories/FACTORY_DESKTOP_WORKSHOP_TO_MASTERFLOW_BRIDGE_2026-06-28.md` ;
- `FACTORY_PRIMITIVE_ROUTER` est conservé uniquement comme routeur de primitives MasterFlow, pas comme audit de Factories.

Conséquence : quand une Factory révèle quelque chose d'intéressant, on ne publie pas l'audit de la
Factory dans Git ; on publie seulement la primitive/contrat/guardrail utile à MasterFlow.

## 2026-06-27 — FACTORY-PRIMITIVES-001 : audit des Factories actives

Ancienne passe documentaire, remplacée le 2026-06-28.

Ce qui reste valable :

- les Factories restent des bots/extractions autonomes, pas des briques à importer telles quelles ;
- certaines primitives sont utiles à MasterFlow : boot contexte, scope lock, extraction inbox, source truth, rôles visuels, GO IMAGE gate, DA report, jauges, subject packs, brief routing, situation companion, usage harvester ;
- aucun runtime, provider, migration, Drive ou dossier Factory actif n'avait été modifié.

Ce qui est corrigé :

- l'audit détaillé des Factories et le CDC de bots ne doivent pas vivre dans Git ;
- le travail Factories détaillé reste côté Bureau ;
- Git ne conserve que le pont et les primitives utiles.

## 2026-06-27 — D08-VISUAL-REFS-001 : taxonomie références visuelles

- audit D08 Git + Factories visuelles ;
- clarification : storage/assets privés existent désormais, mais cela n'ouvre pas la génération image complète ;
- création d'une taxonomie provenance/droits/confiance, rôle visuel autorisé et statut manifest ;
- mapping avec `VisualReferenceStatusSchema` existant ;
- verrou `GO IMAGE` exact et rapport DA post-sortie documentés ;
- provider image, canonisation, export public et Drive restent fermés.

Statut : spec documentaire dans `docs/d08/D08_VISUAL_REFERENCE_TAXONOMY_AND_FACTORY_REF_GATE_2026-06-27.md`.
Prochaine action sûre : auditer la route narrative `generate-visual` contre ce gate.

## 2026-06-27 — D08-GATE-001 : route narrative generate-visual neutralisée

- audit code : `POST /api/v1/narrative/nodes/:id/generate-visual` créait un job image directement via le bridge narratif ;
- patch : la route compile désormais le contexte et le manifest, puis retourne `generation_blocked_action_gate` sans créer de job ;
- la création de job image reste réservée à l'exécuteur d'action approuvée `create_render_manifest` ;
- ajout d'un test HTTP prouvant que la route ne crée aucun job `asset_prepare`.

Statut : patch local prêt à publication. Aucun provider image, runner live, Drive ou dossier Factory actif modifié.
Vérification : test ciblé `narrative_runtime_router` vert, backend complet 98 fichiers / 535 tests, lint TypeScript vert, diff-check vert.

## 2026-06-27 — Git devient la vérité opérable + récolte de primitives externes

- décision opératoire : le clone Git publiable devient la source de vérité exploitable pour MasterFlow ;
- Drive, legacy, ex-canon et Factories deviennent des sources candidates à arbitrer, plus des vérités parallèles ;
- création d'un audit documentaire des familles externes restantes : Dataviz, Factories, MasterHelp, DA/images, OCR/Inventory, pédagogie, jauges, MasterStory, UI ;
- création d'un registre initial de récolte de primitives externes ;
- précision produit : les Factories ne sont jamais absorbées telles quelles ; elles servent seulement à repérer des primitives, patterns, verrous ou retours d'usage utiles, puis les audits détaillés restent côté Bureau ;
- ajout d'un protocole de routage des demandes Factory : extraction préalable, audit d'existant, nouvelle spec, patch, récolte primitive, queue runtime ou blocage ;
- clarification D08 : le bug statuts manifests visuels est résolu dans Git, mais la route narrative `generate-visual` reste à auditer avant génération image réelle.

Statut : doctrine et registre locaux prêts à publication dans `docs/source-truth/`. Aucun runtime,
provider, migration, Drive ou Factory supplémentaire n'a été modifié.

## 2026-06-27 — DATAVIZ-001 : audit Dataviz, Factory→Mode et MasterHelp

- audit documentaire des écarts Dataviz / Graph / Widget entre legacy, canon Drive, Git et Factories ;
- création du contrat candidat `visual_datum` + profils `data_viz_control`, `graphic_facilitation`, `hybrid_summary`, `audit_detail` ;
- création de l'arbitrage Factory → Mode MasterFlow candidat ;
- abstraction Roadtrip en `MasterHelp / Situation Companion` : situation réelle, inventory, contraintes, variantes, checkpoints, source truth et export ;
- prompt Big Pickle préparé pour audit/extraction rapide, sans canonisation automatique.

Patch Factory Roadtrip ensuite appliqué localement avec archive préalable :

- active : `/Users/malex/Desktop/FACTORIES/ROADTRIP_MOTO/CURRENT/ROADTRIP_MOTO_COPILOT_V1`
- archive : `/Users/malex/Desktop/FACTORIES/ROADTRIP_MOTO/ARCHIVE/2026-06-27_v1_3_pre_masterhelp_dataviz`
- version active : `2026.06.27-v1.4`
- ZIP SHA-256 : `997bfb4f84c11161c20d3b02ec13d59bfbe7baa6eb7b3a9265d3a04b11da7f03`

Statut : documentaire local prêt à revue dans `docs/dataviz/`, `docs/factories/`, `docs/masterhelp/`
et `docs/prompts/`. La Factory Roadtrip active est patchée localement et vérifiée statiquement.
Aucun runtime, provider, migration ou canon Drive n'a été modifié.

## 2026-06-27 — Plan actif interface multi-surface

- décision : un seul frontend React/Vite web-first ;
- mobile : PWA responsive avant tout shell natif ;
- desktop : Tauri comme emballage du frontend partagé ;
- UI-001 ouvre l'inventaire des maquettes, références web et composants existants ;
- aucune réécriture métier, permission ou API dans cette tranche documentaire.

Statut : plan et queue prêts dans `docs/ui/MASTERFLOW_INTERFACE_EXECUTION_PLAN.md`.

## 2026-06-27 — Storage fichier réel D07/D08

- uploads privés multipart et base64 vers une racine locale configurable ;
- création atomique logique fichier + `generated_assets`, avec retrait du fichier si la BDD refuse ;
- scan Inventory relié au fichier réel et validation des octets image ;
- accès assets réservé aux rôles professeur+ et isolation owner conservée ;
- tests backend complets : 97 fichiers, 534/534 ; lint TypeScript et diff-check verts.

Statut : publié sur GitHub `main` via PR #147, merge `6d8023a`. Le provider image, l'export, le
téléchargement public et la canonisation restent verrouillés. Le snapshot canon Drive doit être
rafraîchi avec cette preuve sans présenter la génération D08 comme complète.

## 2026-06-27 — Absorption Big Pickle + hardening pré-merge Codex

- absorption locale massive : DA runtime, narration, characters, mirrors, compétences, gamification,
  weather, D12, correction runner, registries et seeds canon/legacy ;
- MALEX valide que le seed étudiants réels peut être poussé ;
- hardening Codex avant publication : guards owner/project, routes sensibles en teacher minimum,
  action registry repassé en mode prudent (`future` ou `validation_required`) pour éviter un faux live ;
- tests backend complets verts : 96 fichiers, 529/529 ; lint TypeScript vert.

Statut : local prêt à revue/commit après contrôle final Git. Aucun déploiement live revendiqué.

## 2026-06-21 — D12 : registre incidents privé

- incident append-only, symptômes/traces/scope, sans traitement automatique ;
- état `recorded_unresolved`, sans smoke, recovery ou déploiement.

Statut : déployé sur GitHub `main` via PR #129-130. Aucun live ou traitement opérateur revendiqué.

## 2026-06-21 — D12 R5.4 : panneau backup receipts privé

- saisie et lecture owner du checksum sans action sur les fichiers ;
- restauration explicitement non testée, sans bouton de recovery.

Statut : déployé sur GitHub `main` via PR #127, merge `37fc12f`. Aucun backup ou live revendiqué.

## 2026-06-21 — D12 R5.3 : registre de backup receipts

- cible, environnement, checksum SHA-256 et références de preuve consignés en append-only ;
- restauration invariablement `not_tested` ; aucune lecture, copie, backup ou recovery exécuté.

Statut : déployé sur GitHub `main` via PR #126, merge `57b620b`. Aucun backup ou live revendiqué.

## 2026-06-21 — D12 R5.2 : panneau release receipts privé

- saisie et lecture des déclarations SHA dans une surface admin/godmode ;
- l'interface ne propose aucun smoke, backup, recovery, migration ou déploiement.

Statut : déployé sur GitHub `main` via PR #124, merge `eefd84a`. Aucun live revendiqué.

## 2026-06-21 — D12 R5.1 : registre de release receipts

- déclaration append-only reliée à un SHA Git complet, environnement et composants ;
- preuve absente = `unknown`, preuve attachée ≠ runtime vérifié ;
- aucun déploiement, smoke, backup, recovery ou migration.

Statut : déployé sur GitHub `main` via PR #123, merge `6e9f62e`. Aucun live revendiqué.

## 2026-06-21 — R4.6 D09 : contrôle de validation auteur

- action visible uniquement sur un patch `candidate` ;
- confirmation explicite que source et canon restent inchangés.

Statut : déployé sur GitHub `main` via PR #121, merge `aebda64`. Aucun live revendiqué.

## 2026-06-21 — R4.5 D09 : validation auteur privée

- transition owner-only `candidate → validated_for_canon_delta` ;
- aucune mutation de source, création de delta canon, export ou publication.

Statut : déployé sur GitHub `main` via PR #120, merge `aaad36e`. Aucun live revendiqué.

## 2026-06-21 — R5.4 D10 : contrôle de validation privée

- le owner peut déclencher `draft → validated_private` depuis le panneau devis ;
- l'action disparaît après validation ; aucun export, envoi, facture ou engagement client.

Statut : déployé sur GitHub `main` via PR #118, merge `e59025c`. Aucun live revendiqué.

## 2026-06-21 — R5.3 D10 : validation interne du devis

- transition explicite `draft → validated_private` ;
- aucun export, envoi, facture ou engagement client.

Statut : déployé sur GitHub `main` via PR #117, merge `776a398`. Aucun live revendiqué.

## 2026-06-21 — R5.2 D10 : panneau devis privé

- création d’une ligne sourcée et lecture du total ;
- aucun envoi, export ou engagement commercial.

Statut : déployé sur GitHub `main` via PR #116, merge `9242d6f`. Aucun live revendiqué.

## 2026-06-21 — R5.1 D10 : Quote Builder privé

- lignes sourcées avec quantité, prix unitaire et confiance ;
- total calculé, hypothèses, exclusions et validité ;
- aucun envoi, facture ou export client.

Statut : déployé sur GitHub `main` via PR #115, merge `0b59dd6`. Aucun live revendiqué.

## 2026-06-21 — R4.4 D09 : panneau auteur privé

- création workbench sans import ; position lecteur anti-spoiler ; patch candidat ;
- aucune écriture source, export ou canonisation.

Statut : déployé sur GitHub `main` via PR #113, merge `e74a00c`. Aucun live revendiqué.

## 2026-06-21 — R4.3 D09 : API workbench auteur privée

- lecture des workbenches owner ;
- création et lecture des patches candidats ;
- aucun export, import ou canon automatique.

Statut : déployé sur GitHub `main` via PR #112, merge `6363d45`. Aucun live revendiqué.

## 2026-06-21 — R4.2 D09 : patch narratif candidat

- proposition privée rattachée au workbench ;
- état candidat explicite ; aucune réécriture ou canonisation automatique.

Statut : déployé sur GitHub `main` via PR #111, merge `abea3b9`. Aucun canon/export/live revendiqué.

## 2026-06-21 — R4.1 D09 : intake privé et reader state

- référence de source externe, sans import ;
- position lecteur obligatoire en mode lecture ;
- aucun patch ni canonisation automatique.

Statut : déployé sur GitHub `main` via PR #110, merge `0016b35`. Aucun import/canon/live revendiqué.

## 2026-06-21 — R3.4 D08 : revue manuelle Inbox

- soumission explicite du manifest à l’Inbox ;
- décision de cadrage uniquement ; les blocages de génération restent persistants.

Statut : déployé sur GitHub `main` via PR #109, merge `c319106`. Aucun provider/live revendiqué.

## 2026-06-21 — R3.3 D08 : classification de références

- le owner classe explicitement ses références plutôt que de les laisser influencer la DA en silence ;
- aucun classement n’autorise une génération, un asset, un export ou une canonisation.

Statut : déployé sur GitHub `main` via PR #106, merge `ab418e1`. Aucun live revendiqué.

## 2026-06-21 — R3.2 D08 : panneau owner manifest-first

- le owner peut créer références et manifest D08 privés depuis l’interface ;
- le rapport Action Ready rend les gates techniques visibles ;
- aucune action de génération, export ou canonisation n’est exposée.

Statut : déployé sur GitHub `main` via PR #105, merge `1a9018e`. Aucun live revendiqué.

## 2026-06-21 — R3.1 D08 : registre visuel manifest-first

- références visuelles privées, typées et avec provenance explicite ;
- manifest D08 privé avec DA root, layers, filtres, sortie et rapport Action Ready ;
- génération bloquée de façon explicite : pas de provider, asset, stockage, export ou canonisation.

Statut : déployé sur GitHub `main` via PR #104, merge `0baed27` ; backend 369/369 et TypeScript backend vert. Aucun live revendiqué.

## 2026-06-20 — R2.6 D06 : édition professeur isolée par fiche

- chaque fiche Teaching possède désormais son propre brouillon d’édition ;
- les valeurs persistées, champs non édités et verrous existants sont conservés ;
- aucune mutation n’a lieu avant le clic professeur.

Statut : déployé sur GitHub `main` via PR #102, merge `4f99268` ; backend 368/368,
TypeScript back/front et build Vite verts. Aucun live revendiqué.

## 2026-06-20 — R2.5 D06 : diff de fiche pour revue professeur

- chaque fiche compare ses champs dérivés à la version précédente du même assignment ;
- Teaching affiche les champs réellement modifiés avant validation ;
- aucune décision, gravité, note ou publication n’est inférée.

Statut : déployé sur GitHub `main` via PR #101, merge `977e870` ; backend 368/368,
TypeScript back/front et build Vite verts. Aucun live revendiqué.

## 2026-06-20 — R2.4 D05→D06 : paramètres pédagogiques complets

- objectifs, critères, compétences, Bloom, contraintes, checkpoints, mode d’évaluation,
  assistance et échéances rejoignent le manifest sujet versionné ;
- la fiche les dérive depuis le snapshot exact, sans interprétation ni score ;
- Teaching expose leur saisie ; anciens manifests relus avec valeurs neutres.

Statut : déployé sur GitHub `main` via PR #100, merge `4f04c0a` ; backend 368/368,
TypeScript back/front et build Vite verts. Aucun live revendiqué.

## 2026-06-20 — R2.3 D06 : fiche de correction autosynchronisée

- chaque assignment crée automatiquement une fiche brouillon depuis son snapshot de sujet ;
- synchroniser vers une nouvelle version validée crée une version append-only à revoir ;
- champs et verrous professeur sont conservés, jamais écrasés par la synchronisation ;
- validation professeur explicite, sans note, publication, job ni traitement de copies.

Statut : déployé sur GitHub `main` via PR #99, merge `2335ffa` ; backend 368/368,
TypeScript back/front et build Vite verts. Aucun live revendiqué.

## 2026-06-20 — R2.2 D05 : assignment de cohorte dérivé

- assignment créé uniquement depuis une version de sujet validée ;
- snapshot du manifest figé dans l'assignment ;
- évolution ultérieure du sujet source sans effet sur l'assignment historique ;
- cohorte active et scope owner/projet obligatoires ; activation manuelle séparée.

Statut : déployé sur GitHub `main` via PR #97-98, merges `e38c204` et `9e09427`.
La fiche de correction est désormais traitée par R2.3-R2.6 ; aucun live revendiqué.

## 2026-06-20 — R2.1 D05 : bibliothèque de sujets privés et versionnés

- sujet distinct d'une session, d'un PDF et d'un projet étudiant ;
- manifest mission : situation, tension, mission, décision, rendus, preuves et progression ;
- création brouillon, nouvelle version append-only et validation explicite ;
- `deployment_state=private_draft` obligatoire ; aucune publication ou assignment.

Statut : déployé sur GitHub `main` via PR #95-96, merges `130bfea` et `ee3fbd8`.
L'assignment et la fiche de correction sont désormais traités par R2.2-R2.6 ; aucun live revendiqué.

## 2026-06-20 — R1.5 Correction : gate d'exécution maintenu

- le service `correction_prepare` existe et exige déjà un manifest validé ;
- créer le job peut être consommé par un runner et traiter des données étudiantes ;
- aucun bouton Teaching ni job n'est créé sans décision provider, consentement et runtime live ;
- R1 reste implémenté jusqu'au manifest professeur, mais l'exécution n'est pas déclarée active.

Statut : gate réel, non contourné. Le marathon poursuit les tranches sûres hors provider/live.

## 2026-06-20 — R1.4 Correction : manifest d'échantillon validé par le professeur

- le professeur sélectionne explicitement des copies du lot ;
- seules les identités confirmées peuvent entrer dans le manifest ;
- le manifest naît brouillon puis reçoit une validation humaine séparée ;
- validation du manifest ne lance aucun runner, job, score ou feedback.

Statut : déployé sur GitHub `main` via PR #93, merge `e7626b0`. Runner automatique toujours fermé.

## 2026-06-20 — R1.3 Correction : intake de copies candidates dans Teaching

- une référence privée crée une preuve candidate puis une submission candidate ;
- le lot doit rester brouillon et déjà contextualisé ;
- le nom observé reste non confirmé ; aucun rapprochement automatique ;
- Teaching expose l'intake et rafraîchit le compteur du lot ;
- aucune correction, note, pré-correction, feedback ou export n'est lancé.

Statut : déployé sur GitHub `main` via PR #90-91, merges `280da79` et `cb7aa6a`. Aucun runner automatique.

## 2026-06-20 — R1.2 Correction : lot manuel contextualisé

- création atomique d'un lot privé et de son snapshot de contexte ;
- barème et profil obligatoirement validés, mêmes scope/projet que le lot ;
- roster actif, sujet, sources et profil de processus figés avant toute intake ;
- lot maintenu en `draft`, zéro submission, zéro score et zéro pré-correction.

Statut : déployé sur GitHub `main` via PR #88-89, merges `82a117a` et `6d55f70`. Aucune pré-correction.

## 2026-06-20 — R1.1 Correction : barèmes et profils privés/versionnés

- barème créé brouillon, validé explicitement puis conservé dans son historique ;
- profil de notation privé créé brouillon puis validé explicitement ;
- scopes owner ou projet éditeur vérifiés ; un godmode extérieur ne traverse pas un périmètre privé ;
- surface Teaching raccordée pour créer, versionner, relire et valider ces deux prérequis ;
- aucun lot, score, pré-correction, feedback, export, envoi étudiant, provider ou action live n'est lancé.

Statut : déployé sur GitHub `main` via PR #87, merge `0e52443`. Aucun lot, score ou provider.

## 2026-06-20 — Legacy → Canon → Git — CLÔTURE SÉMANTIQUE

- 692/692 artefacts fonctionnels disposent d'un statut ; aucune entrée sémantique en attente ;
- 108 absorbés, 294 canon-ready, 234 réduits, 52 restaurables plus tard et 4 sources bloquées ;
- le legacy n'est pas déclaré intégralement implémenté ou live ;
- le développement repart désormais de R1 Correction complète, pas de l'archive.

Statut : déployé sur GitHub `main` via PR #86, merge `d318c85`. Suite : R1 correction complète ; le legacy reste une archive, pas un runtime live.

## 2026-06-20 — Factories Legacy — 2 062/2 062 INVENTORIÉES PAR PASSPORT

- 13 groupes de factories candidates rattachés à des owners ;
- 233 groupes de doublons exacts couvrent 768 fichiers ;
- passerelles Vincent, archives, templates et ZIPs séparés des factories actives ;
- zéro Passport strict validé, installation, activation ou import.

Statut : déployé sur GitHub `main` via PR #85, merge `33a9da8`. Suite : gaps runtime seulement après R1 et sous gate D11.

## 2026-06-20 — Déploiements et audits historiques — INDEXÉS ET DÉDUPLIQUÉS

- 1 278 artefacts de déploiement et 413 fichiers d'audit lus ; aucun manquant ;
- 110 groupes SHA-256 contiennent 143 copies exactes redondantes ;
- aucune suppression, exécution de script ou action hôte ;
- handoff, ZIP, payload, audit daté, GitHub main et live restent des états distincts.

Statut : déployé sur GitHub `main` via PR #84, merge `610e558`. Suite : preuve live séparée ; zéro action hôte sans nouveau GO.

## 2026-06-20 — Personas et événements Legacy — 36/36 ARBITRÉS

- 24 personas classés avec activation manuelle, scoped et réversible ;
- 12 événements classés comme signaux sans effet sensible automatique ;
- persona, identité, permission et vérité restent séparées ;
- aucun branchement runtime ou affectation utilisateur effectué.

Statut : déployé sur GitHub `main` via PR #83, merge `62254bb`. Suite : aucune activation réelle sans contrat runtime dédié.

## 2026-06-20 — Datasets Legacy — 69/69 ARBITRÉS

- 10 règles absorbées, 40 registres canon-ready, 12 réduits et 3 sources candidates ;
- 4 sources privées ou à droits sensibles restent bloquées et non absorbées ;
- chaque artefact reçoit un owner et un rôle de vérité ;
- aucun import, déplacement, indexation ou exposition effectué.

Statut : déployé sur GitHub `main` via PR #82, merge `6213f81`. Suite : les 4 sources bloquées restent hors absorption.

## 2026-06-20 — Engines Legacy — 148/148 ARBITRÉS PAR OWNER

- 24 responsabilités absorbées, 59 canon-ready, 51 alias/modèles réduits et 14 candidats futurs ;
- les 148 fichiers sont consolidés sous 12 owners de domaine ;
- aucun microservice, super-engine ou runtime n'est déduit d'un nom legacy ;
- D12 concentre 62 modèles transverses, ramenés aux contrôles Git réels.

Statut : déployé sur GitHub `main` via PR #81, merge `c4b6e01`. Suite : ouvrir seulement des verticales runtime explicites, pas des sous-apps legacy.

## 2026-06-20 — Contrats Legacy D11-D12 — ARBITRAGE LOCAL VÉRIFIÉ

- 12 contrats confrontés au canon et au runtime ;
- 4 règles absorbées, 5 capacités canon prêtes à câbler et 3 capsules réduites ;
- backflow D11 confirmé candidate-only ;
- D12 observe et route, sans mutation autonome ni preuve live implicite.

Statut : déployé sur GitHub `main` via PR #80, merge `baba12c`. Suite : continuité runtime sur preuves privées, jamais via live implicite.

## 2026-06-20 — Contrats Legacy D09-D10 — ARBITRAGE LOCAL VÉRIFIÉ

- 20 contrats confrontés au canon et au runtime ;
- 11 règles déjà absorbées, 6 capacités canon prêtes à câbler et 3 adapters réduits ;
- D09 reste source/reader-state/workbench privé avant tout export ;
- D10 reste devis privé avant public/event ; facture, envoi et publication demeurent verrouillés.

Statut : déployé sur GitHub `main` via PR #79, merge `fddb05a`. Suite : rails privés désormais séparés des sorties/export/public.

## 2026-06-20 — Contrats Legacy D08 — ARBITRAGE LOCAL VÉRIFIÉ

- 48 contrats regroupés en six autorités réelles ;
- 10 règles déjà absorbées par le canon, 18 capacités canon prêtes à câbler,
  19 variantes réduites à des adapters et 1 capture conversationnelle à restaurer ;
- Comfy, provider, export social et propagation factory restent subordonnés au manifest ;
- aucun runtime D08, rendu, stockage ou génération déclaré actif.

Statut : déployé sur GitHub `main` via PR #78, merge `a2fbb7e`. Suite : provider, stockage, export et live restent verrouillés derrière le manifest-first.

## 2026-06-20 — Contrats Legacy D05-D07 — ARBITRAGE LOCAL VÉRIFIÉ

- 12 contrats confrontés au canon Drive et au runtime GitHub ;
- séparation explicite entre absorption canon et implémentation effective ;
- chaîne prioritaire D05/D06 confirmée : sujet versionné, barème/profil, fiche brouillon,
  assignment scoped, submissions et revue professeur ;
- D07 confirmé substantiel sans ingestion OCR/photo réelle ;
- contrat morphologique rerouté de D07 vers D08 pour interdire toute confusion avec
  identité ou biométrie.

Statut : déployé sur GitHub `main` via PR #77, merge `8ca761e` ; aucun code, provider, migration ou live modifié.
Suite : R1/R2 poursuivis sans réouvrir D07 hors gate.

## 2026-06-20 — Audit global Legacy → Canon → Git — PREMIER PASSAGE

- inventaire confirmé : 4 714 fichiers, dont 2 062 factories isolées ;
- P0 : 11/11 arbitrés ; queue de 692 artefacts fonctionnels créée ;
- D05/D06, D08, D09/D10, engines directeurs et datasets critiques confrontés au canon/Git ;
- anciens snapshots Git et cartes de progression obsolètes corrigés ;
- aucune capacité legacy n'est déclarée absorbée sans statut et preuve explicites.

Statut : publié sur GitHub ; cette entrée sert désormais de base historique, pas de tâche active.
Suite : la chaîne legacy poursuit R1 puis les autres verticales une fois leurs gates prouvés.

---

## 2026-06-20 — Audit prérequis lot de correction — ÉCART IDENTIFIÉ

- un lot exige déjà un barème et un profil de notation validés ;
- tables et contrôles existent, mais aucune route ou UI de gestion ;
- base de recette : zéro barème, zéro profil ;
- création directe du lot interdite pour ne pas contourner le canon.

Décision : restaurer d'abord la surface privée barème + profil, puis reprendre le lot.

---

## 2026-06-20 — Teaching Roster Management V1 — LOCAL VÉRIFIÉ

- cohorte privée créée depuis Teaching ;
- roster saisi manuellement, avec alias optionnels ;
- nouvelle version active et ancienne version archivée ;
- historique visible et isolation owner/projet conservée ;
- aucun import automatique, suppression ou effet de correction.

Recette : backend 363/363 ; TypeScript et build verts ; création navigateur cohorte + roster
V1 réussie ; desktop/mobile sans débordement ; console sans erreur.

Statut : mergé sur `main` via PR #69 (`0168a70`).
Prochaine tranche : lancement manuel d'un lot de correction contextualisé.

---

## 2026-06-20 — Identity Review UI V1 — LOCAL VÉRIFIÉ

- écran Teaching dédié aux ambiguïtés d'identité ;
- choix limité au roster figé du contexte de correction ;
- confirmation ou rejet toujours explicite par le professeur ;
- état vide compréhensible, aucun rapprochement automatique ;
- isolation backend conservée et aucun effet sur transcript, note ou feedback final.

Recette : backend 363/363 ; TypeScript backend/frontend et build Vite verts ; navigateur
desktop/mobile sans débordement horizontal ; console sans erreur ; diff-check OK.

Statut : mergé sur `main` via PR #67 (`4ccda9a`).
Prochaine tranche : gestion manuelle des cohortes et versions de roster dans Teaching.

---

## 2026-06-20 — Identity Match Candidates V1 — LOCAL VÉRIFIÉ

- noms/alias rapprochés uniquement par égalité normalisée et dans le roster figé ;
- toute proposition reste pending, même avec un match unique ;
- ambiguïtés multi-candidates conservées sans liaison ;
- confirmation/rejet explicites professeur, sélection hors liste et double décision refusées ;
- aucun matching LLM, fusion automatique ou fuite hors scope.

Recette : backend 363/363 ; TypeScript backend/frontend et build Vite verts ; diff-check OK.

Statut : mergé sur `main` via PR #65 (`7195a20`).
Prochaine tranche : UI professeur de revue des identités.

---

## 2026-06-20 — Liaison submission → student identity V1 — LOCAL VÉRIFIÉ

- choix manuel d'une identité présente dans le roster figé du snapshot ;
- aucun matching automatique par nom ou alias ;
- même choix idempotent, autre identité refusée après confirmation ;
- identité hors roster et accès godmode extérieur refusés ;
- preuve auditée, aucune modification de transcript ou feedback final.

Recette : backend 363/363 ; TypeScript backend/frontend et build Vite verts ; diff-check OK.

Statut : mergé sur `main` via PR #64 (`e0cf578`).
Prochaine tranche : candidates d'ambiguïté et confirmation professeur.

---

## 2026-06-20 — Payload privé de contexte correction V1 — LOCAL VÉRIFIÉ

- compile cohorte, période, version de roster, élèves et alias depuis le snapshot ;
- expose uniquement les refs sujet/barème/sources/process, jamais le transcript brut ;
- conserve la version historique même après activation d'un nouveau roster ;
- même isolation owner/projet que le batch ; payload explicitement privé et read-only.

Recette : ciblés 9/9 ; backend 363/363 ; TypeScript backend/frontend et build Vite verts ;
diff-check OK.

Statut : mergé sur `main` via PR #62 (`53efad0`).
Prochaine tranche : liaison explicite submission → student identity du roster figé.

---

## 2026-06-20 — Enforcement du contexte pré-correction V1 — LOCAL VÉRIFIÉ

- tout nouveau run exige un `context_snapshot_id` validement porté par son manifest ;
- snapshot, batch, owner, projet et barème doivent correspondre exactement ;
- la référence est conservée dans le run et son DTO ;
- migration additive ordonnée pour les bases existantes ;
- anciens enregistrements lisibles, aucun feedback final ni provider activé.

Recette : ciblés 11/11 ; backend 363/363 ; TypeScript backend/frontend et build Vite verts ;
diff-check OK.

Statut : mergé sur `main` via PR #61 (`a5fca40`).
Prochaine tranche : compilateur privé du payload roster/sujet/barème/sources.

---

## 2026-06-20 — Snapshot de contexte correction V1 — LOCAL VÉRIFIÉ

- snapshot unique par batch : cohorte, roster versionné, barème, sujet, sources et profil ;
- création seulement avant exécution (`draft`/`ready`) ;
- aucune update/delete API et ancienne version du roster toujours relisible ;
- isolation owner/projet maintenue, y compris face à un godmode extérieur ;
- aucun import, matching automatique, feedback final ou migration live.

Recette : ciblés roster+snapshot 7/7 ; backend 362/362 ; TypeScript backend/frontend et
build Vite verts ; diff-check OK.

Statut : mergé sur `main` via PR #60 (`c0bad0b`).
Prochaine tranche : rendre cette référence obligatoire dans le manifest/run de pré-correction.

---

## 2026-06-20 — Cohortes et rosters versionnés V1 — LOCAL VÉRIFIÉ

- cohorte privée teacher-scoped, optionnellement reliée à un projet editor+ ;
- roster manuel append-only par versions, ancienne version conservée et archivée ;
- identités explicites, sans matching automatique par nom/alias ;
- isolation owner/projet : un godmode extérieur ne lit pas une cohorte owner-private ;
- aucun import, sync établissement, suppression, correction finale ou activation live.

Recette : ciblés 4/4 ; backend 359/359 ; TypeScript backend/frontend et build Vite verts ;
diff-check OK.

Statut : mergé sur `main` via PR #59 (`236add0`). Prochaine tranche :
`correction_context_snapshot` immuable roster/sujet/barème/source.

---

## 2026-06-19 — Factory Manual Routing V6F — MERGÉ SUR MAIN (PR #47)

- confirmation admin/godmode limitée aux domaines recommandés ;
- route non recommandée refusée ; candidate-only, sans effet runtime.

Recette : Factory Backflow 5/5 ; TypeScript backend OK. Pont Drive synchronisé sur `2c39511`.

### Clôture D11 V1

Les quatre tranches D11 Factory Backflow sont désormais clôturées dans le runtime :

- V6C intake JSON strict et quarantaine ;
- V6D candidate updates après approbation owner ;
- V6E recommandations de domaine en lecture seule ;
- V6F routage manuel whitelisté, toujours `candidate_only`.

La clôture documentaire PR #49 place cet état sur GitHub `main` à
`ca3d3b7`. La recette opérateur unique est
`docs/d11-d12/FACTORY_BACKFLOW_OPERATOR_RECIPE_V1_2026-06-19.md`.

**D11 V1 est fermé.** Toute suite — import de fichiers/ZIP/URL, installation,
activation runtime, écriture canon, job, provider ou promotion automatique —
est un nouveau chantier produit, pas une prolongation de D11 V1.

---

## 2026-06-19 — Factory Routing Recommendations V6E — MERGÉ SUR MAIN (PR #46)

- recommandations lecture seule : DA→D08, PROJECT_LORE→D09, PEDAGOGY→D05/D06 ;
- les autres classifications restent sans recommandation sûre ;
- `target_domain` reste nul, sans routage ni effet runtime.

Statut : mergé via PR #46 (`c23c33d`) ; le routage manuel V6F est livré
séparément via PR #47.

---

## 2026-06-19 — Factory Candidate Updates V6D — LOCAL VÉRIFIÉ

- une approbation V6C matérialise une fiche locale par candidat exporté ;
- la fiche reste `candidate_only`, non routée et sans domaine cible ;
- quarantaine, précision, park, rejet et archive ne créent aucune fiche ;
- la lecture est réservée admin/godmode ; aucun Usage Harvester, action, job, import,
  activation runtime ou écriture canon n'est déclenché.

Recette : Factory Backflow + Inbox 24/24 ; TypeScript backend OK.

Statut : mergé via PR #45 (`17e57f8`) ; pont Drive ensuite synchronisé avec les
tranches V6E/V6F.

---

## 2026-06-19 — Factory Backflow Intake V6C — MERGÉ SUR MAIN (PR #42)

- `POST /api/v1/backflow/intake` reçoit uniquement un manifeste JSON admin/godmode ;
- le dossier contient un Factory Passport et un export backflow structurés, sans ZIP,
  fichier, URL ni fetch externe ;
- toute absence de passport, manifest, classification privacy, préflight sécurité,
  simulation ou nettoyage privé est persistée en `quarantined` et projetée `blocked` ;
- une quarantaine ne peut jamais être approuvée ; elle demande une nouvelle soumission précise ;
- l'objet `factory_backflow_intake` est séparé du Usage Harvester et passe par la Shared
  Validation Inbox ; même approuvé, il ne crée ni import, runtime, action, job, canon ou déploiement.

Recette : Factory Backflow + Inbox 24/24 ; backend complet 351/351 ; TypeScript
backend/frontend et build Vite OK.

Statut : PR #42 runtime puis PR #43 preuve, `main` = `c0a98bb`; pont Drive relu et synchronisé.
Le déploiement live reste non vérifié sans `MASTERFLOW_RELEASE_SHA`.

---

## 2026-06-19 — Usage Harvester V6B sources structurées — MERGÉ SUR MAIN (PR #40)

- chaque teacher decision delta autorisé crée ou renforce une candidate `repeated_correction` ;
- seuls les types, champs modifiés et références sont utilisés ; proposition, décision et note
  libre ne sont pas lues ;
- une finding D12 ne traverse qu'après validation explicite `validated_alert` ;
- observation, hypothèse, candidate pattern, stale ou archive ne créent aucun apprentissage ;
- qualification, déduplication, routage GodMode et Shared Validation Inbox sont réutilisés ;
- aucun process update, canon write, job, provider ou effet externe.

Recette : ciblés 37/37 ; backend 347/347 ; TypeScript backend/frontend et build Vite OK.

Statut : mergé via PR #40 (`5b1acae`) ; première suite complète bloquée par les ports sandbox,
relance autorisée verte 347/347.

---

## 2026-06-19 — Native Usage Harvester D11-D12 V1 — MERGÉ SUR MAIN (PR #38)

- les événements workflow d'échec, blocage, rejet ou ressource/permission manquante créent
  automatiquement une candidate privée ;
- les événements neutres ne créent rien ;
- répétitions et preuves sont dédupliquées dans une vérité candidate unique ;
- le routeur cible les propriétaires fonctionnels du Domain Map, jamais un compte inventé ;
- les routages ambigus gardent un seul candidat avec plusieurs reviewers ;
- la Shared Validation Inbox admin/godmode permet approve, park, reject ou archive ;
- une approbation ne modifie ni processus, ni canon, ni système externe ;
- la fausse information « runtime finding absent » est corrigée en `partial` : finding et revue
  existent, détecteur automatique toujours absent.

Recette : ciblés Usage Harvester/D12 43/43 ; backend complet 347/347 ; TypeScript backend OK.

Statut : mergé via PR #38 (`7ec5baa`) ; aucune conversation brute, action, job, provider ou écriture canon.

---

## 2026-06-19 — Vérité de pilotage post-PR #35 — MERGÉE SUR MAIN (PR #36)

- les vagues 0, 1, 2, 5C et 5D ne sont plus présentées comme locales ou en attente ;
- D06 preview privée est bien marquée mergée, mais export réel et envoi restent verrouillés ;
- la fausse alerte « context hashes absents » est retirée de la matrice ;
- GitHub `main` et le pont Drive ont été relus avant correction ;
- l'état live demeure non vérifié sans `MASTERFLOW_RELEASE_SHA`.

Statut : mergé via PR #36 (`5385d6e`) ; preuve de publication PR #37 ; aucun runtime modifié.

---

## 2026-06-19 — Recette isolée D05-D06 — MERGÉE SUR MAIN (PR #34)

- D05 Guided Runtime : service 8/8 et router 4/4 ;
- D06 feedback et Shared Validation Inbox : 26/26 ;
- backend complet : 341/341 ;
- aucun provider, export, fichier, job, publication, envoi étudiant ou note finale créé ;
- le lancement D06 doit rester dans `apps/backend`, afin de garder la base de tests isolée.

Statut : preuve mergée sur GitHub `main` via PR #34 (`bcd5535`) ; recette exécutée sur la base
`bec7e370` ; aucune nouvelle capacité produit ouverte.

---

## 2026-06-19 — Visibilité owner du comparateur contextuel — MERGÉ SUR MAIN (PR #32)

- la trace de l'action courante affiche le résultat contextuel read-only ;
- `unchanged`, `requires_review` et `inconclusive` sont traduits en langage lisible ;
- les refs modifiées ou à vérifier sont visibles ;
- aucun bouton ne relance, ne valide, ne stale ou n'exécute l'action.

Recette : TypeScript frontend et build Vite OK ; backend 341/341 conservé.

Statut : mergé sur `main` via PR #32 (`09140e8`).

---

## 2026-06-19 — Politique V1 changement de contexte — VALIDÉE

- une divergence fiable retourne `requires_review` et recommande un re-preflight humain ;
- aucune famille D05, D06, D08, export ou canon-write n'obtient un stale automatique en V1 ;
- le stale demeure réservé aux hard-stops explicites déjà implémentés ;
- prochain geste sûr : visibilité owner du comparateur, lecture seule.

Politique : `docs/process-activation/CONTEXT_CHANGE_RESPONSE_POLICY_V1_2026-06-19.md`.

Statut : mergée sur `main` via PR #31 (`56c5a0f`).

---

## 2026-06-19 — Snapshot contextuel et comparateur read-only — MERGÉ SUR MAIN (PR #29)

- chaque preflight sensible avec Room capture une seule empreinte privée immuable ;
- l'empreinte ne contient ni contenu RAG, ni conversation, ni champ UI volatile ;
- `GET /actions/:id/context-comparison` retourne `unchanged`, `requires_review` ou
  `inconclusive` ;
- une Room modifiée produit `requires_review` et suggère re-preflight, sans rendre l'action stale ;
- snapshot absent ou source sans révision fiable = `inconclusive`, jamais mutation automatique ;
- le hard-stop reste une garde indépendante.

Recette : lifecycle 15/15, API 7/7, activation 5/5 ; backend complet 341/341 ; TypeScript
backend/frontend, build Vite et diff-check OK.

Statut : mergé sur `main` via PR #29 (`54b97cf`).

---

## 2026-06-19 — Audit context-hash et re-preflight — MERGÉ SUR MAIN (PR #27)

- le contexte runtime compilé existe, mais aucun snapshot de preflight ni fingerprint stable ;
- les références RAG dérivées ne peuvent pas déclencher une invalidation automatique ;
- recommandation : snapshot privé immuable et comparateur read-only `unchanged`,
  `requires_review` ou `inconclusive` ;
- aucun status action, job ou hard-stop ne change dans cette tranche ;
- décider ensuite, famille par famille, si un changement fiable impose re-preflight ou `stale`.

Audit : `docs/process-activation/CONTEXT_HASH_SNAPSHOT_AUDIT_2026-06-19.md`.

Statut : audit mergé sur `main` via PR #27 (`593ffba`) ; décision produit requise avant runtime.

---

## 2026-06-19 — Hard-stop persistant owner + Room — MERGÉ SUR MAIN (PR #25)

- activation explicite teacher+ sur une Room réelle et accessible ;
- état borné à l'owner et à cette Room, sans propagation aux autres owners ;
- les nouveaux preflights sensibles de ce scope passent `failed: hard_stop_active` ;
- les lectures/actions low-risk continuent ;
- reprise explicite teacher+ ; aucune action stale ou failed n'est réactivée ;
- le diagnostic texte reste sans mutation ;
- aucune suppression, exécution ou annulation de job.

Recette : ciblés hard-stop/action lifecycle/process activation 25/25 ; backend complet 339/339 ;
TypeScript backend/frontend, build Vite et diff-check OK.

Statut : mergé sur `main` via PR #25 (`64aa5a0`).

---

## 2026-06-19 — Audit hard-stop persistant — DÉCISION PRODUIT REQUISE

- l'application sur sélection explicite est bien sur `main` ;
- aucun état stop persistant n'existe encore dans le runtime ;
- recommandation : portée `owner + Room réelle`, jamais owner/projet global par défaut ;
- pendant le stop, seuls les nouveaux preflights sensibles de cette Room seraient bloqués ;
- lectures low-risk, revue et reprise explicite teacher+ resteraient accessibles ;
- reprendre ne réactive jamais une action stale ;
- aucun code ou migration ouvert avant validation de cette portée.

Audit : `docs/process-activation/HARD_STOP_PERSISTENT_STATE_AUDIT_2026-06-19.md`.

Statut : audit mergé sur `main` via PR #23 (`d748f4f`) ; décision validée par MALEX avec `next`.

---

## 2026-06-19 — Hard-stop sur sélection explicite — MERGÉ SUR MAIN (PR #21)

Tranche d'application bornée :

- `POST /api/v1/actions/expire-context/selected` ;
- l'Owner Cockpit prévisualise puis laisse toutes les actions décochées par défaut ;
- chaque candidate affiche intention, objet, statut et risque plutôt qu'un identifiant seul ;
- seules les actions sensibles ouvertes explicitement cochées passent `stale` ;
- sélection atomique : un identifiant inaccessible, low-risk, stale ou hors scope annule toute
  l'opération ;
- aucun gel automatique depuis le texte, aucune suppression, exécution ou annulation de job ;
- le prochain écart canon devient l'état hard-stop persistant, pas l'application sélectionnée.

Recette locale : action expiry/lifecycle/process activation 22/22 ; backend complet 336/336 ;
TypeScript backend/frontend, build Vite et diff-check OK.

Statut : mergé sur `main` via PR #21 (`0844358`).

---

## 2026-06-19 — Prévisualisation hard-stop / action expiry — MERGÉ SUR MAIN (PR #19)

Tranche read-only :

- `POST /api/v1/actions/expire-context/preview` ;
- mêmes scopes et permissions que le garde d'expiration réel ;
- retourne uniquement les actions sensibles ouvertes qui seraient rendues stale ;
- Owner Cockpit propose la prévisualisation après un signal stop/reset ;
- aucun statut, job, action, validation ou audit métier n'est modifié ;
- l'application réelle du stop reste séparée jusqu'à validation de la granularité.

Recette locale : action expiry/lifecycle/process activation 17/17 ; backend complet 331/331 ;
TypeScript backend/frontend, build Vite et diff-check OK.

Statut : mergé sur `main` via PR #19 (`0fa4959`).

---

## 2026-06-19 — Findings D12 → Shared Validation Inbox — MERGÉ SUR MAIN (PR #17)

Tranche de revue commune :

- les findings D12 sans décision owner sont projetées comme `autonomy_proposal` ;
- visibilité strictement admin/godmode ;
- décisions inbox : `approve` valide l'alerte, `park` garde l'observation, `reject` marque stale,
  `archive` archive ;
- les promotions fines hypothèse/pattern restent dans l'autorité D12 dédiée ;
- aucune décision ne crée action, job, patch, déploiement ou écriture canon.

Recette locale : Validation Inbox 20/20, D12 findings 5/5, Owner Cockpit 4/4 ;
backend complet 329/329, TypeScript backend/frontend, build Vite et diff-check OK.

Statut : mergé sur `main` via PR #17 (`a72b809`).

## 2026-06-19 — Preuve de publication Vagues 3A→4D — MERGÉ SUR MAIN

Les mentions historiques « local » ci-dessous décrivent leur état au moment de la recette.
État GitHub actuel vérifié :

- PR #10 process activation : `379f4f8` ;
- PR #11 action expiry : `c51c97f` ;
- PR #12 stale actions cockpit : `3e93ad8` ;
- PR #13 D12 findings : `30a5155` ;
- PR #14 findings cockpit : `15cd539` ;
- PR #15 création manuelle finding : `82231d1` ;
- PR #16 décisions owner : `003c866`.

`HEAD`, `origin/main` et GitHub `main` sont alignés sur `003c866` avant la nouvelle tranche.
Cela ne prouve pas le déploiement live, qui reste non vérifié sans `MASTERFLOW_RELEASE_SHA`.

## 2026-06-19 — D12 finding owner decisions — MERGÉ SUR MAIN (PR #16)

Tranche décision owner :

- `POST /api/v1/diagnostics/d12/findings/:id/decision` ;
- décisions : garder observation, promouvoir hypothèse, pattern candidat, alerte validée,
  marquer stale ou archiver ;
- la décision ne crée aucune action, aucun job, aucun patch et aucune écriture canon ;
- la note owner est stockée dans `owner_decision_json`.

Recette locale : ciblés D12 finding decisions + cockpit 9/9 ; TypeScript backend/frontend OK.

Statut : mergé sur `main` via PR #16 (`003c866`).

---

## 2026-06-19 — Process activation → finding D12 manuelle — MERGÉ SUR MAIN (PR #15)

Tranche UI manuelle :

- si le diagnostic process activation produit un `missed_trigger_candidate`, le cockpit affiche un
  bouton `Créer une finding D12 observation-only` ;
- le bouton appelle explicitement `POST /diagnostics/d12/findings` ;
- la finding est créée au statut `observation` puis le cockpit est rafraîchi ;
- aucun auto-fix, auto-canon, action, job ou provider n'est déclenché.

Recette locale : ciblés D12/process/cockpit 12/12 ; TypeScript backend/frontend OK ; build Vite OK ;
smoke navigateur local OK sur `Stop, ne génère pas` → finding créée → alerte D12 visible.

Statut : mergé sur `main` via PR #15 (`82231d1`).

---

## 2026-06-19 — D12 findings dans Owner Cockpit — MERGÉ SUR MAIN (PR #14)

Tranche lecture seule :

- le cockpit compte les findings D12 totales, ouvertes et high/critical ;
- alerte `d12_findings_present` si des observations attendent une décision owner ;
- prochaine action sûre orientée revue, sans auto-fix, auto-canon ou auto-patch ;
- UI ajoute `Findings D12` au résumé cockpit.

Recette locale : ciblés owner cockpit + D12 findings 7/7 ; TypeScript backend/frontend OK.

Statut : mergé sur `main` via PR #14 (`15cd539`).

---

## 2026-06-19 — D12 missed-trigger findings — MERGÉ SUR MAIN (PR #13)

Première tranche observation-only :

- table `d12_missed_trigger_findings` ;
- `POST /api/v1/diagnostics/d12/findings`, privé admin/godmode ;
- `GET /api/v1/diagnostics/d12/findings`, liste/filtre privé ;
- statut initial `observation` uniquement ;
- aucun passage en action, aucun job, aucun patch, aucune écriture canon ;
- trace audit `d12_missed_trigger_finding_created`.

Recette locale : ciblés D12 findings / process activation / owner cockpit 11/11 ;
TypeScript backend/frontend OK.

Statut : mergé sur `main` via PR #13 (`30a5155`).

---

## 2026-06-19 — Stale actions dans Owner Cockpit — MERGÉ SUR MAIN (PR #12)

Tranche lecture seule :

- le cockpit compte les actions `pending_validation`, `approved` et `stale` visibles ;
- ajout du compteur `Actions stale` dans le résumé owner ;
- alerte `stale_actions_present` si une action obsolète existe ;
- prochaine action sûre : abandonner ou repasser en preflight, jamais retry automatique.

Recette : ciblés owner cockpit / action expiry / action lifecycle 13/13 ; backend complet 317/317 ;
TypeScript backend/frontend OK ; build Vite OK ; diff-check OK.

Statut : mergé sur `main` via PR #12 (`3e93ad8`).

---

## 2026-06-18 — Action expiry guard — MERGÉ SUR MAIN (PR #11)

Première tranche runtime bornée :

- nouveau statut action `stale` ;
- `POST /api/v1/actions/expire-context`, réservé `teacher+` ;
- scope `mine` ou `project`, avec contrôle d'accès projet ;
- ne touche que les actions sensibles ouvertes `pending_validation` ou `approved` ;
- ne supprime rien, n'exécute rien, ne touche pas aux actions `executing/completed/failed/rejected` ;
- une action `stale` ne peut plus être validée ni exécutée sans nouveau cycle.

Recette locale : ciblés action lifecycle / action expiry router / Validation Inbox 24/24 ;
TypeScript backend/frontend OK.

Statut : mergé sur `main` via PR #11 (`c51c97f`).

---

## 2026-06-18 — Process activation read-model — MERGÉ SUR MAIN (PR #10)

Première tranche observation-only :

- analyse déterministe d'une intention owner dans le cockpit ;
- candidats initiaux correction D05-D06, D08 visuel, D10 devis, canon delta, hard stop et D12 finding ;
- niveau de contexte requis, gates, route de validation candidate et actions bloquées ;
- confiance et statut explicites ;
- cockpit aligné : capacité `process_activation` affichée `partial`, avec alerte observation-only ;
- aucun LLM, stockage du signal, action, job, finding ou exécution.

Recette : ciblés process activation / owner cockpit / gate-ordering 9/9 ; backend complet 311/311 ;
TypeScript backend/frontend OK ; build Vite OK ; smoke navigateur cockpit OK sur correction, image
D08 et stop hard-stop, sans action/job/génération.

Statut : mergé sur `main` via PR #10 (`379f4f8`).

---

## 2026-06-18 — D06 preview privée → Validation Inbox — IMPLÉMENTÉ LOCAL

Deuxième source D06 de l'inbox commune après `feedback_draft` :

- projection owner-only de `correction_export_preview` en attente ;
- décision approve/reject déléguée à `reviewCorrectionExportPreview` ;
- approbation = `approved_for_export`, jamais publication ou envoi ;
- aucune référence `storage://` exposée dans l'item ;
- aucun job `export_prepare`, fichier final ou effet externe créé ;
- migration SQLite additive préservant actions et feedback drafts.

Recette : ciblés D06/inbox/jobs 26/26 ; backend complet 306/306 ; TypeScript backend/frontend et
build Vite OK. Approve/reject owner-only, aucune référence storage exposée et aucun job implicite.

Statut : recette publiée sur GitHub `main` via PR #34 (`bcd5535`) et preuve PR #35. Aucun export, job, provider ou effet externe.

---

## 2026-06-18 — Teaching D05 actions guidées — IMPLÉMENTÉ LOCAL

Contrat : rendre la session guidée D05 utilisable dans le bloc `Sujet guidé` de Teaching, sans
chat générique et sans déclencher correction, feedback, note, export ou envoi étudiant.

Ajouts locaux sur `codex/d05-teaching-guided-actions` :

- démarrage depuis un guide `validated` uniquement ;
- consentement privé visible lorsque le guide l'exige ;
- saisie adaptée aux questions text, number, boolean, choice et multi_choice ;
- contribution tracée, progression recalculée et fin uniquement si le record est complet ;
- permissions et validation de schéma déléguées au Guided Runtime existant.
- correction ciblée : le créateur global d'une session projet peut devenir owner de sa propre
  session sans être requalifié comme student ; tout autre participant reste soumis au membership projet.
- création atomique : session et participant owner sont désormais écrits dans une transaction ;
  un échec d'initialisation ne laisse plus de session orpheline active.

Recette : vraie session locale projet 0→100 % puis `completed`, 0 contradiction, 0 session active
orpheline, 0 feedback draft, 0 export preview, 0 job et audit `external_effects: []`.
Backend complet 302/302, TypeScript backend/frontend et build Vite OK ; smoke godmode et responsive
390 px sans débordement horizontal.

Statut : recette publiée sur GitHub `main` via PR #34 (`bcd5535`) et preuve PR #35. Aucun feedback, note, export ou envoi.

---

## 2026-06-18 — D12 Owner Cockpit status — IMPLÉMENTÉ LOCAL

Contrat : expliquer l'état runtime en décisions sans prétendre lire automatiquement GitHub ou le
Drive canon.

Ajouts locaux sur `codex/d12-owner-cockpit-runtime` :

- `GET /api/v1/diagnostics/owner-cockpit`, privé admin/godmode ;
- agrégats validations/jobs sans contenu métier privé ;
- capacités `implemented/partial/locked/absent`, alertes et prochain geste sûr ;
- SHA live optionnel via `MASTERFLOW_RELEASE_SHA` ; sinon statut explicite `unverified` ;
- cockpit frontend branché sur ce read-model au lieu d'une heuristique locale ;
- aucun appel GitHub/Drive, auto-fix, auto-retry, validation ou mutation métier.

Recette : tests HTTP ciblés 4/4, backend complet 301/301, TypeScript backend/frontend et build
Vite OK. Smoke navigateur godmode OK ; responsive 390 px sans débordement horizontal.

Statut : déployé sur GitHub `main` via PR #7 (`cdd2111`), puis enrichi par PR #14-16. Aucun live vérifié sans preuve runtime.

---

## 2026-06-18 — Contrat D06 → Validation Inbox — SPEC LOCALE

Mise à jour locale : contrat implémenté sur la branche `codex/d06-validation-inbox-contract`.

Livré localement :

- extension du contrat partagé `ValidationInboxItem.source_kind` à `action | feedback_draft` ;
- migration SQLite idempotente du CHECK `validation_inbox_items.source_kind`, avec conservation des
  items `action` existants ;
- projection des `feedback_drafts.status = needs_teacher_validation` dans la Validation Inbox
  commune, owner-only ;
- décision `approve/reject` déléguée à `reviewFeedbackDraft()`, jamais par update direct D06 ;
- approbation = feedback utilisable comme source d'une preview privée, sans export automatique,
  sans note finale et sans envoi étudiant.

Recette locale : ciblés Validation Inbox + feedback exports **16/16**, backend complet **299/299**,
TypeScript backend/frontend OK, build frontend OK.

Statut : déployé sur GitHub `main` via PR #5, merge `bb61e4f`. Aucun export, note finale ou envoi étudiant.

---

Audit canon et code : `feedback_draft` est le premier objet D06 projetable en sécurité, car il
possède déjà une attente explicite, une autorité owner-only `reviewFeedbackDraft`, un scope, une
décision approve/reject et un audit.

La pré-correction et la calibration restent exclues : leurs statuts sont figés en review sans
autorité de résolution. L'export preview viendra seulement après la projection feedback.

Le contrat couvre la migration SQLite nécessaire (`source_kind` est actuellement limité à
`action`), le mapping, la confidentialité, le dispatch vers l'autorité D06 et les tests de
non-régression.

Référence : `docs/d06/D06_VALIDATION_INBOX_PROJECTION_CONTRACT_2026-06-18.md`.

Statut historique : spec validée en travail local, puis implémentée localement dans la même tranche.

## 2026-06-18 — Teaching Guided Subject — INTÉGRÉ SUR `main`

Contrat : afficher le guide et la session active/récente réellement lisibles dans Teaching, sans
création de session, réponse, correction ou envoi.

Ajouts :

- `GET /api/v1/guided-sessions` retourne uniquement les sessions lisibles par l'owner, un
  participant ou un rôle admin/godmode selon les permissions existantes ;
- le client frontend charge guides + sessions + jobs en parallèle ;
- Teaching privilégie une session active dans le projet/Room courant, puis la plus récente ;
- affichage du nom, but, statut, version, progression, champs manquants, contradictions et question
  courante ;
- état vide explicite : aucun sujet n'est inventé et aucune session ne démarre automatiquement.

Recette : tests guided runtime **11/11**, TypeScript backend/frontend OK, build Vite 8 OK, smoke
navigateur godmode OK, responsive 390 px sans débordement.

Statut : PR #4 mergée sur `main` au commit `c2a4ea3`.

## 2026-06-18 — D05-D06 Teaching readiness — INTÉGRÉ SUR `main`

Références canon lues avant implémentation :

- `05_UI_RUNTIME_CONTRACTS/D05_D06_VERTICAL_UI_RUNTIME_CONTRACT.md` ;
- `08_ROADMAP/D05_D06_UI_RUNTIME_MAPPING_NEXT_STEPS.md` ;
- `08_ROADMAP/FIRST_VERTICAL_PRODUCT_PROOF_D05_D06.md`.

Première tranche frontend D05-D06 en lecture seule :

- état Room/projet/sources ;
- distinction visible `prêt` / `partiel` / `bloqué` ;
- compte compact des validations, jobs à revoir et échecs ;
- prochain geste sûr ;
- limites explicites : pas de correction automatique, note finale, envoi étudiant ou promesse d'upload.

Le panneau utilise uniquement le contexte, les ressources, la Validation Inbox déjà chargée et
`GET /jobs`. Aucune mutation ni nouvelle queue métier.

Recette : TypeScript backend/frontend OK, build Vite 8 OK, tests rôles/runtime **4/4**, smoke
navigateur godmode OK et responsive 390 px sans débordement horizontal.

Écart découvert pendant le smoke local : la Home Room seedée exposait uniquement Home et
Inventory. Décision MALEX : ouvrir Teaching dans la Home Room pour `teacher` et `godmode`
uniquement. Le seed ajoute désormais le mode sans retirer les modes configurés ; le frontend
refuse explicitement Teaching aux rôles `student` et `admin`. Une Room pédagogie dédiée reste une
décision ultérieure.

Statut : PR #3 mergée sur `main` au commit `ed7c0f1`.

## 2026-06-18 — Shared Validation Inbox action-based — BACKEND + UI VÉRIFIÉS

Référence canon lue avant implémentation :

- `05_UI_RUNTIME_CONTRACTS/SHARED_VALIDATION_INBOX_MVP_CONTRACT.md` ;
- `04_BRIDGE_PRIMITIVES/VALIDATION_INBOX_GLOBAL_SCHEMA.md` ;
- `04_BRIDGE_PRIMITIVES/VALIDATION_INBOX_AND_CANDIDATE_CANON_CONTROLS.md`.

La fondation `b52fff4` est reprise au-dessus du `main` courant puis câblée au frontend :

- contrats partagés, table et routes `/validation-inbox` ;
- projection des actions `pending_validation` sans créer un second cycle métier ;
- décision `approve/reject` déléguée à `validateAction`, jamais à un effet direct ;
- UI commune affichant changement, impact, source, risque, validateur, blocages et prochaine décision ;
- exécution toujours séparée de la validation ;
- accès HTTP refusé aux comptes `student`.

Recette : backend **293/293**, tests ciblés **17/17**, TypeScript backend/frontend et build Vite OK.
Smoke navigateur local godmode : item affiché, rejet tracé, compteur revenu à zéro. Responsive
390 px : aucun débordement horizontal. OpenRouter/ComfyUI non lancés ; backend en mode mock.

Limite explicite : cette première tranche projette les actions uniquement. Les candidats D06-D12
seront raccordés progressivement à la même inbox, sans queues parallèles.

---

## 2026-06-18 — Panneau admin routage LLM — INTÉGRÉ SUR `main`

Le commit `3d6ec15` a été fast-forward sur `origin/main` après vérification complète : backend
**288/288**, TypeScript backend/frontend, build Vite et diff-check verts. Aucun provider réel,
secret ou bouton d'activation n'est exposé.

---

## 2026-06-15 — Panneau admin routage LLM — PRÊT SUR BRANCHE

Branche MALEX/Codex : `codex/admin-llm-routing-panel`.

But : répondre au handoff Vincent du 2026-06-14 sans activer de provider réel. Le panneau admin
expose maintenant les profils `task_model_profiles` et les met en regard du monitoring
`token_events`.

Ajouts :

- route backend lecture seule `GET /admin/llm/task-model-profiles`, gated `admin/godmode` via
  le routeur `/admin` existant ;
- service `listTaskModelProfiles()` réutilisant le mapping `TaskModelProfile` existant ;
- client frontend `getTaskModelProfiles()` ;
- section `Routage LLM · profils par tâche` dans `AdminConsole` :
  tâche, statut, provider autorisé, modèle de base, overrides par rôle, privacy mode, usage par
  tâche et usage par modèle ;
- test `admin_llm_profiles.test.ts` : 401 sans token, 403 student, lecture admin, absence de
  `api_key`/`base_url` dans la réponse.

Garde-fous :

- aucune clé, base URL, secret ou variable d'environnement exposé ;
- aucune écriture de profil ;
- aucun bouton d'activation live ;
- OpenRouter reste inerte tant que `LLM_PROVIDER=mock` / clé env serveur absente.

Recette locale :

- tests ciblés `admin_llm_profiles` + `token_usage` + `router_gating_integration` : **11/11** ;
- backend complet : **288/288** ;
- backend TypeScript : OK ;
- frontend TypeScript : OK ;
- frontend build Vite 8 : OK, warning chunk recharts attendu ;
- `git diff --check` : OK.

Statut : prêt à commit/push après validation MALEX.

---

## 2026-06-14 — Backend OpenRouter : FINI + vérifié en local + lint vert + migration DB — handoff MALEX confirmé

Clôture de la mission backend. `action_registry` corrigé (`tsc` backend **0 erreur**) ; **migration
idempotente** du CHECK `task_model_profiles` (`image_generation`, reconstruction de table foreign_keys
OFF) livrée et **vérifiée sur la DB de dev réelle** (8 profils validés, `role_models_json` présent).
App relancée et vérifiée : frontend funnel `:10000` (vite 8 — l'ancien process périmé causait un écran
blanc, relancé proprement) + backend `:8000` en mock. Confirmation handoff dans `INBOX_MALEX.md`. Tout sur `main`.

---

## 2026-06-14 — BACKEND EN PLACE : OpenRouter fournisseur du projet + branchements (OCR / prof / image) — MERGÉ `main`

**GO Vincent (autorisation explicite commit + push `main`).** Clôture de la partie backend par
Vincent/Claude. Intègre sur `main` les deux branches précédentes (`claude/model-per-profile`,
`claude/ocr-runner-openrouter`) **+** le câblage OpenRouter complet. **Inerte par défaut** :
`LLM_PROVIDER=mock` ⇒ zéro appel réseau tant que la clé OpenRouter n'est pas posée en env serveur.

**Livré :**
- **OpenRouter = fournisseur LLM du projet** (gateway : 1 clé / 1 base URL, N modèles). `.env.example`
  documente l'interrupteur réel ; egress allowlistée (`https://openrouter.ai`), fail-closed inchangé.
- **Routage par tâche × rôle (économie de tokens)** : `role_models` (modèle par rôle) additif sur
  `TaskModelProfile` ; `resolveLLMRoute(task, config, role?)` = `role_models[role] ?? model ?? env`.
  Le chat WS passe `task='chat'` + le rôle de l'appelant → student bon marché, escalade teacher/admin.
- **Seed de profils VALIDÉS par tâche** (provider openrouter), inertes sans clé. 1 profil/ tâche,
  idempotent. `db/seed.ts::seedTaskModelProfiles`.
- **OCR** : runner réel déjà livré, intégré ici (`runners/ocr_runner.ts`, sortie `needs_review`).
- **Génération d'image (gate GO IMAGE préservé)** : tâche `image_generation` + contrats
  `ImageGenerationRequest`/`GeneratedImage` ; `createImageGenerationJob` (job `asset_prepare`,
  **exécuteur d'action approuvée — aucune route HTTP directe**) ; `runners/image_runner.ts` dispatch
  **ComfyUI local → OpenRouter → mock** (sortie `needs_review`, jamais `completed`, jamais d'image
  inventée ; ComfyUI local-only, 1 job GPU à la fois).

**Recette** : backend `tsc` (seule erreur `action_registry.test.ts` **préexistante**), `vitest`
**286/286** ✓, frontend `tsc` + `vite build` ✓ (additif `shared`, front intact).

**Reste = geste humain / MALEX** : (1) poser la clé OpenRouter + `LLM_*` en env serveur pour passer
live ; (2) câbler l'action gated `preflight_image_action`/`create_render_manifest` → `createImageGenerationJob`
et, si voulu, lancer un ComfyUI local ; (3) **frontend** (panneau admin de routage LLM) = territoire MALEX.
**Pas de frontend touché ici** (choix Vincent). Note de handoff dans `INBOX_MALEX.md`.

---

## 2026-06-14 — Validation Inbox MVP foundation — LIVRÉ SUR BRANCHE

Branche MALEX/Codex : `codex/validation-inbox-mvp-foundation`.

Objectif : poser la première fondation partagée de `Validation Inbox` sans réinventer le cycle
d'actions existant.

Livré :
- contrats typés partagés `ValidationInboxItem*` dans `packages/shared` ;
- table `validation_inbox_items` avec source actuelle `action` et index de lecture ;
- service `validation_inbox.ts` qui projette les actions `pending_validation` en items
  `needs_review` canon ;
- route backend `GET /validation-inbox`, `GET /validation-inbox/:id`,
  `POST /validation-inbox/:id/decision` ;
- décision MVP action-based : `approve/reject` uniquement, en réutilisant `validateAction`
  comme autorité réelle ;
- test de non-régression gate-ordering : le router n'utilise pas de `router.use(requireRole)`
  monté à la racine.

Limites assumées :
- pas encore de dashboard frontend dédié ;
- pas encore de projection D06/D07/D08/D09/D10/D11/D12 hors actions ;
- `park/request_precision/archive/export_patch` restent refusés sur une action dans cette première
  tranche.

Recette : backend `tsc --noEmit` OK, backend vitest **268/268** OK, `git diff --check` OK.

---

## 2026-06-14 — Runner OCR réel (OpenRouter, multimodal) — LIVRÉ SUR BRANCHE

Premier runner local réel de MasterFlow, sur branche `claude/ocr-runner-openrouter`
(`332b8a8`, poussée sur `origin`). **Non mergé sur `main`.** Notif de sync, pas une auto-validation.

**Ce qui est livré** (`apps/backend`) :
- `runners/ocr_runner.ts` — prend un job `ocr_prepare` (déjà autorisé/créé), charge la source
  privée via `storage://`, demande à un LLM multimodal d'extraire des candidats d'inventaire
  STRUCTURÉS, remonte en `needs_review` — **jamais `completed`**. Le runner ne crée aucun
  `inventory_item` : l'owner valide+ingère via `POST /inventory/ocr-candidates`. Aucun SQL direct.
- `runners/runner_loop.ts` — boucle générique (heartbeat avant claim, **1 job à la fois**, arrêt
  propre SIGINT/SIGTERM), doctrine PR-C8/C9/C10. Ne connaît rien d'OCR.
- `lib/storage.ts` — résolution `storage://` → image base64 (sources privées).
- `services/llm.ts` — ajout `completeVision()` (multimodal non streamé) : même routage fail-closed
  que le chat (`resolveLLMRoute` : profil de tâche validé + allowlist egress anti-SSRF), coût/usage
  inscrits dans `token_events`. En mock → renvoie `[]` (on n'invente jamais de contenu extrait).

**Anti-hallucination** : prompt strict (« uniquement ce qui est réellement visible »), parse
tolérant qui **REJETTE silencieusement** tout élément non conforme à `InventoryOcrCandidateSchema`,
cap `MAX_CANDIDATES=50`, `source_ref` complétée si absente. Erreurs caviardées (secrets) + tronquées.

**Recette** : `vitest` **275/275** ✓ (dont `tests/ocr_runner.test.ts` + `tests/storage.test.ts`).

**Gate humain avant merge / run live** (aucun effet réel tant qu'il n'est pas franchi — reste en
mock) :
1. un profil `ocr` `status='validated'` dans `task_model_profiles` ;
2. clé OpenRouter + `LLM_PROVIDER` / `LLM_MODEL` / `LLM_BASE_URL` / `LLM_EGRESS_ALLOWLIST` configurés
   en env serveur (secrets jamais dans Git ni dans un profil).

**Next** : extension « modèle par profil » (modèle propre à chaque `TaskModelProfile`, routage
multi-LLM selon rôle/besoin) — préparée sur branche séparée, changement `shared` additif.

---

## 2026-06-14 — INTÉGRATION main : fast-forward `codex/frontend-masterflow` (20 commits inventory + memory + room) — LIVRÉE + poussée

**GO MALEX (« traites mes tâches »).** La branche `codex/frontend-masterflow` était déjà
rebasée sur `main` (merge-base = `141ab68` = ancien HEAD main), 20 commits en avance, 0 en
retard. Fast-forward `main` `141ab68` → `6189f95`, poussé sur `origin/main`.

Apporte (travail MALEX/Codex signé Alex COULOT) :
- **Inventory** (verticale complète) : `services/inventory.ts` + `inventory_diagnostics.ts`,
  `routers/inventory.ts`, pont OCR→inventory, indexation RAG, collections, search/needs,
  queue jobs, `InventoryWorkspace` frontend (777 lignes) ;
- **Memory cards** (`services/memory_cards.ts`, `routers/memory.ts`) ;
- **Room checkpoints + room access** (`services/room_checkpoints.ts`, `room_access.ts`) ;
- **Runtime loadout** (`services/runtime_loadout.ts`) + **context compiler** (`context_compiler.ts`) ;
- hardening permissions/scoped access, sync hardening, filtres RAG transverses ;
- docs d'audit canon/contexte/inventory ;
- **tâches frontend MALEX déjà couvertes par ce merge** : panneau Projet (membres + ressources
  partagées + attach), `RegisterWithCode` (register invite-only), `AdminConsole` PoC.

### Vérifs (branche avant merge, puis main après merge)
| Verif | Résultat |
|---|---|
| `npm audit` | 0 vulnérabilité |
| Backend `tsc --noEmit` | 0 erreur |
| Backend vitest (branche) | 254/254 ✓ |
| Backend vitest (main après merge + test restauré) | **264/264** ✓ |
| Frontend `tsc --noEmit` | 0 erreur |
| Frontend `vite build` | ✓ (635 KB, warning chunk recharts attendu) |

### Bonus
Restauration + commit de `apps/backend/tests/action_registry.test.ts` (10 tests engine sur
`listRegistry`/`getRegistryEntry`/`riskLevelFor`/`isSensitive`) — fichier local non suivi,
couverture légitime qui passe.

### Gate
**Poussé sur `origin/main`** (GO MALEX 2026-06-14). Plus aucun retard `main` vs
`codex/frontend-masterflow`. Notif `done` pour Vincent dans `INBOX_VINCENT.md`.

---

## 2026-06-14 — PR-INVENTORY-UI-3 pilotage validation/besoins — LIVRE SUR BRANCHE

Couche frontend courte pour rendre Inventory plus pilotable sans nouveau contrat backend :

- validation candidats filtrable par origine `Tous / Manuels / OCR / Autres` ;
- chaque candidat affiche statut, origine, scope et presence/absence de collection ;
- besoins projet : historique de session des 5 dernieres evaluations, avec etat
  `candidate_available | missing | unknown`, completion declaree et nombre de matches ;
- libelles de couverture centralises pour eviter les divergences UI ;
- aucun stockage persistant de besoin, aucune disponibilite deduite, aucun RAG/OCR simule.

Recette : frontend TypeScript OK, frontend build OK, backend TypeScript OK, backend **254/254**,
`git diff --check` OK, smoke API besoin introuvable + inventaire declare complet ->
`missing`, `availability_guaranteed=false`, `matches=0`. Limite outil Browser inchangee :
la saisie locale reste bloquee par le presse-papiers virtuel du navigateur integre.

---

## 2026-06-14 — PR-INVENTORY-UI-2 besoins projet / completion — LIVRE SUR BRANCHE

Couche frontend courte, alignee canon Drive `INVENTORY_APP_RUNTIME`, `INVENTORY_ENGINE` et
`REFERENCE_INVENTORY_OCR_COLLECTION_GRAPH_CONTRACT` :

- expose le geste explicite `inventory_complete_declared` dans l'evaluation des besoins projet ;
- permet donc l'etat canon `missing` sans deduire une rupture ni promettre une disponibilite ;
- ajoute un deck de scope : scope actif, collections completes, sources tracees, regle RAG
  "valides seulement" ;
- affiche provenance/scope par item et completion declaree par collection.

Recette : frontend TypeScript OK, frontend build OK, backend TypeScript OK, backend **254/254**,
smoke API `ui_teacher` : besoin introuvable + inventaire declare complet -> `missing`,
`availability_guaranteed=false`, `matches=0`. Limite outil : la saisie Browser locale est bloquee
par le presse-papiers virtuel du navigateur integre ; l'app compile et le contrat API est valide.

---

## 2026-06-14 — PR-INVENTORY-UI-1 complément scope projet — LIVRE SUR BRANCHE

Verification locale du scope projet Inventory avec comptes reels de test :

- `ui_teacher` owner projet : creation candidat projet via UI, validation explicite ;
- `ui_student` participant : lecture seule, item valide visible, candidats/actions edition invisibles ;
- smoke API confirme : candidat cache au student avant validation, visible apres validation ;
- patch accessibilite : les champs des formulaires Inventory portent des labels accessibles stables
  pour tests navigateur et usages assistes.

Recette : Browser desktop, backend **254/254**, TypeScript back/front OK, frontend build OK.
Fixture uniquement en base locale de dev, aucun seed Git modifie.

---

## 2026-06-13 — PR-INVENTORY-UI-1 Surface runtime Inventory — LIVREE SUR BRANCHE

Premiere verticale frontend fonctionnelle sur les contrats Inventory existants, sans declarer
l'UI finale livree :

- mode visible uniquement s'il est present dans `user_runtime_loadout` ;
- scopes personnel prive et projet permissionne ;
- catalogue valide, recherche et indexation RAG explicite ;
- saisie manuelle en candidat, validation ou archivage humain ;
- collections candidates, validation et completion declarative ;
- besoins projet avec resultat `candidate_available|missing|unknown` et disponibilite jamais
  garantie ;
- aucun OCR simule, aucun stock deduit, aucune logique metier reconstruite dans React ;
- icones `lucide-react`, layout utilitaire responsive et sans debordement desktop/mobile.

Recette : parcours Browser reel
`candidate -> validation -> RAG -> recherche -> archive`, backend complet **254/254**,
backend/frontend TypeScript OK, frontend build OK. Verification visuelle **1280x720** et
**390x844**, aucun debordement Inventory.

Note d'integration : le test local a active `inventory` uniquement dans le `context_json` de la
base de developpement. Aucun seed ni permission n'est modifie : Vincent doit exposer le mode par
la Room/loadout cible, conformement a l'invariant « mode absent = mode inexistant ».

---

## 2026-06-13 — Queue Inventory backend — TERMINEE

Queue livree sur `codex/frontend-masterflow`, sans merge `main`, sans runner OCR/BGE reel et sans
UI finale.

Commits fonctionnels :

- `d181767` Inventory Core ;
- `c1e3486` OCR -> candidates ;
- `3504dfc` projection Inventory RAG ;
- `2368f83` Collection Graph ;
- `ecf54b2` Search / Project Needs ;
- `f97878d` bridge Room / Inventory Context ;
- `30df43f` diagnostics prives ;
- `c3cf55a` recette end-to-end.

Handoff : `HANDOFF_VINCENT_INVENTORY_QUEUE_2026-06-13.md`.

Etat final recette : backend **251/251**, backend/frontend TypeScript OK, frontend build OK,
`git diff --check` OK. Branche distante synchronisee ; `origin/main` est ancetre de la branche
au moment du handoff.

---

## 2026-06-13 — PR-INV-8 Inventory End-to-End Recipe — POUSSEE

Recette de non-regression assemblee sur les vrais services backend :

1. job OCR avec preflight/consentement ;
2. sortie runner en `needs_review` ;
3. ingestion comme candidat Inventory ;
4. invisibilite candidat pour membre et outsider ;
5. validation humaine puis indexation RAG explicite ;
6. recherche membre sans garantie de disponibilite ;
7. compilation room avec references Inventory + citation RAG ;
8. archive -> projection et context pack stale ;
9. retrait des recherches/contextes ;
10. verification des traces d'audit structurantes.

Recette : E2E **1/1**, backend complet **251/251**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-INV-7 Inventory Observability — POUSSEE

- `GET /diagnostics/inventory`, reserve `admin/godmode` ;
- compteurs globaux items, collections, matches, besoins et projections RAG ;
- etats de validation et repartition personnel/projet ;
- signaux : besoins ouverts, matches candidats, items projet valides non indexes, projections stale ;
- aucune donnee metier privee : ni label, ni owner, ni ID d'item/collection ;
- lecture seule, sans effet sur le runtime utilisateur.

Recette : diagnostics/gating **4/4**, backend complet **250/250**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-INV-6 Room / Inventory Context Bridge — POUSSEE

- activation Inventory uniquement par room, surface, mode ou purpose explicite ;
- chargement T2 de references `inventory_item` et `inventory_collection` validees ;
- scopes personnels et projet strictement separes ;
- candidats totalement absents de l'enveloppe et de sa trace ;
- references Inventory prioritaires dans le budget avant les ressources generiques ;
- context pack RAG enrichi avec `active_app`, `zoom_level`, `entity_refs` et sensibilite ;
- aucun payload prive injecte : le compilateur transmet des IDs autorises, pas les libelles.

Recette : context compiler **7/7**, backend complet **248/248**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-INV-5 Search / Project Needs — POUSSEE

- recherche permissionnee sur items `validated` uniquement ;
- besoin projet persistant, cree par editor+ ;
- resultat `candidate_available|missing|unknown` ;
- `availability_guaranteed` reste toujours `false` sans etat stock/reservation frais ;
- absence de match -> `unknown` par defaut ;
- `missing` seulement si l'inventaire est explicitement declare complet.

Recette : search/needs **7/7**, backend complet **246/246**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-INV-4 Collection Graph — POUSSEE

- validation explicite des collections ;
- matches item -> collection en `candidate`, puis confirmation/rejet humain ;
- confirmation rattache l'item sans modifier ownership ;
- completion `unknown|selective|complete_declared|abandoned` declaree, jamais deduite ;
- doublons retournes comme candidats consultatifs, sans fusion ni suppression ;
- lecture des collections/matches projet seulement apres validation et permission.

Recette : Inventory collections **11/11**, backend complet **244/244**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-INV-3 Inventory RAG — POUSSEE

Projection RAG explicite des items Inventory valides :

- `POST /inventory/items/:id/rag-index` ;
- candidat refuse, item `validated` obligatoire ;
- projection `resources` + `rag_resources` source `inventory_item` ;
- provenance `inventory://item/:id`, metadata item/collection/projet ;
- owner ou editor+ projet requis pour indexer ;
- archive Inventory -> projection RAG `archived`, chunks `stale`, context packs cites `stale` ;
- Inventory reste proprietaire de verite ; RAG reste derive.

Recette : Inventory/RAG **17/17**, backend complet **241/241**, backend/frontend TypeScript OK,
frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — Queue Inventory backend — LANCEE

**GO QUEUE humain MALEX recu.**

Ordre : Inventory RAG -> Collection Graph -> Search/Needs -> bridge Room/context ->
observabilite -> recette end-to-end -> handoff Vincent.

Garde-fous :

- Drive canon relu avant chaque couche ;
- aucun BGE/Qdrant reel, aucune UI finale, aucun merge `main` ;
- un commit/push par intention apres recette verte ;
- arret sur conflit distant, ambiguite canon ou fuite de permission.

Baseline : `HEAD = origin/codex/frontend-masterflow = c1e3486`, `origin/main = 141ab68`,
worktree propre au lancement.

---

## 2026-06-13 — PR-INV-2 OCR vers candidates Inventory — POUSSEE

**Livrable MALEX/Codex. GO humain MALEX recu pour commit/push.**

But : raccorder les sorties OCR existantes a Inventory sans lancer d'OCR reel et sans creer de
verite automatique.

Ajouts :

- contrat `IngestInventoryOcrCandidatesRequest` ;
- service/router `POST /inventory/ocr-candidates` ;
- ingestion seulement depuis job `ocr_prepare` en `needs_review` ou `completed` ;
- chaque entree devient un `inventory_item` en `candidate` avec `source_refs` vers le job OCR ;
- aucune validation automatique, aucun chunk RAG, aucun runner BGE.

Invariant : OCR candidate != Inventory validated != Resource Truth != RAG authoritative.

Recette avant commit : backend complet **239/239**, test Inventory cible **6/6**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-INV-1 Inventory Core — POUSSEE

**Livrable MALEX/Codex. GO humain MALEX recu pour commit/push.**

But : poser l'inventaire comme source de verite minimale avant OCR, RAG Inventory, UI et
MasterStory props.

Sources canon Drive relues :

- `03_APPS/INVENTORY_APP_RUNTIME.md`
- `04_ENGINES/INVENTORY_ENGINE.md`
- `02_CONTRACTS/REFERENCE_INVENTORY_OCR_COLLECTION_GRAPH_CONTRACT.md`
- `02_CONTRACTS/RESOURCE_TRUTH_LOCK_AND_CANONICAL_ROUTING_CONTRACT.md`

Ajouts :

- contrats shared `InventoryItem`, `InventoryCollection`, payloads create/list ;
- tables `inventory_items`, `inventory_collections`, `collection_matches`, `inventory_visibility` ;
- service et router `/inventory/*` ;
- cycle minimal candidat -> validation explicite -> archive ;
- permissions : inventaire personnel prive par defaut ; inventaire projet cree/valide par editor+ ;
  les membres projet ne voient que les items `validated` en visibility `project` ;
- invariant : aucune ressource RAG n'est creee automatiquement depuis un item Inventory.

Hors scope volontaire : OCR photo, matching avance, mouvements de stock, reservations, prix,
BGE/Qdrant, UI Inventory.

Recette avant commit : backend complet **238/238**, test Inventory cible **5/5**,
backend/frontend TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — PR-RAG-1 contrat transversal — POUSSEE

**Livrable MALEX/Codex. GO humain MALEX recu pour commit/push.**

But : stabiliser le RAG comme couche derivee commune avant Inventory, Rooms, MasterStory et
BGE/Qdrant.

Ajouts en cours :

- `MATRICE_CANON_GITHUB_NEXT_MOVES_2026-06-13.md` : matrice Drive canon -> GitHub -> gap -> PR ;
- correction du statut `CTX_RUNTIME_IMPLEMENTATION_HANDOFF_2026-06-13.md` : CTX est bien pousse
  sur `codex/frontend-masterflow` et attend revue Vincent ;
- contrat RAG additif : filtres transversaux (`active_app`, `zoom_level`, `entity_refs`,
  `allowed_statuses`, `spoiler_policy`, `context_token_budget`, `sensitivity`) portes par les
  context packs ;
- refusal `unsafe_query` pour requetes de type prompt-injection ;
- invariant conserve : meme si la requete demande des statuts candidats, le retrieval ne lit que
  les ressources validees et verifiees.

Recette avant commit : backend complet **233/233**, RAG cible **14/14**, backend/frontend
TypeScript OK, frontend build OK, `git diff --check` OK.

---

## 2026-06-13 — Audit cloture canon/GitHub + sync CTX poussee

**Livrable MALEX/Codex.** Correction du diagnostic de sync apres audit GitHub complet et
relecture des audits canon Drive embarques.

Fichier a lire :

`AUDIT_CLOTURE_CANON_GITHUB_SYNC_2026-06-13.md`

Constat : Vincent avait bien integre une grosse tranche backend sur `main` : admin/invitations,
roles sensibles, token usage, settings, Project/Scope multi-utilisateur, Template/Guided Runtime,
RAG shell, jobs/runners, workflow observability, correction/OCR/calibration/feedback/export et
securite Vite. La confusion venait d'une lecture du delta recent au lieu d'une synthese globale
de l'historique GitHub.

MALEX/Codex a pousse la pile CTX sur `codex/frontend-masterflow` :

`875a7908e17359b31b14f57ddcde27efdada2b25`

Contenu : context compiler, user runtime loadout, room checkpoints, memory cards, RAG enrichi,
injection WS bornee, surfaces frontend contexte et protocole sync `gh`.

Validation avant push : backend **231/231**, backend/frontend TypeScript OK, build frontend OK
(warning chunk Vite historique), `git diff --check` OK.

Suite : revue Vincent de `875a790`, comparaison avec ses modules, puis integration courte. Ne pas
attaquer l'UI finale avant stabilisation du contexte/runtime.

---

## 2026-06-13 — PR-HARD-1 à 7 — IMPLÉMENTÉES LOCALEMENT, RECETTE VERTE

**Livrable MALEX/Codex, non commit/push en attente du GO humain.**

Les raccords P0/P1 de `AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md` ont été traités par
couches bornées, après contrôle inbox et comparaison au canon Drive :

- **HARD-1 Auth** : identité effective relue en BDD pour REST/WS, révocation, compte actif,
  rôle courant et `auth_version`; changement de rôle = invalidation immédiate des anciens JWT.
- **HARD-2 Rooms** : `project_id` additif, resolver owner/public/membre projet, masquage des
  Rooms privées et ownership exact de `room_instance` au handshake WS.
- **HARD-3 Actions** : owner/scope persistés, lecture/preflight/exécution bornés, inbox filtrée,
  registre non `live` refusé et absence d'exécuteur = `not_implemented`, jamais faux succès.
- **HARD-4 Resource Truth** : seules les ressources `validated` sont partageables/lisibles
  dans un projet; le RAG projet exige validation et `resource_scope`.
- **HARD-5 Guided Runtime** : snapshots immuables guide/schéma/consentement, preview owner
  explicite, validation guide, types/options/schéma vérifiés et route participants privée.
- **HARD-6 Jobs** : séparation lecture/gestion; owner, admin projet ou override global tracé
  peuvent cancel/retry; un editor lecteur ne le peut pas.
- **HARD-7 Ownership projet** : owner unique, promotion directe interdite, transfert atomique
  via l'action sensible `transfer_project_ownership` validée admin.

Références canon appliquées :

- `01_CORE/PERMISSION_RUNTIME_GUARDRAILS.md`
- `01_CORE/PERMISSION_AND_ACCESS_GOVERNANCE_SYSTEM.md`
- `01_CORE/MASTERFLOW_RUNTIME_CONTEXT_ISOLATION.md`
- `02_CONTRACTS/RUNTIME_ACCESS_CONTROL_AND_SYSTEM_PERMISSION_MATRIX.md`
- `02_CONTRACTS/PERSONA_PERMISSION_FIREWALL_AND_ROLE_SCOPE_CONTRACT.md`
- `02_CONTRACTS/RESOURCE_TRUTH_LOCK_AND_CANONICAL_ROUTING_CONTRACT.md`
- `02_CONTRACTS/ACTION_PREFLIGHT_DECISION_LOG_AND_VALIDATION_INBOX_CONTRACT.md`

Recette :

- backend TypeScript : OK;
- backend Vitest : **213/213**, 46 fichiers;
- frontend TypeScript : OK;
- frontend build Vite : OK, warning historique chunk > 500 kB;
- `git diff --check` : OK.

Étape suivante après revue/push : **PR-CTX-1 context compiler**, sans brancher BGE/Qdrant à
la sémantique des Rooms avant stabilisation du contrat.

---

## 2026-06-13 — Audit post-push canon / raccords transversaux — PRÊT

**Livrable MALEX/Codex.**

`AUDIT_POST_PUSH_CANON_GAPS_2026-06-13.md`

Les derniers pushes rendent désormais Project/Scope, jobs/runners, RAG, Guided Runtime,
correction et admin partiellement exécutables. L'audit complet du 12 juin doit donc être
actualisé.

Écarts P0 trouvés : rôle JWT non rafraîchi après rétrogradation, révocation absente du handshake
WS, Rooms/instances non isolées, actions non bornées par owner/scope/statut live et Resource
Truth contournable via les ressources projet.

Écarts P1 : version Guided Runtime non figée, validation JSON Schema/consentement incomplète,
lecture de job confondue avec cancel/retry, ownership projet ambigu et inscription invitation
non transactionnelle.

Dernier delta distant `141ab68` lu : l'observabilité workflow est maintenant raccordée au
lifecycle jobs. Cela ne ferme pas les écarts ci-dessus. Son mapping Templates stocke bien
`guide_version`, mais surestime le freeze effectif : le runtime relit encore le guide courant.

Ordre conseillé : hardening auth/WS, Rooms, actions, Resource Truth, Guided Runtime, jobs et
ownership, puis reprise du `context_compiler`.

---

## 2026-06-13 — Audit déploiement du contexte / Rooms / loadout / mémoire — PRÊT

**Livrable MALEX/Codex.** Audit ciblé du canon Drive contre le runtime Git :

`AUDIT_DEPLOIEMENT_CONTEXTE_ROOMS_LOADOUT_MEMORY_2026-06-13.md`

Conclusion : le Git sait stocker un `room_instance`, mais ne possède pas encore le
`context_compiler` qui résout permissions, loadout, projet, checkpoint, ressources, tier et
provenance en un paquet borné pour l'UI et les personas.

Ordre recommandé : contrats et compilateur T1/T2, loadout resolver, checkpoints, raccord RAG,
injection WebSocket, transitions/bridges, mémoire compressée et payloads, teamspaces/surfaces,
UI de contexte puis observabilité. La passe canon couvre aussi maturité projet, activation
progressive des Rooms et isolation inter-projets. BGE/Qdrant peut avancer en parallèle comme
runner générique, sans devenir propriétaire de la sémantique du contexte.

---

## 2026-06-13 — Audit RAG transversal canon / Inventory / Rooms / MasterStory — PRÊT

**Livrable MALEX/Codex.** Audit ciblé du canon Drive contre le Git :

`AUDIT_RAG_TRANSVERSAL_CANON_INVENTORY_ROOMS_MASTERSTORY_2026-06-13.md`

Conclusion : le RAG doit devenir la couche dérivée de chargement contextuel pour les ressources,
l'inventaire, les Rooms et MasterStory, sans remplacer Resource Truth, ownership, validation
Inventory, checkpoints Room ou canon narratif.

Écart principal : le Git possède le shell RAG, les jobs OCR, Project/Scope, `room_instances` et
les seeds UI, mais pas encore le vrai Inventory Core, les checkpoints Room ni le graphe
MasterStory. L'ordre recommandé commence par le contrat RAG transversal, puis Inventory Core,
OCR candidat, Inventory RAG, Rooms, MasterStory, UI et enfin BGE/Qdrant.

---

## 2026-06-13 — Audit PR-4..9 + actions bornées traitées (agent_ouighour)

`SYNC_PROOF` : `local_head = origin/main = e03b53b`, delta `0 0`. Constat : les 6 couches
PR-4→PR-9 sont **déjà implémentées** par MALEX/Codex (tables + services + routes + tests, 81 tests
au total). Les items inbox étaient des directives d'intégration pour Vincent, pas des TODO.

### Livrés ce tour (signé agent_ouighour)

- **`AUDIT_GAP_RAG_BGE_VS_PR7.md`** (PR-7, lecture seule) : écarts handoff BGE ↔ contrats PR-7.
  Champs manquants signalés : `sensitivity`, statut chunk `quarantined`, entonnoir
  `candidate_limit→result_limit`, `context_token_budget`, détection injection prompt (au-delà du
  seul `SECRET_PATTERN`). Plan de raccord BGE/Qdrant borné : runner interne `:8091` jamais public,
  branché sur `requestRagReindex` (embeddings) et `queryRag` (score), `revoke` supprime les points
  Qdrant, score lexical conservé en fallback. **0 code.**
- **`MAPPING_CANON_PROJECT_SCOPE_TEMPLATES.md`** (PR-4/PR-5, lecture seule) : table objet canon →
  obligations `project_id` + `template_id+version`. PR-6 (`guided_sessions`) cité comme modèle à
  reproduire (freeze `guide_version + target_schema_id + target_schema_version`). Proposition
  `classe = project + membres`, mini-contrat `TemplateFrozenRef` factorisé. **0 code.**
- **PR-9 observabilité active** (code borné, `services/jobs.ts`) : `recordWorkflowEvent` câblé sur
  4 transitions du lifecycle jobs — `claimNextJob`→`workflow_started`,
  `markJobNeedsReview`→`validation_requested`, `completeJob`→`workflow_completed`,
  `failJob`→`workflow_failed` (blocker = erreur). Helper `emitJobWorkflowEvent` best-effort :
  l'observabilité ne peut pas casser le cycle job ; aucun payload privé inscrit ; `job_events` et
  `audit` inchangés ; 1 job = 1 workflow (`workflow_id = job.id`, `capability_id = workflow_type =
  job.type`, `project_id` dérivé du scope). Nouveau test `jobs_workflow_observability.test.ts`.

### Vérifs

| Verif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Backend vitest | **207/207** (44 fichiers) |
| `git diff --check` | OK |

### Reste `open`

PR-6 (directive intégration MOTH/CDC future, non exécutée). Décisions MALEX attendues :
champ `sensitivity` (impact contrat `shared`), `classe = project`, `TemplateFrozenRef` factorisé,
route `GET /rag/stats` gated admin. **Gate** : aucun câblage BGE réel, migration, endpoint public
ou changement de périmètre avant validation humaine MALEX.

— agent_ouighour

---

## 2026-06-13 — RAG coordination : gate vérifié + décision raccord BGE/Qdrant

Réponse de **agent_ouighour** à l'item inbox « RAG de coordination livré ». Lecture seule,
aucun code modifié. `local_head = origin/main = c7c2426`, delta `0 0`.

### Vérification du gate `POST /api/v1/rag/coordination/sync`

- Montage correct : `index.ts:75` routeur RAG à la racine `/api/v1`, chemin complet
  `/api/v1/rag/coordination/sync`.
- `requireUser` au niveau routeur → 401 sans token ; `assertAdmin` dans le handler
  (`syncCoordinationRagResources`) → 403 pour teacher/student, OK admin/godmode.
- Test `rag_router.test.ts` : student → 403, admin → 200.
- Pas de piège gate-ordering : le gate admin est dans le handler, pas en `router.use` sans path
  (contrairement au bug corrigé sur `diagnostics`/`admin`). Aucune fuite vers les routeurs traversants.

### Décision

Raccord embeddings réels **BGE-M3 + Qdrant** sur le shell RAG existant via **PR-7** : travail
séparé, gated admin/godmode. Le scoring lexical reste fallback ; BGE remplace le `embedding_ref`
NULL et le score, sans modifier les permissions, Resource Truth ou le cycle preflight/validation.
L'auto-sync post-pull est différée — priorité au runner embeddings cité.

— agent_ouighour

---

## 2026-06-13 — RAG de coordination Git/inbox — LIVRÉ

**Livrable MALEX/Codex.** Première exploitation concrète du RAG permissionné pour accélérer la
synchronisation MALEX/Vincent sans remplacer le protocole Git.

Ajouts :

- route admin/godmode `POST /api/v1/rag/coordination/sync` ;
- synchronisation des fichiers `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`,
  `INBOX_MALEX.md` et `INBOX_VINCENT.md` en ressources RAG `validated/canonical` ;
- scope `owner` par acteur admin/godmode, pour éviter toute exposition aux comptes non autorisés ;
- chunks reconstruits depuis les sections Markdown, citations conservées par `RagContextPack` ;
- surface frontend `Memoire coordination` pour synchroniser puis interroger l'historique avec citations ;
- aucun contournement du protocole : le RAG aide à retrouver les passages, le Git reste source de vérité.

À brancher plus tard côté Vincent si utile :

- automatisation post-commit / post-pull de cette sync ;
- raccord au runner BGE/Qdrant via `rag_reindex` ;
- éventuel scope projet privé partagé MALEX/Vincent si plusieurs comptes doivent interroger la même mémoire.

Verification prévue : lint frontend, build frontend, tests backend, lint backend, `git diff --check`.

---

## 2026-06-13 — Frontend : surface projets multi-utilisateur — LIVRÉE

**Livrable MALEX/Codex.** Première consommation frontend de la couche Project/Scope multi-utilisateur livrée par Vincent.

Ajouts :

- client API pour `GET /projects`, `GET /projects/:id/members`,
  `GET /projects/:id/resources` et `POST /projects/:id/resources` ;
- panneau `Projet` dans le mode Project ;
- lecture des projets accessibles à l'utilisateur connecté ;
- lecture des membres et ressources partagées du projet ;
- rattachement d'une ressource validée à un projet quand le backend l'autorise ;
- aucun changement backend, aucune création de projet/membre, aucune action sensible ajoutée.

Verification :

- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `npm test` : 42 fichiers / 190 tests ;
- `npm run lint` ;
- `git diff --check`.

---

## 2026-06-13 — Multi-utilisateur RÉEL : partage de ressources par projet + fix gate-ordering — LIVRÉE

**GO Vincent (« rendre l'application multi-utilisateur »).** Construit SUR la fondation Project/Scope de Codex
(pas reconstruit) : l'accès vient de l'appartenance au projet, plus de `owner = teacher`.

### Livré
- **`packages/shared`** : `AttachProjectResourceRequestSchema {resource_id, access_level}` (additif).
- **`services/projects.ts`** : `listProjectResources(actor, projectId)` — lisible par **tout membre** (join
  `resources` ↔ `resource_scopes`). Réutilise `attachResourceScope`/`decideScopedPermission` existants.
- **`routers/projects.ts`** : `GET /projects/:id/resources` (membres) + `POST /projects/:id/resources`
  (owner/admin projet ; le service `attachResourceScope` existait mais **n'avait aucune route** — comblé).
- **🐛 FIX gate-ordering (régression latente exposée par le merge)** : `diagnostics` et `admin` faisaient
  `router.use(requireRole('admin'))` **sans path**. Montés à la racine `/api/v1` AVANT les routeurs de Codex
  (`projects`/`jobs`/`schema_templates`/`guided_runtime`/`rag`), ce gate bloquait **toute** requête non-admin
  traversante → un teacher recevait `403 forbidden` sur `POST /projects`. Corrigé en scopant les gates à
  `/diagnostics` et `/admin`. **Tous les routeurs verticaux de Codex étaient impactés** côté serveur réel.

### Tests `vitest` **200/200** ✓ (+5 : `project_resources_sharing` ×3, `router_gating_integration` ×2 —
ce dernier monte diagnostics+admin+projects dans l'ordre de `index.ts`, ce que les tests isolés ne faisaient pas) ·
`tsc` back+front ✓ · `vite build` ✓.
Smoke runtime ✓ : teacher crée projet+ressource, ajoute un élève membre, rattache la ressource → **l'élève (autre
utilisateur) voit la ressource partagée** ; non-membre 404 ; membre non-admin attach 403 ; gates admin toujours 403
pour student.

### Invariants / périmètre
- Accès par membership + scope explicite (`PERMISSION > PREFERENCE` respecté). Audit `resource.scope_attached`.
- Rien de cassé : les surfaces admin (token-usage, /admin/*) restent gated admin/godmode.
- Frontend (UI projets) = territoire MALEX, non touché ici.

---

## 2026-06-13 — Protocole anti-desynchronisation Git/inbox + validation graduée — LIVRÉ

Objectif : éviter qu'un agent rate des commits déjà poussés en lisant une branche locale ou une
inbox obsolète, tout en gardant un système d'échange moins verrouillé et plus prudent.

Ajouts :

- ajout de `PROTOCOLE_SYNC_GIT_INBOX.md` ;
- référence obligatoire depuis `CLAUDE.md`, `SYNC_THREAD_MALEX_VINCENT.md`,
  `INBOX_MALEX.md` et `INBOX_VINCENT.md` ;
- rituel `git fetch --all --prune` + comparaison `HEAD...origin/main` avant lecture ;
- bloc `SYNC_PROOF` attendu pour toute réponse de coordination ;
- règle explicite : si un message semble absent, citer le commit lu avant toute conclusion.
- clarification de `POLITIQUE_VALIDATION_GRADUEE.md` : moins de double validation, plus de
  proportionnalite entre risque, effet, scope et gate ;
- separation nette entre lecture/proposition fluide et execution/publication sous validation.

Verification :

- `npm ci --cache /private/tmp/masterflow-npm-cache` : 0 vulnérabilité ;
- `npm test` : 42 fichiers / 190 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — INTÉGRATION : merge `codex/frontend-masterflow` → `main` (fondations PR-1→9 + PR-3 admin) — LIVRÉE

**GO Vincent (« intègre tout sur main »).** Plutôt que reconstruire Project/Scope (déjà codé par Codex), on
fusionne sa branche fondations dans `main`. Le merge porte les deux mondes : mon **PR-3 admin `API_manage`**
(invitations, `set_user_role`, monitoring, register invite-only, vite 8/0-vuln) + les **fondations PR-1→9** de
Codex (projects/scopes/ownership, jobs/runners, schema templates, guided runtime, RAG shell, workflow
observability, dépréciation non destructive de Corrector).

### Conflits résolus (6, tous additifs — les deux côtés conservés)
- `apps/backend/src/db/schema.ts` : tables `invitations` **et** `projects`/`project_members`/`ownership_edges`/
  `resource_scopes`/`rag_*`/… coexistent ; types `InvitationRow` + tous les Row de Codex.
- `apps/backend/src/db/seed.ts` : `seedDemoUsage` (token_events démo) **et** `SCHEMA_TEMPLATE_SEEDS` ; signature
  `seedAll` étendue (`schemaTemplates`).
- `apps/backend/src/index.ts` : montage de tous les routeurs (admin + jobs/projects/schema_templates/
  guided_runtime/rag).
- `SUIVI.md` / `INBOX_MALEX.md` / `SYNC_THREAD_MALEX_VINCENT.md` : journaux unionés (entrées des deux côtés).
- `packages/shared/src/index.ts` : auto-mergé proprement (contrats additifs des deux côtés).

### Vérifs (arbre intégré)
`vitest` **185/185** ✓ (40 fichiers : 55 Claude + 130 Codex) · `tsc --noEmit` back ✓ · `tsc` front ✓ ·
`vite build` ✓ (rolldown) · `npm audit` **0 vuln**.

### Invariants / périmètre
- Rien de nouveau n'est « live » en UI (les fondations PR-1→7 restent specs ; PR-8/9 backend gated admin/godmode).
- `corrector-001` reste en base `status=deprecated` (non destructif). `POST /register` reste invite-only.
- Prochain chantier réel ouvert : **Project/Scope réel** (memberships/scopes explicites) — à construire sur ces
  fondations, pas re-créé.

---

## 2026-06-13 — Coordination : réponse à la clôture fondations PR-1→9 de Codex (axe + consigne rebase)

**Contexte.** Codex/Malex a livré sur `origin/codex/frontend-masterflow` (non mergée) un chantier « Fondations
PR-1→9 » (≠ ma numérotation PR-1/2/3). PR-1→7 = packs/specs ; PR-8 `jobs_shell` + PR-9 `workflow_observability` =
backend livré. Branché après ma PR-1 → divergence `main` +6 / codex +59.

**Décisions (Vincent : « oui à tout, traite ce que Codex demande sans empiéter sur le récent ») :**
- Réponse écrite dans `SYNC_THREAD_MALEX_VINCENT.md` + pointeur `INBOX_MALEX.md`.
- **Axe retenu = ③ Project/Scope réel** (reco Codex).
- **PR-C0 (Corrector déprécié, non destructif) accepté** : `corrector-001` reste en base `status=deprecated` ;
  vérifié qu'aucune feature backend récente n'en dépend.
- **Consigne d'intégration (protège PR-2/3 + vite) :** Codex doit **rebaser sa branche sur `main` (`be04d77`)**
  avant tout merge ; conflits additifs attendus sur 6 fichiers (schema/seed/index/shared + SUIVI/INBOX_MALEX) ;
  l'observabilité workflow est dans un routeur séparé → pas de conflit avec `diagnostics.ts` (token-usage).

**Non fait volontairement :** pas de merge des 59 commits sur `main` (chantier hors MVP : jobs/runners/OCR/RAG/
project-scope ; Codex lui-même : « les fondations ne sont pas une invitation à brancher large »). Le chantier
Project/Scope reste à démarrer (pas lancé sur une décision de fin de session fatiguée).

---

## 2026-06-13 — Durcissement sécu : vite 6→8 + esbuild 0.28.1 → `npm audit` 0 vuln — LIVRÉE + poussée (MALEX ok)

**GO Malex + Vincent reçu.** Résout les 3 high dev-only laissées par PR-3 (advisories `esbuild` GHSA-gv7w-rqvm-qjhr
+ GHSA-g7r4-m6w7-qqqr, via la chaîne `vite`).

### Livré
- **`apps/frontend/package.json`** : `vite` `^6.0.0 → ^8.0.16`, `@vitejs/plugin-react` `^4.3.0 → ^6.0.2`
  (peer vite ^8). Le `vite@6.4.3` du front (seule copie vulnérable) dédupe désormais sur `vite@8.0.16` —
  comme vitest qui était déjà sur 8.
- **`npm audit fix`** (non-`--force`) : `esbuild 0.28.0 → 0.28.1` (correctif), partagé tsx + vite. **0 vuln.**
- Node 22.22.3 satisfait l'exigence vite 8 (`^20.19 || >=22.12`). `vite.config.ts` inchangé (n'utilise que
  `server.{port,host,allowedHosts,proxy}` + `react()` — stables 6→8).

### Vérifs
`npm audit` **0 vuln** · `vitest` 55/55 ✓ · `tsc` front ✓ · `vite build` ✓ (rolldown, 305 ms ; bundle 598 KB,
warning chunk recharts attendu) · **dev server vite 8 boote** (config OK, sert HTTP 200, `allowedHosts` accepté).

### Gate
Intégrée sur `main` + poussée sur `origin/main`. Aucun changement fonctionnel runtime (outil de build uniquement).

---

## 2026-06-13 — PR-3 : admin API_manage (invitations + comptes/rôles) + monitoring usage/coût (API_corrector) — LIVRÉE + intégrée sur `main`

**GO Vincent reçu 2026-06-13 : push `main` autorisé.** Merge fast-forward `main` `1bac470` → `cf5cfcb`, poussé sur
`origin/main`. **Décision humaine Vincent : avancer sans le GO téléphonique de Malex.** Choix tranchés avec Vincent :
(1) changement de rôle = **action sensible** (validator godmode) ; (2) inscription **sur invitation uniquement**
(register ouvert fermé) ; (3) dataviz = **Recharts**.

### Livré
- **Backend — invitations (codes d'accès)** : table `invitations` (`db/schema.ts`), engine `engines/invitations.ts`
  (create/list/revoke/redeem, code base32 CSPRNG, garde-fou **rôle ≤ rang du créateur**), router
  `routers/admin.ts` (`GET /admin/users`, `GET|POST /admin/invitations`, `POST /admin/invitations/:code/revoke`,
  gated `requireRole('admin')`).
- **Backend — inscription sur invitation** : `POST /register` exige désormais un `invite_code` valide (sinon 403),
  le rôle du compte = celui porté par le code (plus de 'student' codé en dur). ⚠️ **changement de comportement.**
- **Backend — changement de rôle = action sensible** `set_user_role` (registre `high`, `validator_role: godmode`),
  engine `engines/users_admin.ts` (`executeSetUserRole` + `listAdminUsers`), dispatcher recomposé dans
  `engines/executors.ts` (`{set_global_setting, set_user_role}` ; `action_engine` importe d'ici). Garde-fous :
  assert godmode à l'exécution, interdit de changer son propre rôle, interdit de rétrograder le dernier godmode.
- **Backend — registre** : entrées `set_user_role` / `view_users` / `create_invitation` (status `live`).
- **Backend — seed démo usage** : `token_events` de démonstration (~41, tâches chat/correction/ocr/bareme,
  coût via `llm_pricing`) si table vide et `MASTERFLOW_SEED_DEMO_USAGE !== '0'` ; **jamais en test**.
- **Contrat `packages/shared`** (additif) : `InvitationSchema`, `CreateInvitationSchema`, `AdminUserSchema`,
  `SetUserRoleSchema`.
- **Frontend PoC** (territoire MALEX) : `recharts` ajouté ; `admin-console.tsx` (invitations / comptes+rôles avec
  flux d'action sensible déroulé à l'écran / monitoring Recharts : coût&tokens par jour, par modèle, par tâche,
  par utilisateur) ; `register-form.tsx` (inscription sur code) ; `api.ts` (+5 fonctions) ; intégration minimale
  `App.tsx` (`canAdmin`, montage gated `≥ admin`).

### Tests `vitest` 55/55 ✓ (37 → +18 : `invitations.test.ts`, `users_admin.test.ts`) · `tsc --noEmit` backend ✓ ·
`tsc --noEmit` frontend ✓ · `vite build` ✓ (607 modules — recharts).
Smoke runtime (DB jetable) ✓ : login godmode, GET users, création/redemption de code, register 403 sans code /
201 au rôle du code / 400 si épuisé, cycle `set_user_role` create→preflight(pending,godmode)→validate→execute
(teacher→admin), gating student→403, dataviz peuplée.

### Invariants tenus
- Aucune action sensible sans validation humaine (`set_user_role` : `pending_validation` obligatoire, execute refuse
  ≠ approved, validator godmode + assert à l'exécution).
- Permissions jamais inférées ; codes capés au rang du créateur (admin ≠ code godmode).
- Trace `audit_logs` : invitation_created/revoked, auth.register (+ code/rôle), changement de rôle.
- Contrat additif rétro-compatible ; secrets hors BDD (inchangé).

### ⚠️ Points d'attention
- ~~`npm audit` : 3 high (chaîne dev `esbuild`/`vite`)~~ **→ RÉSOLU** (entrée 2026-06-13 vite 6→8 + esbuild 0.28.1, 0 vuln).
- Bundle front ~598 KB (recharts) > 500 KB : warning de chunk attendu pour un PoC.

### Gate
**Intégrée sur `main` + poussée sur `origin/main`** (GO Vincent 2026-06-13). MALEX prévenu via `INBOX_MALEX.md`
(notif `done` — pas une auto-validation ; à lui de revoir/reprendre le PoC frontend, son territoire).

---

## 2026-06-13 — PR-2 : écriture global_settings via action sensible — LIVRÉE + intégrée sur `main`

**GO Vincent reçu 2026-06-13.** Merge fast-forward `main` `1b08b38` → `7b32573`.

### Livré (`claude/pr2-settings-action`, commits `92741ae` + `7b32573`)
- **`packages/shared/src/index.ts`** : `validator_role?: Role` additif dans `ActionRegistryEntrySchema`
  (rétro-compatible ; entrées existantes inchangées) + `SetGlobalSettingSchema {app, key, value}`.
- **`seeds/action_registry_seed.v1.json`** : entrée `set_global_setting` (medium_high, preflight+validation,
  `validator_role: admin`, `ui_surface: admin_settings_cockpit`, `status: live`).
- **`engines/permission_runtime.ts`** : `validatorRoleFor` lit `entry.validator_role ?? 'teacher'` — généralise
  sans casser l'existant (`approve_validation_item` reste `teacher`).
- **`engines/settings.ts`** (nouveau) : allowlist `ADMIN_CONTROLLED_KEYS` (`llm::provider/model/base_url/temperature`,
  `app::maintenance_mode/max_tokens_per_request`), exécuteur `executeSetGlobalSetting` (assert `role ≥ admin` en
  défense en profondeur, validation payload, vérif allowlist, UPSERT `global_settings`, retour diff
  `{previous, new}`), map `ACTION_EXECUTORS`.
- **`engines/action_engine.ts`** : dispatcher `ACTION_EXECUTORS` par `registry_id` (défaut = mock MVP conservé) +
  try/catch → `status: failed` + audit `execute_refused` si l'exécuteur lève.
- **`tests/settings_action.test.ts`** (nouveau) : 6 cas couverts.

### Tests `vitest` 37/37 ✓ · `tsc --noEmit` ✓ · `vite build` ✓ (32 modules)

### Invariants tenus
- Aucune action sensible sans validation humaine explicite (`pending_validation` obligatoire ; `execute` refuse ≠ `approved`).
- Écriture settings = action sensible, gate double : validation admin + assert admin à l'exécution.
- Secrets jamais en BDD ; `global_settings` = config non-secrète uniquement.
- Contrat additif rétro-compatible.
## 2026-06-13 — Bridge Project/Scope des deltas professeur

**Livrable MALEX/Codex.** Fermeture du dernier scope pedagogique encore porte uniquement par une
reference texte.

Ajouts :

- `project_id` nullable dans `TeacherDecisionDelta` ;
- colonne et index projet idempotents sur `teacher_decision_deltas` ;
- delta projet reserve au professeur auteur, membre `editor+` du projet ;
- `context_refs[0] === project_id` pour rendre le contexte canonique non ambigu ;
- admin/godmode limites a la supervision : aucune signature a la place du professeur ;
- fallback legacy sans `project_id` conserve pour les deltas historiques ;
- aucun enrichissement, score ou changement de methode applique automatiquement.

Verification :

- `npm test` : 37 fichiers / 161 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope du handoff OCR

**Livrable MALEX/Codex.** Rattachement des intentions `ocr_prepare` aux vrais projets, avec
separation explicite entre copies pedagogiques et references morphologiques personnelles.

Ajouts :

- `project_id` nullable dans `OcrPrepareRequest` ;
- `project_scope === project_id` pour les nouvelles intentions OCR projet ;
- OCR copie projet limite aux teachers membres `editor+` ;
- manifest de pre-correction existant, valide, du meme projet et du meme owner ;
- `validation_ref` du job obligatoirement identique a celle du manifest ;
- jobs de copie projet visibles aux editeurs du projet ;
- OCR morphologique projet reserve a l'utilisateur owner avec consentement et membership ;
- job morphologique invisible aux autres membres du projet, y compris teachers editeurs ;
- fallback legacy sans `project_id` conserve ;
- aucun upload, OCR reel, extraction, promotion canon ou runner ajoute.

Verification :

- `npm test` : 37 fichiers / 160 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope calibration et revue qualite

**Livrable MALEX/Codex.** Rattachement du diagnostic de cohorte au vrai projet, sans ajouter
d'application automatique du delta.

Ajouts :

- `project_id` nullable dans `CohortCalibrationReview` ;
- colonne et index projet idempotents sur `cohort_calibration_reviews` ;
- batch, profil institutionnel et runs sources obligatoirement alignes sur le meme projet ;
- `project_scope === project_id` pour les nouveaux diagnostics projet ;
- creation et lecture accessibles aux membres `editor+` du projet ;
- items de controle qualite heritent du projet par leur review, sans duplication de scope ;
- fallback legacy sans `project_id` conserve avec les permissions historiques ;
- tests de diagnostic cree par un editeur, lecture owner/editor, mismatch et immutabilite des
  scores ;
- aucun delta applique, aucune note finale, aucun profilage durable et aucune validation
  automatique.

Verification :

- `npm test` : 37 fichiers / 158 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope des feedbacks et exports

**Livrable MALEX/Codex.** Troisieme tranche de migration progressive vers les vrais projets,
jusqu'au handoff `export_prepare`.

Ajouts :

- `project_id` nullable dans `FeedbackDraft`, `CorrectionExportPreview` et
  `ExportPrepareRequest` ;
- colonnes et index projet idempotents sur feedbacks et previews ;
- feedback projet aligne sur son run et ses preuves ;
- preview projet alignee sur son batch, ses feedbacks approuves et ses runs sources ;
- preparation et lecture des brouillons limitees aux membres `editor+` ;
- un teacher editeur peut preparer feedback, preview et job export pour l'owner du projet ;
- validation pedagogique du feedback et approbation de la preview toujours reservees a l'owner ;
- admin/godmode restent en supervision lecture et ne valident pas a la place du professeur ;
- job `export_prepare` projet lisible par les editeurs du projet, invisible aux non-membres ;
- fallback legacy sans `project_id` conserve en owner-only ;
- aucune publication, livraison externe, note finale ou rendu automatique ajoute.

Verification :

- `npm test` : 37 fichiers / 157 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Bridge Project/Scope de la chaine de correction

**Livrable MALEX/Codex.** Deuxieme migration progressive des scopes libres vers un vrai
`project_id`, cette fois sur les objets de reference et de preparation de correction.

Ajouts :

- `project_id` nullable dans les contrats rubriques, profils institutionnels, batches,
  submissions, manifests, runs de pre-correction et requetes `correction_prepare` ;
- colonnes et index projet idempotents sur toute cette chaine ;
- nouveaux runs projet : `project_scope` doit egaler `project_id` ;
- manifest, batch, submission, rubrique, profil et preuves doivent tous viser ce meme projet ;
- ecriture et lecture d'un run projet exige membership `editor+` ;
- preuves multi-auteurs autorisees seulement lorsqu'elles appartiennent toutes au meme projet ;
- un editeur projet peut preparer et relire le job `correction_prepare` du projet ;
- anciens objets sans `project_id` conserves avec les gates owner-only historiques ;
- aucune note finale, validation automatique, publication ou export ajoute.

Cette passe ne migre pas encore les feedbacks et previews/exports. Ils restent owner/scope legacy
jusqu'a une tranche dediee avec leurs propres tests de confidentialite et validation.

Verification :

- `npm test` : 37 fichiers / 155 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Consolidation Project/Scope vers Evidence et signaux

**Livrable MALEX/Codex.** Premier remplacement progressif des `project_scope` libres par un
`project_id` reel, sans casser les donnees et tests legacy.

Ajouts :

- `project_id` nullable dans `EvidenceEvent` et `PedagogicalSignal` ;
- colonnes/migrations idempotentes `project_id` sur `evidence_events` et
  `pedagogical_signals` ;
- index projet dedies ;
- nouveaux objets projet : `project_scope` doit egaler `project_id` pendant la transition ;
- ecriture preuve/signal projet exige membership `editor+` ;
- lecture projet exige membership reel et peut agreger les preuves des owners membres ;
- un signal projet peut citer plusieurs owners uniquement si toutes les preuves appartiennent
  au meme `project_id` ;
- objets legacy sans `project_id` conserves en mode teacher owner-only ;
- tests membership, lecture projet, multi-owner et mismatch scope/id.

Cette tranche ne migre pas encore les rubriques, batches, correction, feedback ou exports. Elle
pose le pattern de migration retrocompatible qui pourra etre applique progressivement.

Verification :

- `npm test` : 37 fichiers / 153 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-7 RAG permissionne

**Livrable MALEX/Codex.** Shell RAG scope, cite, revoke-aware et branche sur Resource Truth et
Jobs, sans pretendre livrer BGE/Qdrant.

Ajouts :

- contrats partages `RagResource`, `RagResourceChunk`, `RagContextPack`, `RagCitation`,
  `RagQueryRequest/Response`, statuts et raisons de refus ;
- tables `rag_resources`, `rag_resource_chunks`, `rag_context_packs`, `rag_query_events` ;
- routes auth `POST /rag/query`, `GET/POST /rag/resources`,
  `POST /rag/resources/:id/reindex`, `POST /rag/resources/:id/revoke`,
  `GET /rag/context-packs/:id` ;
- chaque manifeste RAG reference une ressource Resource Truth existante et herite de son statut ;
- permission scope/owner avant retrieval et avant scoring ;
- retrieval lexical borne pour valider le contrat sans moteur vectoriel fictif ;
- seules les ressources `validated` et fiables alimentent les context packs ;
- citations obligatoires avec source, statut, trust, scope, score et extrait court ;
- query sans source fiable = refus explicite, sans reponse brodee ;
- query stockee uniquement sous forme de hash ;
- detection de secrets avant creation des chunks ;
- revoke admin/godmode, chunks revoques et context packs existants marques `stale` ;
- reindex raccorde au shell jobs par un job `rag_reindex`, chunks marques `stale` en attente ;
- tests service + router.

Le moteur local BGE-M3/reranker/Qdrant reste a raccorder par Vincent derriere le job
`rag_reindex`. Le contrat de permission, provenance, citation et revocation est deja en place.

Verification :

- `npm test` : 37 fichiers / 152 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-6 Guided Runtime prive

**Livrable MALEX/Codex.** Premier runtime guide prive, testable sans LLM, branche sur
Project/Scope et Template Registry.

Ajouts :

- contrats partages `ConversationGuide`, `GuidedSession`, `GuidedSessionParticipant`,
  `GuidedContribution`, `GuidedProgress`, `GuidedQuestion`, `GuidedContradiction` ;
- tables `conversation_guides`, `guided_sessions`, `guided_session_participants`,
  `guided_contributions` ;
- routes auth `GET/POST /guides`, `GET/PATCH /guides/:id`,
  `POST /guided-sessions`, `GET /guided-sessions/:id`,
  `POST /guided-sessions/:id/answers`, `/advance`, `/complete` ;
- guides draft crees par teacher+, owner-prives et rattachables a un `project_id` ;
- sessions privees qui figent `guide_version`, `target_schema_id` et `target_schema_version` ;
- progression deterministe depuis les champs requis du template ;
- contradictions conservees et visibles, sans ecrasement silencieux ;
- participants de session distincts des lecteurs du guide brut ;
- `complete` marque uniquement la session privee comme terminee, sans publication, email,
  devis, inscription, export ou asset ;
- audit creation/update guide, creation session, participant, answer, advance et complete ;
- tests service + router.

Cette couche rend possible MOTH/CDC en atelier prive. Elle ne livre pas encore de lien public,
bot externe, inscription Ours d'Or, devis, badge, email, analytics nominatives ou UI finale.

Verification :

- `npm test` : 35 fichiers / 142 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-5 Template / Schema Registry

**Livrable MALEX/Codex.** Registre backend minimal des templates versionnes, candidats ou
valides, sans moteur conversationnel ni marketplace.

Ajouts :

- contrats partages `SchemaTemplate`, `CreateSchemaTemplateRequest`, domaines et statuts ;
- table `schema_templates` ;
- seeds candidats non canoniques :
  `cdc-template-candidate-v1`, `quote-intake-candidate-v1`,
  `event-registration-candidate-v1`, `asset-manifest-candidate-v1` ;
- service interne `listSchemaTemplates`, `getSchemaTemplate`, `createSchemaTemplate`,
  `validateSchemaTemplate` ;
- routes auth `GET /schema-templates`, `GET /schema-templates/:id`,
  `POST /schema-templates`, `POST /schema-templates/:id/validate` ;
- creation limitee teacher+ en statut `candidate` ;
- validation limitee admin/godmode ;
- templates owner-prives masques aux autres owners ;
- templates `deprecated` et `archived` masques par defaut ;
- validation basique : schema objet, `properties` non vide, `required_fields` coherents ;
- doublon `domain/name/version/owner` refuse pour forcer une nouvelle version explicite ;
- audit `schema_template.created` et `schema_template.validated` ;
- tests service + router.

Cette couche ne livre pas MOTH/CDC, devis, event ou asset pipeline : elle donne seulement le
support versionne que ces verticales devront figer en session ou en objet consommateur.

Verification :

- `npm test` : 33 fichiers / 133 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — PR-4 Project/Scope reel

**Livrable MALEX/Codex.** Socle projets prives, memberships et premiers scopes ressources.

Ajouts :

- contrats partages `Project`, `ProjectMember`, `OwnershipEdge`, `ResourceScope` et
  `ScopedPermissionDecision` ;
- tables `projects`, `project_members`, `ownership_edges`, `resource_scopes` ;
- service interne `createProject`, `listProjects`, `getProject`, `addProjectMember`,
  `listProjectMembers`, `attachResourceScope` et `decideScopedPermission` ;
- routes auth `GET/POST /projects`, `GET /projects/:id`,
  `GET/POST /projects/:id/members` ;
- anti-enumeration : un non-membre recoit `project_not_found` ;
- creation projet limitee teacher+ ;
- memberships projet `viewer/participant/editor/admin/owner` ;
- audit `project.created`, `project.member_upserted`, `resource.scope_attached` ;
- tests service + router.

Cette couche remplace le scope texte libre pour les prochains raccords : ressources, jobs,
correction, MOTH/CDC et UI doivent se brancher sur un `project_id` reel quand la verticale
travaille dans un contexte projet.

Verification :

- `npm test` : 31 fichiers / 122 tests ;
- `npm run lint` ;
- `npm run lint:frontend` ;
- `npm run build:frontend` ;
- `git diff --check`.

---

## 2026-06-13 — Clôture fondations PR-1 à PR-9

**Livrable MALEX/Codex.** Rapport de clôture du plan fondations post-audit.

Ajout :

- `FONDATIONS_PR1_PR9_CLOSURE_REPORT.md`.

Clarification importante :

- PR-1 à PR-7 sont cadrées par packs/specs/recettes et doivent rester non deceptive tant que
  leurs runtimes réels ne sont pas livrés ;
- PR-8 est backend-livrée et renforcée côté jobs/runners ;
- PR-9 est backend-livrée côté workflow observability ;
- les runners réels Vincent doivent maintenant se brancher par les gates PR-8/PR-C7→PR-C11 ;
- toute prochaine verticale doit choisir explicitement entre Project/Scope réel, runner réel ou
  Guided Runtime privé.

Cette clôture évite de continuer à empiler des couches runner et remet le projet sur un choix
produit clair avant UI finale.

---

## 2026-06-13 — PR-9 workflow observability

**Livrable MALEX/Codex.** Observabilité workflow admin/godmode, sans payload brut ni action
runtime.

Ajouts :

- `SPEC_WORKFLOW_OBSERVABILITY.md` passé en implemented ;
- contrat partagé `WorkflowEvent` ;
- table `workflow_events` ;
- service interne `recordWorkflowEvent` ;
- `getWorkflowDiagnostics` avec agrégats ;
- `getWorkflowTrace` par workflow ;
- routes `GET /diagnostics/workflows` et `GET /diagnostics/workflows/:id` ;
- filtres période, capability et workflow type ;
- métriques : workflows, events, completion rate, failed, blocked, validations, p50/p95,
  coût nullable, tokens nullable, friction blockers ;
- gate admin/godmode via router diagnostics existant ;
- tests service + router.

Cette passe termine le plan fondations PR-1→PR-9 côté socle. Elle observe les workflows ; elle
ne lance aucun runner, ne publie rien, ne corrige rien et n'expose pas de contenu personnel brut.

---

## 2026-06-13 — PR-C11 gates famille/type runner

**Livrable MALEX/Codex.** Cohérence stricte entre `runner_family` et types de jobs claimés.

Ajouts :

- `SPEC_PR_C11_RUNNER_FAMILY_GATES.md` ;
- mapping interne `job_type -> runner_family` ;
- `claimNextJob` refuse une famille incompatible ;
- `claimNextJob` refuse les claims multi-types mélangeant plusieurs familles ;
- erreur `runner_family_not_allowed` ;
- tests mis à jour pour exiger `runner_family = asset` sur `asset_prepare` ;
- test refusant un runner `ocr_multimodal` qui tente de claim `asset_prepare`.

Mapping actif : OCR = `ocr_multimodal`, correction = `correction`, export = `export`, asset =
`asset`, RAG = `rag`, resource revoke = `resource`. Cette couche évite qu'un runner spécialisé
absorbe un job qui n'est pas de sa famille technique.

---

## 2026-06-13 — PR-C10 gates de claim runner

**Livrable MALEX/Codex.** Le heartbeat runner devient obligatoire avant claim.

Ajouts :

- `SPEC_PR_C10_RUNNER_CLAIM_GATES.md` ;
- `claimNextJob` refuse les runners inconnus ;
- `claimNextJob` refuse `draining` et `offline` ;
- `claimNextJob` refuse les heartbeats stale ;
- `claimNextJob` refuse les types de jobs non déclarés par le runner ;
- les tests PR-C8 exigent maintenant un heartbeat online avant claim ;
- test dédié inconnu/draining/stale/mauvais type.

Cette couche empêche un runner OCR de prendre un export, un runner en arrêt propre de reprendre
du travail, ou un processus inconnu de consommer la queue. Aucun droit utilisateur n'est déduit
du runner : il s'agit seulement d'un gate technique d'exécution.

---

## 2026-06-13 — PR-C9 heartbeats internes des runners

**Livrable MALEX/Codex.** Observabilité interne des runners avant activation réelle, sans route
publique.

Ajouts :

- `SPEC_PR_C9_RUNNER_HEARTBEATS.md` ;
- contrat `RunnerHeartbeat` partagé ;
- table `runner_heartbeats` ;
- `recordRunnerHeartbeat(input)` ;
- `getRunnerHeartbeat(runner_id)` ;
- `listRunnerHeartbeats()` ;
- `listClaimableRunnerHeartbeats(job_type, now?, stale_ms?)` ;
- statuts `online`, `draining`, `offline` ;
- filtrage des runners claimables par fraîcheur, statut et type de job ;
- audit sobre sans host secret ni contenu métier ;
- tests upsert, filtrage, secrets, colonnes et audit.

Vincent doit faire battre ses runners avant claim : `online` pour prendre du travail, `draining`
pour arrêter proprement sans nouveau job, `offline` pour maintenance. Les heartbeats ne créent
aucun droit utilisateur et n'activent aucune route publique.

---

## 2026-06-13 — PR-C8 claim et lease internes des runners

**Livrable MALEX/Codex.** Attribution sûre des jobs aux runners, sans broker externe, route
publique ou polling SQL direct.

Ajouts :

- `SPEC_PR_C8_RUNNER_CLAIM_AND_LEASE.md` ;
- colonnes nullable `runner_id`, `claimed_at`, `lease_expires_at` sur `jobs` ;
- migration idempotente par `ALTER TABLE` si colonnes absentes ;
- `claimNextJob(runner_id, types, lease_ms?)` ;
- `extendJobLease(job_id, runner_id, lease_ms?)` ;
- reprise d'un job `running` seulement si son lease est expiré ;
- vérification optionnelle du `runner_id` sur progress/review/complete/fail ;
- nettoyage du lease sur cancel, retry et finalisation ;
- aucun nouvel event type pour rester compatible avec les contraintes SQLite existantes ;
- tests claim, concurrence, expiration, extension, finalisation et mauvais runner.

Vincent doit faire consommer ses runners par `claimNextJob`, prolonger le lease pendant les
traitements longs, puis finaliser avec le même `runner_id`. Aucun runner ne doit scanner ou
modifier `jobs` directement.

---

## 2026-06-13 — PR-C7 lifecycle interne des runners jobs

**Livrable MALEX/Codex.** Transitions runner-only pour terminer proprement les jobs, sans route
publique ni écriture directe table.

Ajouts :

- `SPEC_PR_C7_RUNNER_JOB_LIFECYCLE.md` ;
- `markJobNeedsReview(job_id, result, review_reason)` ;
- `completeJob(job_id, result)` ;
- `failJob(job_id, error, detail?)` ;
- statut finalisable limité à `queued/running` ;
- progression finale forcée à `100` sur review/completion ;
- events `job_needs_review`, `job_completed`, `job_failed` ;
- audit sobre sans contenu privé ;
- refus des payloads/resultats/détails contenant des libellés de secrets ;
- tests runner lifecycle : review, complete, fail/retry, cancel et secrets.

Vincent peut brancher ses runners sans écrire directement `jobs`/`job_events`. Pour OCR,
correction et export sensibles, la sortie attendue reste `needs_review`, jamais une note finale
ou une publication.

---

## 2026-06-13 — PR-C6 handoffs jobs correction/export

**Livrable MALEX/Codex.** Sas interne entre objets validés et futurs runners correction/export,
sans runner, sans route publique et sans publication.

Ajouts :

- `SPEC_PR_C6_CORRECTION_EXPORT_JOB_HANDOFFS.md` ;
- contrats `CorrectionPrepareRequest` et `ExportPrepareRequest` ;
- service `createCorrectionPrepareJob` depuis manifest pré-correction validé ;
- service `createExportPrepareJob` depuis preview `approved_for_export` ;
- création owner-only professeur, admin/godmode en supervision lecture seulement ;
- alignement obligatoire owner/scope/batch/validation/workflow ;
- jobs `correction_prepare` et `export_prepare` créés en `queued` ;
- payloads réduits aux refs utiles, sans contenu privé ni `storage://private` pour export ;
- tests de refus manifest draft, preview non approuvée, validation incohérente et owner mismatch.

Cette couche donne à Vincent le point d'ancrage propre pour ses runners : ils doivent consommer
ces jobs uniquement, avancer en progression monotone, puis sortir en `needs_review`. La correction
ne crée toujours aucune note finale ; l'export ne publie toujours rien.

---

## 2026-06-13 — PR-C5 feedback student-safe et previews d'export

**Livrable MALEX/Codex.** Cycle interne supervisé du feedback pédagogique à la preview privée,
sans rendu final ni publication.

Ajouts :

- `SPEC_PR_C5_FEEDBACK_AND_EXPORT_PREVIEWS.md` ;
- contrats stricts `FeedbackDraft` et `CorrectionExportPreview` ;
- tables `feedback_drafts` et `correction_export_previews` ;
- feedback structuré : force, problème, preuves, impact, axe, action et critère de progression ;
- provenance par version de méthode et profil modèle `feedback_draft` validé optionnel ;
- validation pédagogique réservée à l'owner professeur ;
- formats preview `CSV`, `XLSX`, `PDF` et `report` ;
- sources limitées aux feedbacks approuvés et aux runs exacts du batch ;
- validation d'export distincte, réservée à l'owner ;
- `publication_allowed = false` imposé par contrat et BDD ;
- supervision admin/godmode en lecture et audits sans contenu privé.

`approved_for_export` n'engendre aucun job, fichier final, lien de livraison ou publication.
Vincent doit comparer les champs aux feedbacks et exports de ses phases P1–P4 et signaler les
formats ou contrôles qualité réellement manquants avant raccord renderer.

---

## 2026-06-13 — PR-C4 calibration et contrôle qualité

**Livrable MALEX/Codex.** Diagnostic interne de cohorte et échantillon de relecture, sans
modification des scores.

Ajouts :

- `SPEC_PR_C4_CALIBRATION_AND_QUALITY_REVIEW.md` ;
- contrats stricts `CohortCalibrationReview` et `QualityReviewItem` ;
- tables `cohort_calibration_reviews` et `quality_review_items` ;
- méthode versionnée `cohort-quality-review-v1` ;
- statistiques brutes sur l'échelle du profil institutionnel ;
- position sous/dans/au-dessus de la bande attendue ;
- aucun delta si moins de trois copies ;
- delta diagnostic borné vers le bord de bande, jamais appliqué ;
- détection des franchissements de seuils protégés ;
- échantillonnage des extrêmes, frontières, écarts statistiques et faibles confiances ;
- permission teacher owner, supervision admin/godmode et audit agrégé.

Aucune moyenne n'est forcée. Aucun score PR-C3 n'est modifié et aucune note finale, validation,
étiquette étudiante, route publique ou UI n'est ajoutée. Vincent doit comparer l'échantillonnage
et les métriques à ses contrôles qualité historiques avant tout raccord runner.

---

## 2026-06-13 — PR-C3 pré-correction explicable

**Livrable MALEX/Codex.** Fondation interne du scoring brouillon par critère, sans runner ni
note finale.

Ajouts :

- `SPEC_PR_C3_PRE_CORRECTION_EXPLICABLE.md` ;
- contrats `PreCorrectionRunDraft` et `CriterionScoreDraft` stricts ;
- tables `pre_correction_runs` et `criterion_score_drafts` ;
- dépôt interne `recordPreCorrectionDraft` sans route publique ;
- alignement obligatoire manifest/batch/copie/rubrique/profil/owner/scope ;
- manifest et rubrique validés avant écriture ;
- couverture exacte des critères de la rubrique ;
- preuves utilisables et confiance bornée pour chaque proposition ;
- éventuel profil modèle validé pour `criterion_analysis` ;
- sortie forcée en `needs_review`, scores forcés en `candidate` ;
- audit sans contenu pédagogique sensible.

Aucun total, `final_score`, calibration, feedback, validation professeur, export ou règle de
sujet codée en dur n'est livré. Vincent doit comparer ce contrat à son `scoring_trace` réel et
signaler les métadonnées de provenance manquantes avant tout raccord runner.

---

## 2026-06-13 — PR-C2 ingestion OCR et jobs shell

**Livrable MALEX/Codex.** Fondation observable pour les traitements OCR longs, sans runner réel.

Ajouts :

- `SPEC_PR_C2_OCR_INGESTION_AND_JOBS_SHELL.md` ;
- contrats `Job`, `JobEvent`, statuts/types et `OcrPrepareRequest` ;
- tables `jobs` et `job_events` avec index owner/scope ;
- création interne `ocr_prepare` pour copie ou référence morphologique ;
- manifest obligatoire pour copie, consentement obligatoire pour morphologie ;
- références `storage://` seulement et détection de payload secret ;
- isolation owner, supervision admin/godmode ;
- progression monotone, cancel/retry et historique ;
- routes de suivi sans route générique de création ;
- tests service et HTTP.

Aucun upload, worker, watcher, OCR, score ou canon n'est livré. Le job `queued` représente une
intention vérifiée en attente d'un runner. Vincent doit raccorder son OCR derrière ce service et
terminer les extractions en `needs_review`.

---

## 2026-06-13 — PR-C1 objets de référence correction

**Livrable MALEX/Codex.** Fondation versionnée de la correction, sans exécution.

Ajouts :

- `SPEC_PR_C1_RUBRICS_GRADING_BATCHES_MANIFESTS.md` ;
- `RubricTemplate` et `RubricVersion` avec cohérence poids/points ;
- `InstitutionalGradingProfile` avec bandes bornées et validation professeur ;
- `CorrectionBatch` ;
- `SubmissionRecord` privé relié à une preuve ;
- `PreCorrectionManifest` exigeant une validation pour tout état utilisable ;
- six tables SQLite, index et tests.

La zone 13–14 reste un repère institutionnel de cohérence et ne force aucune moyenne. Aucun
score, feedback, export, route ou runner n'est ajouté. PR-C2 devra consommer ces références pour
les jobs d'ingestion et ne jamais reprendre les heuristiques historiques en dur.

Vincent doit comparer ses correction sheets et manifests P1–P4 aux contrats et répondre avec les
champs manquants réellement nécessaires.

---

## 2026-06-13 — Décision : socle OCR Vincent absorbé et adapter morphologique déclaré

**Décision MALEX.** Le protocole OCR multimodal de Vincent est conservé comme apport transversal.

Architecture :

```text
runner ocr_multimodal commun
-> adapters métier indépendants
-> contrats, privacy, permissions et sorties séparés
```

Ajouts :

- `DECISION_ABSORPTION_OCR_COMMUN_ET_ADAPTER_MORPHOLOGIQUE.md` ;
- champ `runner_family` dans le registre ;
- contrat de sortie et gates explicites par adapter ;
- adapter `morphological-reference-v1` raccordé au canon Drive ;
- classification `sensitive_private`, consentement et validation utilisateur obligatoires ;
- tests prouvant que copies et morphologie partagent le runner sans partager leur contrat.

Aucun OCR n'est activé. Vincent doit auditer et découpler son runner existant avant branchement.
Le futur adapter morphologique produira des hints stylisés privés, jamais une identification,
une biométrie ou un canon automatique.

---

## 2026-06-13 — PR-C0 Corrector déprécié sans destruction

**Livrable MALEX/Codex.** Application runtime de la décision d'absorption de Corrector.

Ajouts :

- statut partagé de persona borné à `active | deprecated` ;
- migration seed de `corrector-001` vers `deprecated`, y compris sur base existante ;
- permissions historiques explicitement non autoritaires ;
- listes et contexte limités aux personas actifs ;
- activation et nouveaux blends Corrector refusés ;
- détail et blends historiques toujours relisibles ;
- tests moteur et HTTP de non-régression.

Cette migration ne retire aucune capacité de correction. OCR, scoring, calibration, feedback,
contrôle qualité et exports doivent être absorbés dans leurs engines et contrats canoniques.
Corrector cesse seulement d'être un persona métier souverain.

Vincent doit maintenant préparer PR-C1 à partir de ses features existantes : rubriques, profils
institutionnels, batches, submissions et manifests, sans recréer un persona Corrector.

---

## 2026-06-13 — PR-CB2 routage LLM par tâche et egress gated

**Livrable MALEX/Codex.** Le runner LLM ne route plus un provider externe sur la seule base de
variables globales.

Ajouts :

- contrat partagé `LLMTaskSchema` ;
- résolution d'un profil `task_model_profiles` validé et unique ;
- vérification du provider autorisé et du fallback déclaré ;
- blocage des configurations incomplètes ;
- allowlist d'origines réseau `LLM_EGRESS_ALLOWLIST` ;
- HTTPS obligatoire hors loopback, credentials/query/fragment interdits dans l'URL ;
- respect de `privacy_mode=local_only` ;
- branchement du gate avant tout `fetch` du runner ;
- tests du mock, du profil validé, des refus provider/tâche et de l'anti-SSRF.

Le mode mock reste sans réseau. Cette tranche ne prétend pas livrer un fallback multi-provider :
une seule configuration serveur est active. Budgets coût/latence, timeout/retry, administration
et validation sensible des profils restent à construire.

Vincent doit challenger le gate contre ses implémentations `API_corrector` / `vibe`, sans ajouter
de secret en BDD ni rendre un fallback fictivement disponible.

---

## 2026-06-13 — PR-CB1 adapter registry read-only

**Livrable MALEX/Codex.** Ajout d'un registre statique et versionné pour les entrées pédagogiques
OCR, WooClap, transcription et note professeur.

Ajouts :

- `SPEC_ADAPTER_REGISTRY_PR_CB1.md` ;
- contrat partagé `AdapterRegistryEntrySchema` ;
- seed `adapter_registry_seed.v1.json` ;
- moteur de lecture filtré par rôle ;
- gate défensif refusant tout adapter sans statut `live`, executor et UI `actionable` ;
- tests des statuts, de la visibilité professeur/étudiant et de la non-exécution.

Les adapters OCR, WooClap et transcription restent `shell/locked`. La note professeur est
`partial/readonly` : le socle EvidenceEvent existe, mais aucune route ni surface de saisie n'est
livrée. Aucune donnée pédagogique, aucun secret et aucun runner ne sont ajoutés.

Vincent doit comparer ces déclarations à ses runners existants et signaler les écarts, sans
activation avant Project/Scope, Jobs, stockage, permission/preflight, tests et recette.

---

## 2026-06-13 — Pont canon x features Vincent et terrain PR-CB0

**Livrable MALEX/Codex.** Le canon pedagogique a ete recroise avec les fonctions deja construites
dans `API_corrector`, `API_manage`, `vibe`, le pipeline Corrector local et les anciennes sources.

Constat : les owners existaient deja dans MasterFlow. Les fonctions Vincent apportent surtout
des implementations terrain et des adapters. Il ne faut creer aucun engine parallele.

Ajouts :

- `BRIDGE_CANON_FEATURES_VINCENT_CORRECTION_PEDAGOGIE.md` ;
- `SPEC_PEDAGOGICAL_EVIDENCE_SIGNAL_AND_TEACHER_DELTA.md` ;
- insertion de `PR-CB0` dans le plan de fondations.
- premiere implementation additive PR-CB0 dans `packages/shared` :
  `EvidenceEvent`, `PedagogicalSignal`, `TeacherDecisionDelta`, `TaskModelProfile` ;
- tests de garde des preuves, confiances, deltas IA/humain et profils de tache.
- migrations SQLite idempotentes des quatre objets, avec privacy privee par defaut, statuts
  fermes, confiances bornees et separation obligatoire proposition IA / decision humaine ;
- indexes scope/statut/date et tests de persistance, sans route publique.
- depot interne permissionne : teacher limite a ses propres preuves/deltas, signaux obligatoirement
  relies a des preuves accessibles, profils de modele reserves admin et forces en `draft` ;
- audits `evidence.captured`, `signal.observed`, `teacher_delta.recorded` et
  `model_profile.proposed`, sans payload pedagogique sensible dans les logs.

Le terrain partage prepare :

- evidence events normalises ;
- signaux pedagogiques prudents ;
- deltas entre proposition IA et decision professeur ;
- profils de routing modele par tache ;
- boucle d'amelioration sujet/rubrique/methode sous validation humaine.

Cette fondation est reutilisable par correction, cours, WooClap, suivi, MOTH/CDC, Ours d'Or,
devis et integration LMS. Elle reste `future` tant que routes, permissions, tests et recettes ne
sont pas livres.

---

## 2026-06-13 — Decision Corrector : absorption fonctionnelle, persona deprecie

**Decision MALEX.** Ajout de
`DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`.

Corrector n'est pas supprime fonctionnellement : les fonctions utiles des projets Vincent
doivent etre auditees puis absorbees dans le moteur de correction, les jobs, les rubriques,
les controles qualite, les feedbacks et les exports.

Cette absorption rend le systeme plus puissant : les capacites de correction deviennent
transversales et utilisables par tout persona, cours, sujet, classe ou integration autorisee.
Les composants OCR, scoring brouillon, calibration, feedback, controle qualite et export peuvent
evoluer independamment, et chaque amelioration profite a toutes les surfaces MasterFlow.

La modelisation de `corrector-001` comme persona primaire autonome est en revanche rejetee :
elle confond voix, methode, moteur, permissions et souverainete pedagogique. Migration demandee :
deprecation non destructive, retrait des nouveaux parcours, eventuel profil de methode, puis
adaptateur pour les references historiques.

La `moyenne_cible` est clarifiee comme referentiel institutionnel de MALEX :

- moins de 10 = minimum non atteint ;
- 13-14 = niveau normalement attendu ;
- notes superieures = niveaux forts ou exceptionnels.

Le lissage automatique doit devenir une calibration explicable :
`raw_score -> institutional_grading_profile -> cohort diagnostic -> teacher validation ->
final_score`. La plage 13-14 reste une zone de coherence, jamais une moyenne forcee.

Vincent doit repondre avec un audit de ses features Corrector et proposer PR-C0/PR-C1 avant toute
implementation large.

---

## 2026-06-13 — Correction protocole Vincent : features propres + canon embarque

**Correction MALEX.** Vincent ne doit pas checker directement le Drive canon par defaut.

Le canon utile doit etre embarque dans Git par MALEX/Codex. Vincent doit surtout checker ses
propres features/projets/branches/PRs/workflows pour trouver les bonnes opportunites
d'implementation et ne rien oublier.

Ajout de `PROTOCOLE_VINCENT_FEATURE_OPPORTUNITY_CHECK.md` et correction de `INBOX_VINCENT.md` /
`SYNC_THREAD_MALEX_VINCENT.md`.

Objectif : ne rien perdre du canon et ne rien perdre des features deja construites cote Vincent.

---

## 2026-06-13 — Regle de travail : check canon Drive avant spec Git

**Decision MALEX.** Avant de traiter une idee comme nouvelle, Codex doit verifier le
Drive canon MasterFlow. Si le sujet existe deja, le Git doit absorber et relier le canon, pas
reinventer une version parallele.

Ajout dans `CLAUDE.md` d'une procedure obligatoire :

- recherche `rg` dans le Drive canon ;
- lecture des fichiers sources ;
- references canon citees dans les specs/handoffs ;
- distinction `deja canonique` / `partiellement implemente` / `absent backend` ;
- aucune spec Git hors-sol.

Constat du check : le modele persona principal + personas contextuels + sous-personas conditionnels
est bien canonique. MasterStory est aussi richement canonique, mais cote Git il reste surtout au
stade capability candidate / audit absent, pas moteur backend livre.

---

## 2026-06-13 — Precision multi-personas type RPG pedagogique

**Decision MALEX.** La decision persona/bots est precisee : l'utilisateur garde son persona
principal, puis une activite peut ajouter des personas contextuels bornes, par exemple persona du
prof, methode, jury, expert, MOTH pour check CDC ou Incubator pour Ours d'Or.

Regle : 1 a 3 personas contextuels maximum par defaut, orchestration des tours de parole, voix
identifiees, aucune elevation de droits par persona. Objectif : croiser methodes, graphs
pedagogiques et ressources sans creer une conversation confuse.

---

## 2026-06-13 — Persona utilisateur par defaut vs bots contextuels + pack PR-8 jobs

**Decision MALEX.** Ajout de `DECISION_PERSONA_USER_ET_BOTS_CONTEXTUELS.md` et mise a jour de
la spec Guided Runtime : MOTH n'est pas le persona par defaut de tous les utilisateurs. Chaque
user peut avoir son persona personnel ; MOTH et les autres bots sont des guides contextuels
assignes a une activite, classe, projet, event ou tunnel.

**Livrable MALEX/Codex.** Ajout du paquet operationnel pour `jobs_shell` :

- `HANDOFF_VINCENT_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `CHECKLIST_PR8_JOBS_QUEUES_RUNNERS.md` ;
- `RECETTE_PR8_JOBS_QUEUES_RUNNERS.md`.

Objectif : encadrer les operations longues via jobs owner/scope, progress, cancel/retry, audit et
gates, sans runner brut appele depuis l'UI.

---

## 2026-06-13 — Pack PR-7 RAG permissionne

**Livrable MALEX/Codex.** Ajout du paquet operationnel pour `rag_capability_shell` :

- `HANDOFF_VINCENT_PR7_RAG_PERMISSIONNE.md` ;
- `CHECKLIST_PR7_RAG_PERMISSIONNE.md` ;
- `RECETTE_PR7_RAG_PERMISSIONNE_DETAILLEE.md`.

Objectif : poser un RAG permissionne, cite et revoke-aware, qui aide MasterFlow a retrouver des
sources sans devenir une autorite ni fuiter des ressources hors scope.

---

## 2026-06-13 — Pack PR-6 Guided Runtime prive

**Livrable MALEX/Codex.** Ajout du paquet operationnel pour `guided_runtime_pr1` :

- `HANDOFF_VINCENT_PR6_GUIDED_RUNTIME.md` ;
- `CHECKLIST_PR6_GUIDED_RUNTIME.md` ;
- `RECETTE_PR6_GUIDED_RUNTIME_DEPENDENCIES.md`.

Objectif : cadrer MOTH/CDC comme runtime prive testable, dependant de scopes et templates
versionnes, sans lien public, email, devis, badge, event ou effet externe implicite.

---

## 2026-06-13 — Pack PR-4/PR-5 Project Scope + Template Registry

**Livrable MALEX/Codex.** Ajout du handoff et des checklists pour les deux fondations suivantes :

- `HANDOFF_VINCENT_PR4_PR5_SCOPE_TEMPLATES.md` ;
- `CHECKLIST_PR4_PROJECT_SCOPE_OWNERSHIP.md` ;
- `CHECKLIST_PR5_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_PROJECT_SCOPE_TEMPLATES.md`.

Objectif : donner a Vincent un chantier court et testable pour poser ownership/scope puis
templates versionnes, avant MOTH/CDC, Ours d'Or, devis, event, DA/assets ou RAG avance.

---

## 2026-06-13 — Pack PR-2/PR-3 Capability Registry + Status Taxonomy

**Livrable MALEX/Codex.** Ajout du handoff et des checklists pour les PRs suivant
`autonomy_step1_shell` :

- `HANDOFF_VINCENT_PR2_PR3_CAPABILITY_STATUS.md` ;
- `CHECKLIST_PR2_CAPABILITY_REGISTRY.md` ;
- `CHECKLIST_PR3_STATUS_TAXONOMY.md` ;
- `RECETTE_CAPABILITY_STATUS.md`.

Objectif : preparer le registry et les statuts pour empecher les features fantomes, les statuts
canon pris pour du runtime et les UI actionnables sans endpoint reel.

---

## 2026-06-13 — Big chantier Vincent : revue PRs + checklist autonomie

**Livrable MALEX/Codex.** Ajout du pack operationnel pour Vincent :

- `HANDOFF_VINCENT_BIG_CHANTIER_FONDATIONS_2026-06-13.md` ;
- `PROTOCOLE_REVUE_PRS_VINCENT.md` ;
- `CHECKLIST_PR1_AUTONOMY_STEP1.md`.

Objectif : permettre a Vincent de se reveiller avec un chantier backend complet, priorise et
verifiable, en commencant par `autonomy_step1_shell`.

---

## 2026-06-13 — Matrice features vs fondations

**Livrable MALEX/Codex.** Ajout de `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`.

La matrice relie les verticales produit aux fondations techniques :

- autonomie step 1 ;
- capability registry ;
- MOTH/CDC ;
- Ours d'Or ;
- devis ;
- DA/assets ;
- correction ;
- cours/classe ;
- RAG ;
- jobs ;
- observabilite ;
- MasterStory ;
- HelpLab ;
- marketplace et connecteurs repousses.

Objectif : prioriser les features selon leurs dependances reelles, pas selon leur attrait immediat.

---

## 2026-06-13 — Pack specs fondations post-audit

**Livrable MALEX/Codex.** Deroulement de la chaine de specs et recettes priorisees apres audit :

- `RECETTE_AUTONOMY_STEP1_SHELL.md` ;
- `SPEC_CAPABILITY_REGISTRY.md` ;
- `SPEC_STATUS_TAXONOMY.md` ;
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md` ;
- `SPEC_TEMPLATE_SCHEMA_REGISTRY.md` ;
- `RECETTE_RAG_PERMISSIONNE.md` ;
- `SPEC_JOBS_QUEUES_RUNNERS.md` ;
- `SPEC_WORKFLOW_OBSERVABILITY.md` ;
- `PLAN_PRS_FONDATIONS_MASTERFLOW.md`.

Objectif : donner a Vincent une sequence backend claire et testable avant implementation large.

---

## 2026-06-13 — Spec autonomie encadree step 1

**Livrable MALEX/Codex.** Ajout de `SPEC_AUTONOMY_STEP1_SHELL.md`.

La spec transforme la priorite `autonomy_step1_shell` en PR bornable :

- `autonomy_runs` ;
- `autonomy_findings` ;
- `improvement_candidates` ;
- `decision_queue` ;
- checks read-only ;
- endpoints admin+ ;
- recette A1-A8 ;
- tests minimum ;
- interdiction explicite d'executer une action sensible.

Cette couche doit permettre a MasterFlow d'observer, preparer et proposer avant les connecteurs
puissants ou l'automatisation d'execution.

---

## 2026-06-13 — Autonomie encadree step 1 avant connecteurs

**Decision MALEX.** Correction du plan post-audit : les connecteurs/plugins ne sont pas un
chantier step 1. La priorite devient un systeme autonome encadre capable d'observer, preparer et
proposer sans executer d'action sensible.

`MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md` est mis a jour :

- ajout de `F0 — Autonomie encadree step 1` ;
- objets proposes : `autonomy_runs`, `autonomy_findings`, `improvement_candidates`,
  `decision_queue` ;
- gateway connecteurs repoussee en phase ulterieure ;
- ordre de PRs mis a jour avec `autonomy_step1_shell` en premier.

---

## 2026-06-12 — Fondations post-audit a mettre en place

**Livrable MALEX/Codex.** Ajout de `MASTERFLOW_POST_AUDIT_FOUNDATION_UPGRADES.md` dans Git et
miroir prevu dans le Drive canon `01_CORE`.

Objectif : transformer les failles evidentes de l'audit complet en fondations transversales :

- Capability Registry reel ;
- statuts canon/runtime normalises ;
- Project / Scope / Ownership ;
- RAG local permissionne + Resource Truth ;
- jobs/queues/runners ;
- Template / Schema Registry ;
- autonomie encadree step 1 ;
- Tool / Connector Gateway plus tard ;
- observabilite workflow ;
- recettes d'acceptation systematiques ;
- validation graduee.

Priorite : mettre ces multiplicateurs en place avant d'empiler des features isolees ou une UI
finale.

---

## 2026-06-12 — Recette UI post-PR-1 Guided Runtime

**Livrable MALEX/Codex.** Ajout de `RECETTE_UI_PR1_GUIDED_RUNTIME.md` pour cadrer la future
surface atelier MOTH/CDC apres livraison backend PR-1.

Objectif : prevenir une UI deceptive. Le frontend devra consommer les objets reels
guide/session/progression/question/contributions/contradictions, ou afficher des etats vides.
Aucun public, export, email, badge, devis ou publication en PR-1.

---

## 2026-06-12 — Recette PR-1 Guided Runtime

**Livrable MALEX/Codex.** Ajout de `RECETTE_PR1_GUIDED_RUNTIME.md` pour cadrer l'acceptation
de la premiere tranche MOTH/CDC.

La recette couvre :

- endpoints attendus ;
- payloads de reference ;
- scenarios A1-A12 ;
- tests minimum ;
- criteres de refus immediat ;
- application de la validation graduee.

Objectif : permettre a Vincent de livrer une PR-1 verifiable avant toute UI finale ou acces public.

---

## 2026-06-12 — Validation graduee au lieu de double validation systematique

**Decision MALEX/Vincent.** MasterFlow assouplit la validation : ne pas exiger une double
validation humaine systematique pour les operations bas risque, privees ou reversibles.

Nouvelle reference : `POLITIQUE_VALIDATION_GRADUEE.md`.

Regle :

- permission check toujours ;
- preflight selon l'action ;
- audit des mutations ;
- validation humaine pour actions sensibles ;
- validation renforcee seulement pour actions critiques.

Impact PR-1 Guided Runtime : drafts, sessions privees, contributions et progression interne
passent par permission/scope/audit. Publication, public, email, event, devis, asset, export,
settings globaux, suppression definitive ou cout eleve restent soumis a validation humaine.

---

## 2026-06-12 — GO PR-1 Guided Runtime prive

**Decision humaine MALEX.** MOTH/CDC est retenu comme premiere verticale de preuve pour exercer
plusieurs fondations MasterFlow, sans le confondre avec une priorite absolue du produit.

Perimetre valide :

- `GUIDANCE_ENGINE` owner de la prochaine question ;
- guides owners par user, room optionnelle ;
- sessions uniquement authentifiees ;
- usage prive d'un guide draft par son teacher owner ;
- retention 30 jours inactive / 90 jours apres cloture ;
- premier template CDC versionne en `candidate` ;
- contrats, migrations, progression deterministe, permissions, audit et tests.

Restent interdits dans cette PR : public/invite, LLM obligatoire, email, event, devis, assets,
publication, analytics nominatifs et UI finale.

Demande transmise a Vincent dans `INBOX_VINCENT.md` et `SYNC_THREAD_MALEX_VINCENT.md`.

---

## 2026-06-12 — Audit exhaustif du Drive MasterFlow complet

**Perimetre :** audit documentaire et technique, sans modification runtime.

### Fait

- Inventorie les 4 508 fichiers du Drive canon :
  - 791 fichiers dans le corpus fonctionnel primaire ;
  - 3 686 fichiers secondaires (audits, deployment, factories) ;
  - 31 fichiers racine.
- Normalise le systeme en 42 familles, dont 41 dans le perimetre produit actuel et factories
  suivies separement comme `OUT_OF_SCOPE`.
- Compare chaque famille aux contrats, tables, endpoints, engines, UI et tests GitHub.
- Corrige la portee du premier audit : 15-20 % concernait le noyau actif ; la couverture de
  MasterFlow complet est estimee prudemment a **10-13 %**.
- Ajoute :
  - `AUDIT_MASTERFLOW_COMPLET_CANON_VS_GITHUB_2026-06-12.md` ;
  - `AUDIT_MASTERFLOW_CANON_INVENTORY.json` ;
  - `scripts/audit-masterflow-canon.mjs`.
- Message de revue depose pour Vincent dans `INBOX_VINCENT.md` et
  `SYNC_THREAD_MALEX_VINCENT.md`.

### Decision

- Ne pas reduire le canon au MVP et ne pas convertir chaque document en feature.
- Fermer d'abord core multi-user, permissions objet, execution/jobs et Sentinel minimal.
- Utiliser ensuite MOTH/CDC comme premiere verticale privee, puis Ours d'Or et devis.
- Terminer chaque verticale par sa surface UI, pas commencer par une UI globale.

---

## 2026-06-12 — Audit profond canon Drive vs GitHub

**Audit MALEX/Codex.** Rapport :
`AUDIT_PROFOND_CANON_VS_GITHUB_2026-06-12.md`.

L'audit compare l'index canonique des owners actifs, les grands contrats transversaux, les
objets BDD, les endpoints, les schemas partages, le frontend et les tests.

Conclusion :

- aucun des 19 owners actifs de l'index JSON n'est implemente a profondeur canonique ;
- 8 possedent une tranche de code executable identifiable ;
- la couverture brute par presence d'une tranche de code est d'environ 42 % ;
- la couverture fonctionnelle ponderee est estimee entre 15 et 20 % ;
- le socle auth/rooms/personas/actions/resources est coherent, mais les domaines metier,
  jobs, projets, assets, scopes et runners restent majoritairement absents.

Priorite recommandee : fermer scopes/ownership/privacy, projects, jobs et dispatcher d'actions,
puis utiliser le pilote MOTH/CDC comme premiere verticale multi-owner.

Validation technique du baseline : backend 27/27, lint backend/frontend et build frontend OK.

---

## 2026-06-12 — PR-0 Bot Studio / Guided Runtime

**Decision MALEX.** L'audit global du Drive canon est transforme en specification d'assemblage :
`SPEC_BOT_STUDIO_GUIDED_RUNTIME.md`.

Le Bot Studio n'est pas un nouvel engine. Il compose `GUIDANCE_ENGINE`, personas fonctionnelle
et lore, engine metier, UI manifest, permissions, cycle d'action, Resource Truth, analytics et
opportunity detector.

La spec couvre :

- guides conversationnels versionnes ;
- sessions privees, classe, invitees ou publiques ;
- contributions sourcees et contradictions ;
- manifestes de deploiement des bots ;
- permissions, consentements, preflight et validation ;
- cas MOTH/CDC, Ours d'Or, devis et creation guidee d'un bot ;
- plan de PRs progressives et tests minimum.

### Gate

- Ce commit est une PR-0 documentaire, sans code ni migration.
- La premiere implementation proposee reste privee et authentifiee, sans LLM obligatoire.
- Vincent doit auditer le mapping, repondre aux questions ouvertes et proposer le diff exact
  de PR-1.
- Acces public, email, devis, assets et analytics godmode exigent chacun un GO MALEX separe.

---

## 2026-06-12 — Dimensionnement propose pour le runtime Local RAG BGE

**Information transmise a Vincent.** Palier de depart recommande :

```text
RTX 4060 Ti 16 Go + CPU 8-12 coeurs + 64 Go RAM + NVMe 1-2 To
```

Le CPU seul reste possible pour un PoC, tandis qu'une RTX 4090 24 Go et 128 Go RAM
correspondent plutot a une charge lourde ou multi-utilisateur.

Cette recommandation n'est pas une decision d'achat. Le choix final dependra d'un benchmark
sur le corpus pilote : latence, debit, consommation VRAM/RAM et volume Qdrant.

---

## 2026-06-12 — Audit et durcissement PR-1 token tracking

**Audit MALEX/Codex du commit `1b08b38`.** Le gate admin/godmode, la whitelist SQL,
la lecture seule et le contrat partage sont conformes.

Correctifs appliques :

- index composite token par utilisateur et periode rendu deterministe ;
- rejet des periodes invalides ou inversees ;
- fallback local sur compteurs provider invalides ;
- neutralisation des couts negatifs ;
- couverture de test etendue a la tarification.

Rapport complet : `AUDIT_PR1_TOKEN_TRACKING.md`.

Validation : backend 27/27, lint backend/frontend, build frontend et `git diff --check` OK.

Risques conserves et explicites : tarification indicative non exploitable pour billing ;
appels provider echoues ou streams interrompus potentiellement absents de la telemetrie.

---

## 2026-06-12 — Dépôt du handoff Local RAG BGE pour Vincent

**Dépôt MALEX.** Le dossier `MASTERFLOW_LOCAL_RAG_BGE_HANDOFF/` est transmis à Vincent
comme spécification d'implémentation progressive d'une couche de retrieval locale et
permissionnée.

Contenu :

- point d'entrée obligatoire `00_START_HERE_VINCENT.md` ;
- architecture et limites de responsabilité ;
- indexation, retrieval hybride et context packs ;
- sécurité, permissions, révocation et audit ;
- plan de cinq PRs progressives ;
- contrat OpenAPI, schémas JSON, manifeste, compose et jeu d'évaluation.

Contrôles avant dépôt : JSON/JSONL valides, YAML valides, aucun secret détecté.

### Gate

- Première étape : audit du repo et proposition exacte de la PR-1 `Capability Shell`.
- Aucun code, modèle, Qdrant, indexation, migration, endpoint ou UI avant validation humaine.
- Permissions avant retrieval ; chaque hit doit conserver une source lisible.
- Le RAG reste dérivé, optionnel et non souverain.

Demande transmise dans `INBOX_VINCENT.md` et le fil de synchronisation.

---

## 2026-06-12 — GO humain MALEX sur PR-2 global settings

**Décision MALEX.** Vincent peut implémenter la PR-2 décrite dans
`SPEC_PR_PRIORITAIRES.md`.

Périmètre validé :

- action sensible `set_global_setting` ;
- passage obligatoire par permission check et preflight ;
- validation humaine admin avant exécution ;
- allowlist explicite des clés administrables ;
- secrets interdits dans `global_settings` ;
- audit et erreurs lisibles ;
- tests du cycle preflight, validation et exécution.

Pas de nouvel engine, pas de billing, pas d'extension des rôles et pas de refactor global.
Le résultat doit revenir dans Git pour revue avant toute surface frontend associée.

---

## 2026-06-12 — GO humain MALEX sur PR-1 suivi token

**Décision MALEX, confirmée directement avec Vincent.** Le commit backend `1b08b38`
« suivi token réel + endpoint diagnostic gated admin/godmode » est approuvé et conservé sur
`main`.

- instrumentation du `usage` provider avec fallback ;
- coût estimé centralisé ;
- granularité par tâche ;
- endpoint diagnostic réservé admin/godmode ;
- tests backend dédiés.

Ce GO clôt le gate de la PR-1. La PR-2 sur l'écriture sensible de `global_settings` a reçu
son GO humain séparé dans l'entrée ci-dessus.

---

## 2026-06-12 — Proposition packs et tarifs d'abonnement

**Décision MALEX.** Une première grille commerciale est déposée dans
`PROPOSITION_PACKS_ET_TARIFS_ABONNEMENT.md` pour être challengée par Vincent.

- Student : gratuit ;
- Student Pro / Portfolio : 8,90 EUR TTC/mois ;
- Teacher : 24,90 EUR TTC/mois ;
- Studio / Creator : 49 EUR TTC/mois ;
- School / Campus : à partir de 199 EUR HT/mois ;
- White Label : 990 à 2 500 EUR HT/mois + installation ;
- Godmode / Owner Ops : non commercialisé.

La proposition inclut un modèle de crédits IA et sépare strictement pack, rôle, permission,
quota et validation.

### Gate

- Statut `PROPOSAL / NON_CANONICAL`.
- Aucun billing, quota, endpoint, permission ou feature flag à implémenter dans ce tour.
- Vincent doit challenger coûts réels, marges, quotas et faisabilité à partir du suivi token.
- Toute implémentation ou canonisation exige une validation humaine MALEX séparée.

---

## 2026-06-12 — Spec détaillée des 2 PRs prioritaires (audit-only)

**Périmètre.** Spec des 2 features resserrées (suivi token, écriture settings admin), ancrée sur le code réel
de `apps/backend`. **Aucun code appliqué** — proposition pour validation humaine MALEX.

### Livré
- `SPEC_PR_PRIORITAIRES.md` :
  - **PR-1 suivi token** (`IMPROVE`) : (A) instrumentation `services/llm.ts` — `task` paramétrable,
    `stream_options.include_usage` pour consommer le `usage` réel (fallback estimation), coût via
    `llm_pricing.ts` ; (B) endpoint `GET /diagnostics/token-usage` **gated `requireRole('admin')`** (admin+
    godmode), registre `view_token_usage`. Migration : aucune (table existe).
  - **PR-2 écriture `global_settings`** (`ABSORB`) : action sensible `set_global_setting` (medium_high,
    `validator_role: admin`), ajout additif `validator_role` au schéma registre, `validatorRoleFor` le lit,
    dispatcher d'exécution réel (remplace le mock pour cette action) + allowlist `ADMIN_CONTROLLED_KEYS`,
    secrets jamais en BDD. Cycle complet preflight→validation(admin)→execute, 423 maintenu.
- Invariants tenus (validation humaine, privé par défaut, secrets hors BDD, contrat additif rétro-compatible).
  Ordre : PR-1 d'abord (indépendante), PR-2 ensuite (dépend du contrat `validator_role`).

### Gate
Spec = proposition. **`BLOCKED_BY_HUMAN_VALIDATION`** : rien implémenté/mergé/migré avant GO MALEX.

---

## 2026-06-12 — Audit d'absorption : PILOTE 3 projets livré (côté Vincent)

**Périmètre.** Réponse au gate MALEX. Décision Vincent : pilote `API_corrector` + `API_manage` + `vibe`
pour calibrer le format, extension aux ~17 autres sur GO. **Audit only, aucun code.**

### Livré
- `AUDIT_ABSORPTION_PILOTE_3PROJETS.md` : matrice sourcée par workflow (besoin, owner+type, contrats,
  données, permissions/preflight, UI, écart, classement, statut canonique, risque, tests, PR), + 5 sections
  transverses (top absorptions, incompat bloquantes, améliorations, à écarter, plan PRs courtes).
- INBOX_VINCENT entrée passée `open → answered` ; réponse dans `SYNC_THREAD` (entrée pilote audit).

### Constats clés
- Pépites faible-risque : transport Tauri desktop↔remote (`vibe`), egress LLM gated (`vibe`+`API_corrector`,
  proxy allowlisté = fausse alerte « relais ouvert » levée par contre-vérification), allowlist storage
  admin/privé (`API_manage`), garde-fous notation + `coherenceAudit` invisible → prolonge la couche 14.
- Incompat bloquantes : objets `classes/élèves` sans owner (retirés couche 13), CSP `default-src *`,
  tunnel QR brut, landing page-routing (anti-scope). Doublon correction `API_corrector` ↔ module `vibe`.
- ⚠️ Protocole canonique `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md` introuvable en local →
  compilé sur CONTRACT_INDEX + canon `05_BACKEND_REBUILD_SOURCE_TRUTH` + registre d'actions de `main`.

### Gate
Rapport = proposition, **retour pour validation humaine MALEX**. Rien codé/mergé/migré/déployé.

---

## 2026-06-12 — Gate strategique : audit d'absorption des workflows Vincent

**Decision MALEX.** Avant toute nouvelle integration structurante, le systeme de Vincent doit
comparer les workflows et features deja construits dans ses projets avec le MasterFlow canon.
Le risque actuel n'est pas le manque de features, mais l'ajout tardif de briques utiles sous une
forme incompatible, doublonnee ou mal gatee.

### Autorites et ordre de lecture

1. Canon produit : Drive `MASTERFLOW`.
2. Point d'entree : `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`.
3. Resolution MasterFlow :
   - `START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md` ;
   - `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md` ;
   - `01_CORE/MASTERFLOW_ENGINE_CONTRACTS.md` ;
   - `01_CORE/MASTERFLOW_SCOPE_AND_PERMISSION_MODEL.md` ;
   - `04_ENGINES/MASTERFLOW_RUNTIME_WIRING_AND_INTER_SYSTEM_CONNECTION_MAP.md`.
4. Implementation actuelle : GitHub `main`, `CLAUDE.md`, `packages/shared`, backend, frontend
   et registre d'actions.
5. Projets/workflows Vincent : sources candidates a inventorier et comparer, jamais nouvelle
   autorite canonique implicite.

### Methode obligatoire

Pour chaque workflow ou feature Vincent :

- decrire le besoin reel, les entrees, etats, sorties et condition d'arret ;
- identifier l'owner MasterFlow existant et son type : APP, ENGINE, CONTRACT, DATASET, EVENT,
  WIDGET ou AUDIT ;
- relier engine, contrats actifs, donnees/BDD, endpoints/toolcalls, permissions, preflight,
  validation humaine, traces, surface UI et tests ;
- verifier les doublons semantiques et les incompatibilites ;
- classer la proposition :
  - `KEEP_AS_IS` : deja compatible et reutilisable ;
  - `ABSORB_AND_ADAPT` : valeur utile, adaptation aux owners/contrats MasterFlow ;
  - `ADD_MISSING_CAPABILITY` : besoin nouveau confirme, a mapper avant code ;
  - `IMPROVE_EXISTING_OWNER` : meilleur pattern a injecter dans une brique existante ;
  - `SKIP_OR_QUARANTINE` : redondant, trop couple, premature ou contraire aux invariants.

Le verdict d'architecture doit aussi reprendre les statuts du protocole canonique :
`OK`, `PATCH_EXISTING_OWNER`, `AUDIT_ONLY`, `FUTURE_READY`, `QUARANTINE` ou
`BLOCKED_BY_HUMAN_VALIDATION`. `NEW_ENGINE` reste interdit sans impossibilite demontree.

### Livrable attendu avant code

Une matrice sourcee, un item par workflow :

```txt
Projet/source | workflow | valeur | owner MasterFlow | contrats | donnees
permissions/preflight | UI | ecart actuel | decision | risque | tests | PR proposee
```

Puis :

1. top des absorptions a forte valeur / faible risque ;
2. incompatibilites bloquantes ;
3. ameliorations MasterFlow suggerees par ses projets ;
4. briques a ecarter ;
5. plan de PRs courtes avec dependances et migrations explicites.

### Gate

- Audit et proposition seulement.
- Aucun code, merge, migration, endpoint, permission, deploiement ou changement de perimetre
  avant retour dans Git et validation humaine explicite de MALEX.
- Ne pas scanner tout le Drive sans ciblage : utiliser les index actifs, retrouver l'owner,
  puis charger seulement les contrats et engines necessaires.
- Conserver les invariants : permission check, preflight sensible, validation humaine,
  Resource Truth, donnees privees par defaut, UI non deceptive et auditabilite.

Demande transmise dans `INBOX_VINCENT.md` et `SYNC_THREAD_MALEX_VINCENT.md`.

---

## 2026-06-12 — Frontend couche 14 : auditabilite des actions

**Perimetre.** Rendre le cycle d'action et ses decisions lisibles depuis les donnees deja
retournees par le backend, sans nouveau contrat ni modification backend.

### Construit

- Ajout d'un composant `ActionAudit` isole du widget principal.
- Trace visuelle du cycle reel :
  - creation ;
  - preflight ;
  - validation, ou etape explicitement non requise ;
  - execution ;
  - resultat.
- Affichage des champs contractuels disponibles : risque, permission check, validateur,
  timestamp de mise a jour, note de validation, warnings, erreur backend et resultat technique
  repliable.
- Ajout d'une note libre dans l'inbox avant approbation ou rejet. Une note vide reste vide :
  aucun commentaire automatique n'est invente par l'UI.
- Distinction visuelle entre rejet humain, echec de preflight et echec d'execution.

### Invariant

Validation et execution restent deux gestes separes. L'UI ne reconstruit pas un audit log :
elle affiche uniquement l'etat courant et les metadonnees presentes dans le contrat `Action`.

### Validation

| Verif | Resultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK, 32 modules |
| `npm test` | OK, backend 16/16 |
| `git diff --check` | OK |
| Browser local mobile 390 px | aucun debordement, aucune erreur console |

### Run restant

Le panneau authentifie doit etre confirme sur le runtime public apres integration par Vincent,
le backend restant human-in-the-loop.

---

## 2026-06-12 — Revue + intégration couche 14 (côté Vincent)

**Périmètre.** Revue et intégration de la couche 14 frontend de MALEX (auditabilité des
actions, `action-audit.tsx`), sans modification backend ni contrat.

### Revue & intégration
- Fast-forward propre : `6f96de5` a pour parent exact `0016b6c` (MALEX déjà rebasé sur `main`).
  `main` : `0016b6c` → `6f96de5`.
- `ActionAudit` lit **uniquement** des champs présents dans le contrat `@masterflow/shared`
  `Action` (vérifié : `preflight.{risk_level,permission_check,requires_validation,warnings}`,
  `validator_id`, `updated_at`, `validation_note`, `result`, `error`, `status`). Aucun champ
  inventé, aucun audit log reconstruit côté UI — état courant + métadonnées du contrat.
- **Anti-hallucination renforcée** : l'ancien `handleValidationDecision` injectait d'office
  `'validation UI MasterFlow'` / `'rejet UI MasterFlow'`. Désormais la note n'est transmise que
  si non-vide (`note?.trim() ? {note} : {}`) → note vide = note absente. Bonne correction.
- Invariant tenu : validation et exécution restent **deux gestes séparés** (message
  « execution separee requise »). Aucun backend touché, aucun contrat modifié.

### Validation (côté Vincent, sur `main` fast-forwardé)
| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` (`tsc --noEmit`) | ✓ |
| `npm run build:frontend` | ✓ 32 modules |
| backend `npm test` (vitest) | ✓ 16/16 |
| `git diff --check` | ✓ |

Pas de smoke public ici : couche front pure, zéro changement backend. Le panneau authentifié
reste à confirmer sur le runtime public (run human-in-the-loop, backend lancé par Vincent).

---

## 2026-06-12 — Revue + intégration couche 13 (côté Vincent)

**Périmètre.** Revue et intégration de la couche 13 frontend de MALEX (modes fondés sur le
runtime réel), sans modification backend.

### Revue & intégration

- `main` fast-forwardé `69979cb` → `1e7bbdd` (clôture rebase `3860f2f` + refactor `1e7bbdd`).
- Extraction `apps/frontend/src/mode-runtime.ts` (types, `WORK_MODES`, `DEFAULT_WORK_MODE`,
  `canUseMode`, `buildModeView`) hors `App.tsx`, comportement préservé.
- Doctrine : suppression des objets fictifs (classes, élèves, sujets, histoires, arcs, scènes,
  timeline, tâches) ; Teaching/Story signalent l'absence d'objets métier backend. Conforme
  « app visible ≠ engine active » + anti-hallucination.
- Invariants : aucun backend, candidates Resource Truth gated admin/godmode (deck Admin),
  sources par défaut `validated`, `canUseMode` inchangé.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` (`tsc --noEmit`) | OK |
| `npm run build:frontend` (`vite build`) | OK, 31 modules |
| `npm test` (backend vitest) | OK 16/16 |
| `git diff --check` | OK |

Réponse à MALEX dans `SYNC_THREAD_MALEX_VINCENT.md` + `INBOX_MALEX.md` (rebase avant prochaine couche).

---

## 2026-06-12 — Frontend couche 13 : modes fondes sur le runtime reel

**Perimetre.** Retirer les objets d'interface prospectifs des modes et isoler leur mapping,
sans modification backend ni nouveau contrat.

### Construit

- Extraction de la definition des modes et de leur projection dans `apps/frontend/src/mode-runtime.ts`.
- Les cartes de mode proviennent uniquement du contexte reel :
  - room instance ;
  - ressources validees ;
  - registre d'actions live ;
  - validations en attente ;
  - candidates Resource Truth, reservees admin/godmode ;
  - etat WebSocket.
- Suppression des objets fictifs affiches comme s'ils existaient deja : classes, eleves,
  sujets compiles, histoires, arcs, scenes, timeline et taches.
- Les modes Teaching et Story signalent explicitement l'absence d'objets metier backend au lieu
  de simuler une fonctionnalite.

### Invariant

L'interface ne presente comme disponible que ce que le runtime et les permissions exposent
reellement. Aucun ajout backend, aucune donnee canon modifiee.

### Validation

| Verif | Resultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `git diff --check` | OK |

---

## 2026-06-10 — Couches 5-12 validées + run réel godmode + fix backend rooms

**Périmètre.** Côté Vincent : revue + intégration de la tranche frontend couches 5-12 de MALEX
(`16340c8`), exécution du run réel godmode demandé, et correction d'un bug backend découvert
pendant ce run.

### Revue & intégration

- Revue complète `App.tsx` (1221 lignes), `api.ts`, `styles.css`, `smoke-public-runtime.mjs`,
  `FRONTEND_UI_DOCTRINE.md` : conforme au contrat `@masterflow/shared` et aux invariants
  (cycle create → preflight → validation → exécution **explicite et séparée**, inbox gated
  teacher+, candidates ressources gated admin/godmode, sources par défaut = `validated` only,
  1 speaker via `message.speaker`, debug godmode only, **pré-remplissage login retiré** —
  point sécu de la dernière revue traité par MALEX).
- Fast-forward `main` → `16340c8`, live sur le funnel `:10000`.
- Checks : backend vitest **16/16**, `tsc` backend + frontend 0 erreur, `vite build` OK,
  `npm run smoke:public` **7/7 OK** avec credentials (login godmode, context, personas,
  resources, WebSocket pong à travers le funnel).

### Bug backend trouvé et corrigé (`3e34213`)

Le run réel a révélé que le router `rooms` supposait `requireUser` « monté en amont » alors
qu'`index.ts` ne le montait pas :

- `GET /rooms` répondait **sans authentification** sur le funnel public (fuite) ;
- `GET/PUT /rooms/:id/instance` renvoyaient **401 même avec un token valide** (`req.user`
  jamais posé) → la couche 12 de MALEX (sync room instance) ne pouvait pas fonctionner.

Fix : `router.use(requireUser)` dans le router lui-même (pattern des autres routers) + nouveau
test HTTP éphémère `rooms_auth.test.ts` (401 sans token sur les 4 routes, cycle PUT/GET
instance avec token). Vérifié en live : `GET /rooms` sans auth → 401, `PUT instance` → 200.

### Run réel godmode (les 7 étapes demandées par MALEX) — tout passe

| Étape | Résultat |
|---|---|
| 1. Login `:10000` | 200, rôle godmode |
| 2. Sas d'entrée → `PUT instance` | 200 après fix ; surface/densité/`entry_profile` persistés et relus |
| 3. Home Room surface + densité + sync | `learning`/`low`/`active_mode` confirmés en relecture |
| 4. Action live → preflight | non-sensible auto-`approved` ; sensible (`approve_validation_item`) → `pending_validation`, `execute` avant validation refusé **423** |
| 5. Inbox validation | 1 item pending → `approved` via `POST validate`, exécution séparée → `completed` |
| 6. Proposer ressource candidate | 201 `candidate`, invisible liste par défaut, visible `include_all` (godmode) |
| 7. Valider candidate | `validated`, apparaît ensuite dans les sources par défaut |

Note : la ressource de test « Test run réel couches 5-12 » reste dans le runtime (BDD vivante,
pas le canon Drive) comme trace visible du run.

---

## 2026-06-08 — Frontend couche 12 : sync room instance

**Perimetre.** Persister le choix d'entree et le mode courant dans la room instance existante.

### Construit

- Client frontend `PUT /rooms/:id/instance`.
- Le sas d'entree persiste :
  - `active_surface` = intention choisie ;
  - `cognitive_density` = densite choisie ;
  - `widget_state.entry_profile`.
- Le rail de modes persiste `active_surface` et `widget_state.active_mode`.
- La Home Room affiche surface active, densite et etat de synchronisation.

### Invariant

Pas de nouveau backend : on consomme le contrat Room OS deja expose. Le localStorage reste un
fallback d'entree, mais la room instance devient le runtime partage.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 11 : validation Resource Truth

**Perimetre.** Boucler le cycle ressource candidate -> canon valide cote UI.

### Construit

- Client frontend `GET /resources?include_all=1` reserve admin/godmode.
- Client frontend `POST /resources/:id/validate`.
- Affichage separe des ressources candidates dans le panneau `Sources`, visible uniquement
  admin/godmode.
- Bouton `Valider` pour promouvoir une candidate au canon.
- Refresh du canon `validated` apres validation.

### Invariant

Les candidates restent separees des sources validees ; seuls admin/godmode chargent la vue
`include_all`.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 10 : proposition Resource Truth

**Perimetre.** Permettre au front de proposer une source sans l'ajouter au canon affiche.

### Construit

- Client frontend `POST /resources`.
- Formulaire compact dans le panneau `Sources` : titre, URL optionnelle, sujets.
- Une proposition cree une ressource `candidate`.
- La liste `Sources` continue d'afficher uniquement `GET /resources` par defaut, donc uniquement
  les ressources `validated`.
- Retour d'etat lisible avec id de candidate.

### Invariant

Une ressource candidate n'est jamais presentee comme source validee tant qu'un humain ne l'a pas
promue cote backend.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 9 : execution explicite apres validation

**Perimetre.** Fermer le cycle action cote UI sans transformer la validation humaine en
execution automatique.

### Construit

- Extraction d'un handler d'execution pour action deja `approved`.
- Les actions non sensibles continuent le cycle apres preflight `approved`.
- Les actions sensibles approuvees depuis l'inbox affichent un bouton `Executer` distinct.
- L'etat d'action garde le statut, le message et l'id de l'action courante.

### Invariant

Validation humaine et execution restent deux gestes separes pour les actions sensibles.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 8 : validation inbox

**Perimetre.** Brancher la surface de validation V1 sur le contrat backend existant.

### Construit

- Client frontend pour :
  - `GET /actions/pending` ;
  - `POST /actions/:id/validate`.
- Panneau `Validation` visible uniquement pour les roles `teacher`, `admin`, `godmode`.
- Rafraichissement de l'inbox apres chargement, creation d'une action en attente, approbation
  ou rejet.
- Decisions explicites : `Approuver` / `Rejeter`, avec note UI courte.
- Une action approuvee reste separee de l'execution : pas d'auto-run cache apres validation.

### Invariant

Les comptes sans role teacher+ ne chargent pas et ne voient pas l'inbox de validation.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 7 : cycle actions live

**Perimetre.** Brancher les chips d'actions live sur le contrat backend existant, sans action
sensible directe.

### Construit

- Client frontend pour :
  - `POST /actions` ;
  - `POST /actions/:id/preflight` ;
  - `POST /actions/:id/execute`.
- Clic action = creation d'une action `draft`, puis preflight obligatoire.
- Execution seulement si le backend renvoie `approved`.
- Si le backend renvoie `pending_validation`, l'UI s'arrete et affiche le role validateur requis.
- Retour d'etat lisible dans le widget principal : creation, preflight, attente validation,
  execution, completed ou failed.

### Invariant

Aucun chip n'execute directement une action sensible. Le backend reste l'autorite du cycle.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 6 : sas d'entree utilisateur

**Perimetre.** Ajouter l'entree runtime avant la Home Room, sans backend delta et sans ecriture canon.

### Construit

- Apres login, un utilisateur sans profil d'entree local passe par un sas court :
  - intention du jour ;
  - densite cognitive ;
  - preference de presence/persona.
- Le choix est persiste en `localStorage`, scope par `user.id`.
- L'intention choisie ouvre directement le mode correspondant dans la Home Room.
- Aucune action sensible, aucune ecriture backend, aucun secret.

### Note backend

La table `users` contient deja `preferences_json`, mais `UserSchema` / `CurrentContext` ne
l'exposent pas encore. Cette couche prepare le futur contrat sans l'inventer cote frontend.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |

---

## 2026-06-08 — Frontend couche 5 : Home Room situationnelle

**Perimetre.** Premier refactor UI depuis la doctrine MALEX, sans backend delta et sans action sensible.

### Construit

- Home Room recentree sur une situation lisible : modes disponibles, sources, actions live, persona.
- Rail de modes : Home, Teaching, Story, Project, Learning, Inventory, Admin selon role.
- Widget principal dynamique par mode, avec signal court et 1-3 actions utiles.
- Object deck contextuel par mode au lieu d'un catalogue de personas/features.
- Actions futures/verrouillees retirees de l'experience normale ; consultables seulement en godmode/debug.

### Intention

Cette couche reste volontairement sobre : elle pose la navigation canon `situation -> mode -> objet`
avant d'ouvrir les rooms specialisees ou les flows d'onboarding.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| `npm run smoke:public` | OK health/front public ; auth skip car secrets non fournis |
| Vite local `http://127.0.0.1:5174/` | HTTP 200 |

Note : capture Playwright non realisee car `playwright` n'est pas installe dans le workspace.

---

## 2026-06-08 — Synthese UI MALEX : situation avant fonctionnalites

**Contexte.** MALEX fournit une synthese UI issue d'un debrief : le frontend fonctionne
techniquement, mais ne doit pas devenir une interface deceptive ou un catalogue de boutons.

### Doctrine actee

- MasterFlow doit montrer la **situation**, pas les fonctionnalites disponibles.
- Premiere connexion : tunnel unique type mini Akinator -> profil -> preferences -> avatar /
  personnage canon si souhaite -> interface personnalisee.
- Navigation par zoom : accueil -> mode -> room -> objet -> detail.
- Les modes sont des univers : Teaching, Story, Project, Learning, Inventory, Admin/Godmode.
- Le widget principal est dynamique, choisi par le contexte actif.
- Les IA/engines doivent etre majoritairement invisibles.
- Clic et chat pilotent tous les deux l'interface.

### Patch

- Ajout `FRONTEND_UI_DOCTRINE.md`.
- Handoff Home Room recadre : situation summary, main widget dynamique, mode rail, object deck,
  1-3 actions.
- Login frontend : retrait du mot de passe pre-rempli obsolète.

---

## 2026-06-07 — Accès MALEX : bascule Funnel PUBLIC + durcissement secrets + intégration front

**Contexte.** Déblocage de l'accès distant de MALEX (toutes les voies privées Tailscale ont
échoué), puis validation + intégration du frontend Home Room de MALEX sur `main`.

### Diagnostic accès (voies privées épuisées)

- **Serve ne sert pas les nœuds partagés** (sharee) → `:8443`/`:10000` timeout pour MALEX.
- **IP tailnet directe** échoue aussi : `tailscale ping` OK mais TCP jamais établi ; `tcpdump`
  host = **0 paquet** de l'IP MALEX sur `tailscale0`, 0 conntrack. **Firewall écarté** (`ts-input`
  accepte tout le trafic tailscale, compteurs ; `netcheck` host sain). Cause = **plan de données
  Tailscale KO entre le NAT FAI de MALEX et la box** (les machines qui marchaient étaient toutes
  sur le LAN ; MALEX seul est distant, via DERP Paris).

### Décision (validée humainement par Vincent)

- **Exposer en Tailscale Funnel PUBLIC** : `:8443` (backend) + `:10000` (frontend). **`443` =
  Funnel API_manage, intact.** + **partage du compte godmode** avec MALEX (le classifier auto
  avait bloqué la génération de creds sans validation explicite → confirmée).

### Durcissement sécu (obligatoire avant ouverture publique, fait)

- `JWT_SECRET` **régénéré** : l'ancien fallback codé en dur (`dev-…-change-me`) permettait de
  **forger un token godmode** — prouvé par forge HS256 (`/me` 200 avant, 401 après) puis fermé.
- **Mot de passe godmode tourné** (défaut public `vincent/masterflow`).
- Les deux dans `apps/backend/.env` (gitignoré, `dotenv` chargé ; ⚠️ `tsx watch` ne recharge pas
  `.env` → **redémarrage backend requis**). Identifiants transmis **hors-bande** (jamais dans Git).
- Risque résiduel noté : `POST /auth/register` ouvert (crée rôle `student`).
- Nettoyage : 6 process backend orphelins (vieux `tsx` détachés) supprimés.

### Intégration frontend MALEX (couches 2-4) — validé + mergé

- Revue Home Room cockpit + chat WS + couche personas/registry (`App.tsx`, `api.ts`,
  `styles.css`) : conforme `@masterflow/shared`, invariants OK (buckets `status`, **1 speaker**,
  `method_attribution`, ressources `validated` only, `preflight_required` désactive le chip),
  `wss` derrière le funnel. Fast-forward `main` ← `codex` (pas de divergence), **live sur le
  funnel `:10000`** sans erreur. Note : login pré-remplit l'ancien mdp (mort) → à vider (public).

### Validation (run réel)

| Vérif | Résultat |
|---|---|
| Backend public `:8443/health` | 200 |
| Frontend public `:10000/` | MasterFlow servi |
| `:10000/api/v1/personas` (proxy) | 401 (backend joint) |
| `443` API_manage | 200 (intact) |
| Login godmode public (nouveau mdp) | 200 |
| Token forgé **ancien** JWT secret → `/me` | 401 (rotation OK) |
| Frontend `tsc --noEmit` + `vite build` | OK (30 modules) |

Refs : `ee77878` (funnel + secrets), `7da3a90` (fix doc risques), `f14509d` (validation front),
`b006df3` (clôture items inbox).

---

## 2026-06-07 — Runtime public : smoke test reproductible

**Périmètre :** réduire les tests manuels MALEX avant ouverture de l'interface.

### Ajouté

- Script `npm run smoke:public`.
- Vérifie sans secret :
  - backend public `/health` ;
  - frontend public `:10000`.
- Si `MASTERFLOW_USERNAME` et `MASTERFLOW_PASSWORD` sont fournis via l'environnement, vérifie aussi :
  - login via proxy frontend ;
  - `GET /context/current` ;
  - `GET /personas` ;
  - `GET /resources` ;
  - WebSocket `ping -> pong`.

### Règle sécurité

Le script ne contient aucun identifiant et n'affiche jamais le token. Les secrets restent hors Git.

### Validation 2026-06-07

| Vérif | Résultat |
|---|---|
| Smoke public sans secret | OK (`/health` + frontend `:10000`) |
| Smoke public authentifié | OK |
| Login | 200 · rôle `godmode` |
| `GET /context/current` | 200 · Home Room |
| `GET /personas` | 200 · 3 personas |
| `GET /resources` | 200 · 2 ressources validées |
| WebSocket | `ping -> pong` |

---

## 2026-06-07 — Frontend couche 4 : chat compact + WebSocket

**Périmètre :** ajouter la surface chat Home Room sans action sensible, sans écriture canon et
sans backend delta.

### Construit

- Client WebSocket frontend vers `/ws/{room_instance_id}?token=...`.
- États de connexion : `idle`, `connecting`, `connected`, `closed`, `error`.
- Support des messages backend existants :
  - `chat_start` ;
  - `chat_chunk` ;
  - `chat_end` ;
  - `pong` ;
  - `error`.
- Chat compact dans la Home Room :
  - tours utilisateur ;
  - streaming assistant ;
  - attribution système courte si une méthode secondaire est prêtée ;
  - formulaire désactivé tant que WS non connecté.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| Vite local `http://localhost:5174/` | HTTP 200 |

Note : test WS réel en attente d'un backend joignable (`localhost:8000` ou tailnet
`100.100.128.63:8000`).

---

## 2026-06-07 — Frontend couche 3 : Home Room canon compacte

**Périmètre :** recadrer l'écran connecté selon le handoff Home Room, sans backend delta et sans
exécuter d'action sensible.

### Construit

- Home Room recentrée sur :
  - room active ;
  - rôle/mode courant ;
  - persona porte-parole ;
  - 1 à 3 actions `live` utiles ;
  - sources validées depuis `GET /resources`.
- Les actions `future` restent visibles comme verrouillées ; les actions `out_of_scope` ne sont
  plus exposées dans l'expérience normale.
- Le panneau debug n'apparaît qu'en rôle `godmode` et sert à compter `live` / `future` /
  `out_of_scope`, sans ouvrir Owner Ops fonctionnel.
- Ajout client frontend `GET /resources` pour amorcer le `source_truth_strip`.

### Validation

| Vérif | Résultat |
|---|---|
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK |
| Vite local `http://localhost:5174/` | HTTP 200 |

Note : screenshot Playwright non réalisé car `playwright` n'est pas installé dans le workspace.

---

## 2026-06-07 — Inbox MALEX : rebase main clôturé

**Contexte.** Vérification après audit Drive canon avant reprise frontend.

- `origin/main` est bien ancêtre de `codex/frontend-masterflow`.
- La demande inbox « rebaser sur main à jour » est donc traitée, pas bloquante.
- `INBOX_MALEX.md` passe l'entrée correspondante de `open` à `done`.
- Prochaine étape : frontend couche 3, Home Room canon compacte.

---

## 2026-06-07 — Audit Drive canon + verrouillage cohérence V1

**Contexte.** MALEX demande un audit du MASTERFLOW canon sur Drive avant de continuer les
opérations GitHub/frontend.

### Lu côté Drive

- `START_HERE_FOR_AI_AND_DEVS_MASTERFLOW.md`
- `START_HERE_VINCENT_CLAUDE_UI_MASTERFLOW.md`
- `PROTOCOLE_AUDIT_VINCENT_MASTERFLOW_A_LIRE_EN_PREMIER.md`
- `01_CORE/MASTERFLOW_ACTIVE_CONTRACT_INDEX.md`
- contrats clés UI/permissions/Owner Ops/sync/runtime action surface

### Verdict

- Drive MASTERFLOW reste la source canon produit ; GitHub reste la source technique du code.
- Le Drive décrit MasterFlow complet. La V1 GitHub doit rester en couches courtes : contrat,
  endpoint, permission gate, UI surface et validation avant toute feature.
- Factories/backflows existent dans le canon global mais restent **hors scope V1 backend/frontend**
  dans cette version.
- Godmode / Owner Ops est cohérent si gate strict `godmode`, jamais teacher/student/client, et
  sans bypass audit/preflight.
- Prochaine UI : traiter l'état actuel comme couche d'intégration/debug et évoluer vers une
  Home Room contextuelle compacte, pas un dashboard permanent.

### Patch documentaire

- `CLAUDE.md` : clarification Drive canon vs V1 GitHub + port frontend `5174`.
- `BACKEND_INTEGRATION_MAP.md` : retrait des mentions périmées PoC/seed/vulnérabilités/Owner Ops.
- `FRONTEND_SCREEN_HANDOFF_HOME_ROOM.md` : handoff minimal avant couche UI suivante.

---

## 2026-06-07 — Sync GitHub + Q6 tranchée : godmode étendu (confirmé humainement)

**Contexte.** Sync depuis GitHub : `main` fast-forward sur `claude/gitlab-audit-suivi-6PjDS`
(frontend MALEX `apps/frontend`, infra sync, seed + champ `status`, PoC retiré, sécu vitest
4.1.8 / `npm audit` 0 vuln). Réponse à **la question clé backend** de MALEX (`VINCENT_BACKEND_SYNC_2026-06-06.md`, Q6).

### Aller-retour Q6 (tracé honnêtement)

1. Première validation humaine de Vincent : **Owner Ops strict** → commit `7322e61`, poussé.
2. Découverte : `codex/frontend-masterflow` avait poussé du contenu non lu (demande Tailscale +
   réassertion **godmode étendu** s'attribuant la validation de Vincent).
3. Vincent **tranche à nouveau, en connaissance de cause : godmode étendu** (position MALEX/codex
   retenue). → `git revert 7322e61` + sceau « confirmé humainement 2026-06-07 ».

### Décision finale (validée humainement)

- **Q6 = godmode étendu.** En rôle `godmode`, l'UI peut **exécuter des actions** ET
  `owner_ops_private_diagnostic` est **exposé** (quand le backend l'implémentera). **Gate strict
  `godmode`**, jamais teacher/student. Lève le cloisonnement strict Owner Ops de la 1re carte.
  L'UI ne présente rien comme fonctionnel avant contrat + endpoint réels. Owner Ops pas encore
  codé backend.
- Q1–Q5 inchangées et confirmées (champ `status` ; seed aligné sur les endpoints réels ;
  `user_runtime_loadout` hors V1 ; `GET /actions/pending` teacher+ ; endpoints lourds `future`).
- **Tailscale** : accès tailnet **accordé** à MALEX (Serve, pas de Funnel/port public) ; entrée
  de confirmation dans `SYNC_THREAD_MALEX_VINCENT.md` (hostname MagicDNS à compléter par Vincent).
- Branches distantes `claude/*` et `codex/*` : **conservées** (pas de suppression, sur consigne
  Vincent) ; codex porte des entrées doc à rebaser sur le `main` à jour.
- Gouvernance inbox précisée : Vincent peut déposer des demandes dans `INBOX_MALEX.md`, mais
  MALEX conserve la validation humaine obligatoire avant toute application ou exécution.
- Rebase MALEX sur `main` + node-share `95faee7` reçus. Test Tailscale : DNS tailnet OK
  (`100.100.128.63`) mais ports Serve `8443`/`10000` en timeout depuis MALEX ; demande ouverte
  dans `INBOX_VINCENT.md`.
- Push `070688e` reçu : test IP directe. `tailscale ping 100.100.128.63` OK (22 ms), mais
  `http://100.100.128.63:8000/health` et `:5174` timeout ; demande host/bind/firewall ouverte
  dans `INBOX_VINCENT.md`.
- Règle de sync renforcée : avant toute réponse MALEX sur état Vincent/backend/Tailscale,
  Codex doit refaire un check distant (`git fetch origin` + dernier `origin/main`) pour éviter
  les réponses caduques si Vincent pousse pendant le tour.

### Validation (état synchronisé, run réel)

| Vérif | Résultat |
|---|---|
| `npm install` | OK · **0 vulnérabilité** |
| Backend Vitest (v4.1.8) | **13/13** |
| Backend `tsc --noEmit` | 0 erreur |
| Frontend MALEX `vite build` | OK · 30 modules / 198 KB |

---

## 2026-06-07 — Frontend couche 2 : personas, actions, états réseau

**Périmètre :** avancer côté MALEX sans dépendre du backend distant encore bloqué sur les ports
tailnet. Aucun backend delta, aucune action sensible déclenchée.

### Construit

- Client frontend enrichi avec `GET /personas` et `GET /actions/available`.
- Home Room affiche maintenant :
  - contexte courant ;
  - personas disponibles ;
  - porte-parole actif si un blend est présent ;
  - registre d'actions groupé `live` / `future` / `out_of_scope` ;
  - état réseau avec retry manuel.
- Les actions `out_of_scope` restent masquées visuellement ; les actions `future` sont affichées
  comme non fonctionnelles.

### Note

- Le test réel `login → context/personas/actions` attend toujours que `100.100.128.63:8000`
  et `:5174` répondent depuis MALEX.

---

## 2026-06-06 — Intégration MALEX : réconciliation, alignement seed, réponses de sync

**Contexte.** MALEX a poussé `codex/frontend-masterflow` (6 commits) : workspace `apps/frontend`,
carte d'intégration, protocole d'inbox/sync, modif `CLAUDE.md`. Branche basée sur le commit
initial → divergente de `main`. Intégration et réponses faites sur `claude/gitlab-audit-suivi-6PjDS`.

### Fait

- **Réconciliation** : merge de `origin/codex/frontend-masterflow` (auto-merge propre, aucun
  marqueur de conflit ; `SUIVI.md` et `CLAUDE.md` fusionnés sans perte).
- **PoC retiré** (décision Vincent : frontend prioritaire à MALEX). Suppression de
  `packages/poc-frontend`, retrait du workspace + script `dev:poc`, nettoyage `CLAUDE.md`/`README.md`.
  `apps/frontend` (MALEX) devient le **seul** frontend.
- **Alignement seed ↔ endpoints réels** (question MALEX #2) : `preflight_action` →
  `POST /actions/{action_id}/preflight`, `approve_validation_item` → `POST /actions/{action_id}/validate`.
- **Flag de capacité** (question MALEX #1) : champ `status` (`live`/`future`/`out_of_scope`)
  ajouté à `ActionRegistryEntrySchema` (`packages/shared`) + tagué dans le seed. L'UI sait quoi
  afficher comme fonctionnel / verrouillé / masqué. Default prudent `future`.
- **Réponses de sync** : feu vert couche 1 + réponses aux 6 questions backend rédigées dans
  `INBOX_VINCENT.md`, `SYNC_THREAD_MALEX_VINCENT.md`, `INBOX_MALEX.md` (brouillons via Claude ;
  lancement backend = acte humain de Vincent).
- **Réponses validées par Vincent (QCM)** : Q1 = champ `status` seul ; Q2 = aligner le seed
  sur le réel ; Q3 = `user_runtime_loadout` hors V1 ; Q4 = `GET /actions/pending` suffit ;
  Q5 = endpoints lourds plus tard (`future`) ; Q6 = **godmode étendu** (cf. ci-dessous).
- **Sécu** : montée `vitest` `^2.1.0` → `^4.1.8` (corrige l'advisory critique vitest `<4.1.0`
  + chaîne esbuild/vite dev-server, **dev-only**), puis `npm audit fix` non destructif →
  **`npm audit` = 0 vulnérabilité**. Aucun `npm audit fix --force`.

### Validation

| Vérif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Frontend MALEX `tsc --noEmit` | 0 erreur |
| Backend Vitest (v4.1.8) | 13/13 |
| `npm audit` | 0 vulnérabilité |
| Merge `codex/frontend-masterflow` | auto-merge propre, sans conflit |

### Décisions / notes

- `user_runtime_loadout`, validation inbox dédiée, endpoints `/da` `/assets` `/inventory`
  `/subjects` : **hors V1** (anti-scope). Backflow/factories : `out_of_scope`.
- **godmode étendu** (décision Vincent, QCM) : en rôle godmode l'UI peut exécuter des actions
  **et** `owner_ops_private_diagnostic` est exposé — gated rôle godmode uniquement (jamais
  teacher/student). Lève le cloisonnement strict Owner Ops de la 1re carte d'intégration.
- Le contrat REST réel reste l'autorité ; on aligne les métadonnées descriptives du seed dessus.

---

## 2026-06-06 — Frontend couche 1 : shell MALEX minimal

**Périmètre :** création du vrai workspace frontend MALEX, sans backend delta, sans lancement du backend, sans UI finale.

### Construit

- Ajout de `apps/frontend` comme workspace npm.
- Ajout des scripts root :
  - `dev:frontend` ;
  - `lint:frontend` ;
  - `build:frontend`.
- Frontend React/Vite/TypeScript minimal :
  - écran login ;
  - client REST typé vers `/api/v1` ;
  - stockage du token en mémoire ;
  - appel `GET /context/current` ;
  - affichage sobre du user, rôle, room, surface active et nombre d'actions disponibles.

### Validation

| Vérif | Résultat |
|---|---|
| Frontend `tsc --noEmit` | 0 erreur |
| Frontend `vite build` | OK · 30 modules / 198 KB JS |
| Backend Vitest | 13/13 |
| Backend `tsc --noEmit` | 0 erreur |

### Décisions / notes

- Cette couche prouve l'intégration workspace + contrat REST sans présumer des endpoints futurs.
- Aucun backend lancé et aucune modification backend.
- Les widgets chat, personas, actions, validation inbox et ressources seront ajoutés un par un.

---

## 2026-06-06 — Sync MALEX/Codex : baseline + carte d'intégration

**Périmètre :** reprise côté MALEX sur la branche `codex/frontend-masterflow`, sans modification backend ni lancement du serveur.

### Fait

- Relu `CLAUDE.md` et `SUIVI.md` avant action.
- Installé les dépendances du repo.
- Vérifié la baseline locale :
  - `npm test` OK : 13/13 ;
  - `npm run lint` OK ;
  - backend non lancé, conformément à la consigne human-in-the-loop.
- Créé `BACKEND_INTEGRATION_MAP.md` : carte pré-code des modules, tables, endpoints réels, gates, risques et plan de PRs courtes.
- Créé `VINCENT_BACKEND_SYNC_2026-06-06.md` : note courte à envoyer à Vincent pour clarifier les besoins backend avant frontend complet.
- Mis en place par MALEX : un système de conversation asynchrone via Git et fichiers suivis, initialisé dans `SYNC_THREAD_MALEX_VINCENT.md`.
- Ajout du protocole inbox systématique pour Vincent/MALEX : `CLAUDE.md`, `INBOX_VINCENT.md`, `INBOX_MALEX.md` et `SYNC_THREAD_MALEX_VINCENT.md`.
- Commit + push de la branche `codex/frontend-masterflow`.

### Décisions / notes

- Les factories / bots extraits sont hors scope de cette version.
- Le frontend complet doit avancer par couches : contrat/backend vérifié d'abord, intégration minimale ensuite, UI finale en dernier.
- Toute retouche backend éventuelle doit passer par mapping engine / contrat / données / permissions / gates avant code.
- Les échanges structurants MALEX / Vincent / Codex doivent être tracés dans Git quand ils impactent le run, le backend, le frontend ou les décisions de périmètre.
- Règle opérationnelle : avant toute reprise ou action structurante, checker `SUIVI.md`, `SYNC_THREAD_MALEX_VINCENT.md`, puis l'inbox dédiée.

### Points à clarifier avec Vincent

- Alignement entre le seed d'actions et les endpoints réellement exposés.
- Existence souhaitée d'un `capabilities` endpoint ou de champs `implemented/status/locked/ui_enabled`.
- Forme minimale éventuelle de `user_runtime_loadout`.
- Suffisance de `GET /actions/pending` comme validation inbox V1.
- Frontière exacte entre `godmode` visible dans l'UI et diagnostics privés Owner Ops.

---

## 2026-06-06 — MVP backend + PoC : livrés et validés

**Périmètre :** backend (livrable principal) + PoC frontend de démonstration. Le frontend complet reste à MALEX.

### Construit

**Phase 0 — Squelette.** Monorepo npm workspaces (`apps/backend`, `packages/shared`, `packages/poc-frontend`). SQLite via better-sqlite3 (singleton WAL+FK, migrations idempotentes). Schéma MVP : `users`, `revoked_tokens`, `rooms`, `room_instances`, `personas`, `persona_blends`, `actions`, `audit_logs`, `resources`, `global_settings`, `token_events`. Seed idempotent (godmode `vincent`, 3 personas, room Home, ressources). `GET /health`.

**Phase 1 — Auth + Contexte.** JWT Bearer (`signToken`/`verifyToken`, `requireUser`/`requireRole`, révocation par `jti`). `POST /auth/{register,login,logout}`, `GET /auth/me`. `GET /context/current` (user+room+instance+personas+blend actif+actions dispo). Rooms + room_instances (création paresseuse).

**Phase 2 — Personas + Chat + Blend.** `GET /personas`, `POST /personas/{id}/activate`, `POST/PUT/DELETE /personas/blend`. **Chimère** = fusion visuelle + 1 porte-parole (primaire) ; `computeHybridVoice` (overlay de méthode attribué) ; `methodAttribution`. **WebSocket chat streaming** (`routers/ws/chat.ts`) : auth à l'upgrade, `chat_start → chat_chunk → chat_end`. `services/llm.ts` (mock + OpenAI-compat SSE).

**Phase 3 — Action router.** Cycle `draft→preflight→pending_validation→approved→executing→completed` (`action_engine`). `GET /actions/available` (depuis le seed), `POST /actions`, `/preflight`, `/validate` (teacher+), `/execute`, `GET /actions/pending`. `risk_level` statique. Tout tracé dans `audit_logs`.

**Phase 4 — Anti-hallucination.** `resource_truth` : `GET /resources` ne sert que les `validated` ; `POST /resources` → `candidate` ; `POST /resources/{id}/validate` (teacher+). `include_all=1` réservé admin/godmode.

**Contrat MALEX.** `packages/shared` (Zod) : tous les payloads REST + messages WS. Ajout de `SearchResourcesResponseSchema` (`{results,total}`), seule réponse non typée.

**PoC front.** React 19 + Vite 6. `BlendCanvas` (métaballs WebGL `smoothMin`, creep Zerg, respecte `prefers-reduced-motion`), `api.ts` (REST typé), `useChatWs.ts` (hook streaming), `App.tsx` (harness login → contexte → chat streaming → slider de fusion ProfKrapu⇄Corrector).

**Tests.** Vitest niveau engine (`:memory:`) : auth/rôles, cycle de vie action (dont 423 avant validation, rejet, rôle insuffisant), anti-hallucination, invariant blend. **13/13.**

### Corrections de ce tour (reprise après workflow interrompu)

- Écrit le **router WS `ws/chat.ts`** (manquait) + recâblé `index.ts` (http server + montage REST + WS).
- Corrigé **10 erreurs `tsc`** (`noUncheckedIndexedAccess` sur `req.params.id`) dans `personas.ts`/`rooms.ts`.
- **Réconcilié les contrats du PoC** : `App.tsx` (généré en parallèle) attendait des signatures différentes de `api.ts`/`useChatWs.ts` → aligné (`api` agrégé, `login` positionnel, `updateBlend` poids bruts, `currentSpeaker`/`status`/`role:'assistant'`/`method_attribution`, `import App` default).

### Validation (run réel, pas seulement compilation)

| Vérif | Résultat |
|---|---|
| Backend `tsc --noEmit` | 0 erreur |
| Backend Vitest | 13/13 |
| PoC `tsc` + `vite build` | 0 erreur · 32 modules / 209 KB |
| Boot + `/health` | `users:1 personas:3 rooms:1 resources:3` |
| Login godmode → JWT | OK |
| Cycle action complet | draft→preflight→pending→approve→execute→completed |
| **Invariant** execute avant validation | **HTTP 423 `not_approved`** |
| Trace audit | `action_created→preflight→validation→execute_start→execute_completed` |
| Anti-hallucination `/resources` | 2 `validated` ; `include_all` (godmode) → 3 ; proposition → `candidate` |
| WS streaming | `chat_start` → 127 chunks → `chat_end` |
| Chimère via WS | speaker = **ProfKrapu** + `method_attribution = "méthode inspirée de Corrector"` |

### Décisions / notes

- Le **seed** (`action_registry_seed.v1.json`) prime sur `API_DESIGN.md` pour `action_id`/surfaces/risk.
- « SIMULATION PURE » traité comme dry-run (preflight actif, exécution mockée).
- Exécution d'action **mockée** au V1 (pas de runner réel).
- LLM `mock` par défaut.

### Reste à faire (hors MVP, selon souhait de Vincent)

Tauri shell (`apps/desktop`) · brancher un vrai LLM · phases 2+ des specs (multi-room, correction, ComfyUI, OCR) — **explicitement hors MVP**.

---

## 2026-06-06 (suite) — Lancement & corrections du rendu PoC

**Contexte.** Lancement effectif : backend (`:8000`) + PoC Vite (`:5173`) exposés sur le tailnet (`vite --host 0.0.0.0`), accès `http://100.100.128.63:5173` (le PoC proxifie REST `/api` + WS `/ws` vers le backend local → un seul port à partager). Démo testée **en conditions réelles** avec Vincent (navigateur sur Mac). Une chaîne de bugs d'intégration du PoC, invisibles à la compilation, a été trouvée et corrigée en run.

### Bugs trouvés & corrigés (PoC frontend)

1. **CSS désynchronisé.** `styles.css` ciblait d'anciennes classes (`.mf-canvas`/`.mf-harness`/`.mf-panel`) absentes du DOM réel d'`App.tsx` → aucune mise en page, canvas à 0 px → écran noir. **Fix :** `styles.css` réécrit pour le vrai arbre (`.screen--room`, `.room-overlay`, `.speaker-banner`, `.blend-control`, `.chat*`) + canvas plein écran (`position:fixed`).

2. **Shader WebGL — `fwidth()` sans extension.** Le fragment shader appelait `fwidth()` sans déclarer `GL_OES_standard_derivatives` → rejeté par les compilateurs GLSL stricts. **Fix :** anti-aliasing recalculé depuis `u_resolution` (1 px ≈ `1/min(res)`), retrait de `#version 100`, `highp`→`mediump` (compat max).

3. **StrictMode + `loseContext` (cause racine du « log vide / inconnue »).** Le cleanup appelait `WEBGL_lose_context.loseContext()`. Or `canvas.getContext('webgl')` rend toujours le **même** contexte ; sous React StrictMode (double montage en dev), le remontage récupérait un contexte **détruit** → compilation impossible, info-log vide. **Fix :** plus de `loseContext` au cleanup (le GC libère le contexte) ; `display:block` + reset d'erreur à chaque montage.

4. **Dégradation propre.** Si WebGL indisponible/échoue : canvas masqué + **fond CSS dégradé** (halos vert ProfKrapu / violet Corrector) au lieu de noir, et **bandeau d'erreur visible à l'écran** (diagnostic sans console). Un disjoncteur localStorage a été testé puis **retiré** (bloquait à tort une fois le shader réparé).

5. **Bruit console.** Favicon inline (`<link rel="icon" href="data:,">`) → fin du 404. Warning CSP `eval` identifié comme **externe** (extension navigateur) : aucun header CSP côté serveur, aucun `eval` dans le PoC.

### Vérifs
`tsc --noEmit` PoC : 0 erreur. Backend `/health` vert via Tailscale. Login godmode + modules (shader) servis OK via le proxy.

### Note exploitation
Lancement du backend = **human in the loop** (Vincent). Backend bind `*:8000`, Vite `--host 0.0.0.0`.

---

## 2026-06-13 — CTX-1 a CTX-7 : fondations de contexte runtime (local, non pousse)

**Statut :** implementation locale terminee sur `codex/frontend-masterflow`. Aucun commit ni
push sans nouveau GO humain. Handoff detaille :
`CTX_RUNTIME_IMPLEMENTATION_HANDOFF_2026-06-13.md`.

### Construit

- `RuntimeContextEnvelope` T0-T5, compile au maximum en T2 par defaut, avec budget, provenance,
  refs chargees/rejetees, contexte manquant et incertitude.
- `user_runtime_loadout` derive de la Room, du role et des permissions. Actions/personas/modes
  absents du loadout absents de l'UI et du chat. Capacites futures visibles uniquement en
  diagnostic admin autorise.
- `room_checkpoints` prives, bornes a 20 par instance. Sauvegarde explicite et auto-checkpoint
  uniquement lors d'un changement de mode significatif.
- RAG ancre a `purpose`, `room_instance_id`, tier et strategie de retrieval. Le fallback lexical
  est declare ; les packs restent derives, cites, expirables et invalidables.
- WebSocket : speaker limite au loadout, prompt borne a 8 000 caracteres, citations et
  incertitudes injectees, aucune permission ou execution accordee au LLM.
- Persona fallback canonique `masterflow-system-001`; MasterFlex n'est plus le fallback global.
- Cartes memoire L2 candidates, promotion humaine explicite en L3, invalidation et isolation
  private/project. Aucun chat brut sauvegarde automatiquement.
- Frontend branche sur `GET /context/current` filtre : context card, tier, sources, reprise,
  incertitude et modes/actions issus du loadout. Suppression du bootstrap par catalogues globaux.

### Validation locale

- `npm test` : **51 fichiers, 231/231 tests OK**.
- `npm run lint` : backend TypeScript OK.
- `npm run lint:frontend` : frontend TypeScript OK.
- `npm run build:frontend` : build Vite OK (warning de taille de chunk non bloquant).
- `git diff --check` : OK.

### Reste avant integration

- Relecture Vincent des migrations, contrats partages et gates de scope.
- Run reel backend + frontend : login, context/current, checkpoint, RAG, WS et carte memoire.
- Commit/push seulement apres GO MALEX et dernier check distant.
