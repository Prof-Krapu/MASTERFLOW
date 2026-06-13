# Audit du déploiement de contexte — Rooms, loadout, mémoire et personas

Date : 2026-06-13  
Sources : canon Drive MASTERFLOW + Git `Prof-Krapu/MASTERFLOW`

## Conclusion

Le canon décrit déjà une architecture cohérente de déploiement progressif du contexte. Le Git
possède plusieurs briques de stockage et de navigation, mais pas encore le compilateur qui les
relie.

Écart central :

```txt
room_instance stocké
!=
contexte runtime compilé, permissionné, cité et adapté à la tâche
```

Le RAG est une source dérivée pour ce compilateur. Il ne doit pas devenir le compilateur, la
mémoire autoritaire, le loadout utilisateur ou l'état de Room.

## Sources canon principales

- `02_CONTRACTS/SESSION_BOOTSTRAP_CONTEXT_PACK_AND_USER_LOADOUT_CONTRACT.md`
- `02_CONTRACTS/PROGRESSIVE_CONTEXT_LOADING_AND_ANTI_HALLUCINATION_POLICY.md`
- `02_CONTRACTS/LAST_CONTEXT_AND_RECENT_ACTIVITY_WIDGET_CONTRACT.md`
- `02_CONTRACTS/ROOM_STATE_OVERLAY_AND_CHECKPOINT_CONTRACT.md`
- `01_CORE/CONTEXT_LOADING_AND_INJECTION_SYSTEM.md`
- `03_APPS/MULTI_APP_CONTEXT_ROUTING.md`
- `07_UI/UI_CONTEXTUAL_SYSTEM.md`
- `02_CONTRACTS/ROOM_CONTEXT_CARD_AND_ACTION_BUTTONS_CONTRACT.md`
- `02_CONTRACTS/UNIVERSAL_ROOM_ZOOM_AND_WORK_LEVEL_CONTRACT.md`
- `02_CONTRACTS/USEFUL_CONTEXT_COMPILATION_AND_PERSISTENCE_CONTRACT.md`
- `02_CONTRACTS/MEMORY_CARD_COMPRESSION_AND_CONTEXT_PAYLOAD_STORAGE_CONTRACT.md`
- `02_CONTRACTS/MEMORY_MINIMIZATION_PERSISTENCE_AND_RESOURCE_LIFECYCLE_CONTRACT.md`
- `02_CONTRACTS/TEAMSPACE_AND_SHARED_CONTEXT_RUNTIME.md`
- `01_CORE/MASTERFLOW_CONTEXT_SYSTEM.md`
- `01_CORE/MASTERFLOW_RUNTIME_CONTEXT_ISOLATION.md`
- `01_CORE/MEMORY_RETRIEVAL_RUNTIME.md`
- `01_CORE/MEMORY_HIERARCHY_SYSTEM.md`
- `01_CORE/MEMORY_SCOPE_ARCHITECTURE.md`
- `04_ENGINES/INTER_PROJECT_MEMORY_ISOLATION_AND_CONTEXT_BRIDGING_POLICY.md`
- `04_ENGINES/SEMANTIC_RETRIEVAL_AND_CONTEXT_LINKING.md`
- `04_ENGINES/CONTEXTUAL_REASONING_RUNTIME.md`
- `04_ENGINES/TEAMSPACE_ENGINE.md`
- `01_CORE/PERSONA_CONTEXT_AND_BEHAVIOR_RUNTIME.md`
- `02_CONTRACTS/PERSONA_PERMISSION_FIREWALL_AND_ROLE_SCOPE_CONTRACT.md`
- `02_CONTRACTS/CONVERSATION_SURFACE_AND_SPEAKER_ROUTING_CONTRACT.md`
- `02_CONTRACTS/PROJECT_INTRO_TUNNEL_AND_PROGRESSIVE_ROOM_ACTIVATION_CONTRACT.md`

## Architecture canonique

### 1. Bootstrap de session

Au démarrage, charger uniquement :

- utilisateur, organisation, rôle et permissions;
- confidentialité et niveau maximal autorisé;
- préférences et support;
- référence du `user_runtime_loadout`;
- dernière Room et dernier projet accessibles;
- persona principal, blend autorisé et tonalité;
- widgets épinglés/masqués;
- références du dernier contexte, validations et boucles ouvertes.

Le bootstrap n'est ni un historique complet, ni une requête RAG globale.

### 2. Loadout utilisateur

Le `user_runtime_loadout` est dérivé des permissions, du registre de capabilities et du contexte
actif. Il expose seulement :

- apps et Rooms disponibles;
- personas et blends disponibles;
- actions, exports et actions d'assets autorisés;
- raccourcis, palette rapide et modes actifs;
- capabilities verrouillées avec une raison affichable.

Un mode absent du loadout n'existe pas pour l'utilisateur. Le frontend ne doit pas filtrer une
liste globale après coup.

### 3. Déploiement dans une Room

L'entrée dans une Room compile :

```txt
permissions et confidentialité
-> projet / scope
-> room_instance
-> dernier checkpoint significatif
-> surface et zoom
-> ressources autorisées
-> décisions, validations et boucles ouvertes utiles
-> context pack T1/T2
-> widgets, actions et personas
```

L'overlay de Room conserve l'état courant léger. Un checkpoint persiste seulement une étape
significative : décisions, références, queue, boucles ouvertes et prochaine action.

L'activation de la Room dépend aussi de la maturité du projet. Une Room dormante n'est pas
simplement masquée par le frontend : elle est absente du loadout actif tant que l'intention, les
ressources, les participants ou le stade de production ne la rendent pas utile.

### 4. Chargement progressif

Le canon prévoit les niveaux :

- `T0` : intention de la requête;
- `T1` : scope actif et état minimal;
- `T2` : contexte local de la Room ou de l'artefact;
- `T3` : éléments liés;
- `T4` : références canon utiles;
- `T5` : archives, seulement sur besoin explicite.

Chaque élargissement doit enregistrer la raison, les sources chargées/rejetées, le contexte
manquant et l'incertitude visible. Aucun scan complet du Drive ou de la mémoire n'est autorisé
par défaut.

### 5. Transition et reprise

Un passage entre apps ou Rooms transmet des références minimales :

- acteur et permissions;
- projet et Room source/cible;
- artefact ou tâche active;
- décisions et boucles ouvertes utiles;
- signaux, widgets et personas autorisés;
- checkpoint de reprise.

Le widget de reprise synthétise au maximum quelques éléments récents et trois prochaines
actions. Il ne rejoue pas toute la conversation.

Un bridge entre projets ou scopes doit être un objet explicite, validé et observable. La
similarité sémantique ou la présence dans un même teamspace ne suffit jamais à autoriser le
transfert.

### 6. Injection dans les personas et modèles

Le modèle reçoit un `runtime_context_envelope` déjà filtré :

- identité du speaker et méthode;
- objectif et contexte local;
- sources citées;
- faits autoritaires séparés des éléments dérivés;
- contexte manquant et incertitude;
- actions autorisées;
- limite de tier et budget de contexte.

Une persona ne reçoit jamais automatiquement toutes les ressources accessibles à l'utilisateur.
Le contexte partagé par plusieurs personas est compilé une fois, puis chaque persona reçoit la
vue compatible avec ses permissions et sa fonction.

Le routage sépare également les surfaces : chat principal, fenêtre persona, microcopie widget,
éditeur narratif, alerte système et drawer de diagnostic. Le compilateur choisit le contenu et
la surface; il ne déverse pas tous les messages dans le chat.

### 7. Compilation pour les moteurs et sorties

Le même système compile les payloads destinés aux engines, exports, queues et API :

```txt
intention
-> owner du pipeline
-> sources et canon utiles
-> contraintes / interdits
-> permissions et preflight
-> protocole de sortie
-> save policy
```

Le contexte utile peut être inclus, résumé ou transmis par référence. Une génération ne doit
pas recevoir toute la conversation, et ne doit pas démarrer si les champs obligatoires manquent.

### 8. Compression et cycle de vie

Le canon distingue :

```txt
L0 source brute
-> L1 extrait cité
-> L2 memory card structurée
-> L3 règle active validée
-> L4 canon verrouillé
```

Une carte mémoire durable porte owner, scope, source, confiance, confidentialité, statut et
règle d'invalidation. Le brut reste hors contexte actif par défaut.

## Propriétaires de vérité

| Élément | Propriétaire |
|---|---|
| identité, rôle, permissions | auth + permission runtime |
| capabilities disponibles | capability registry + permission runtime |
| loadout effectif | loadout resolver |
| état courant de Room | `room_instance` |
| étape significative reprise | `room_checkpoint` |
| vérité métier | engine ou registre de l'app concernée |
| ressource et ownership | Resource Truth |
| recherche dérivée | RAG |
| résumé compressé | memory card avec références source |
| état canon narratif | registre MasterStory |
| bridge inter-projets | bridge explicite + validation + audit |
| contexte partagé | Teamspace Engine, sans fusion d'ownership |
| surface de conversation | speaker/surface router |
| payload moteur/API | owner du pipeline + useful context compiler |

Ni le frontend, ni le prompt, ni le vector store ne deviennent propriétaires de ces vérités.

## Contrats backend à ajouter

### `SessionBootstrapContextPack`

Références minimales de session, permissions, dernière Room/projet, préférences, loadout,
persona et reprise. Aucune donnée sensible brute inutile.

### `UserRuntimeLoadout`

Apps, Rooms, personas, actions, modes et exports réellement disponibles, avec motif de
verrouillage pour les surfaces administratives autorisées.

### `ProgressiveContextLoad`

Purpose, tier demandé/accordé, références chargées/rejetées, raisons, éléments manquants,
incertitude, citations et invalidation.

### `RoomCheckpoint`

Room, projet, surface, zoom, artefact actif, décisions, validations, boucles ouvertes, queue,
références ressources et prochaine action.

### `RuntimeContextEnvelope`

Paquet final injecté dans l'UI ou le modèle : actor, scope, loadout, Room, checkpoint,
faits autoritaires, contexte dérivé cité, permissions d'action et limites.

Les contrats doivent transporter des identifiants et références stables plutôt que recopier des
payloads sensibles ou volumineux.

### `ContextBridge`

Source, cible, objets autorisés, raison, validation, durée, permissions et trace d'audit. Aucun
bridge implicite entre projets, classes, clients ou organisations.

### `CompiledPipelinePayload`

Owner du pipeline, intention, sources, canon, contraintes, interdits, permissions, preflight,
sortie attendue, fallback et politique de sauvegarde.

## État Git réel

### Déjà disponible

- `room_instances` avec zoom, surface active, densité et `widget_state`;
- résolution d'une Room personnelle ou publique;
- personas, blends, registre de capabilities et seeds Room/UI;
- Project/Scope, membership, Resource Truth et permissions;
- RAG permissionné avec ressources, chunks, citations et context packs;
- WebSocket de conversation avec sélection du speaker;
- préférences frontend et premiers widgets de reprise/navigation.

### Écarts majeurs

- `GET /context/current` renvoie encore des listes globales de personas et registre, pas un
  loadout compilé;
- aucun `session_bootstrap_context_pack`;
- aucun resolver de loadout par acteur, projet, Room et permission;
- aucun tier `T0-T5`, ni journal des sources chargées/rejetées;
- aucun `room_checkpoint` significatif;
- aucun compilateur de contexte ou système de provenance;
- les context packs RAG ne sont pas encore liés à une Room, un purpose et un tier;
- le WebSocket injecte surtout la voix/méthode de la persona, sans contexte Room/projet/RAG
  compilé et cité;
- les transitions multi-apps ne transmettent pas encore un envelope minimal;
- aucun modèle explicite de bridge inter-projets ou d'isolation de contexte;
- aucun runtime Teamspace ne compile encore la vue partagée sans fusionner ownership et mémoire;
- l'activation des Rooms ne dépend pas encore réellement de la maturité du projet;
- le routage chat/persona/widget/diagnostic n'est pas encore porté par le contexte compilé;
- le compilateur de payload utile pour engines, exports, queues et API n'est pas un service
  transversal;
- la hiérarchie L0-L4 et les memory cards invalidables ne sont pas encore reliées au runtime;
- la reprise locale frontend n'est pas une mémoire runtime autoritaire;
- l'incertitude et le contexte manquant ne sont pas exposés.

## Plan de PRs courtes

### PR-CTX-1 — Contrats et compilateur minimal

- ajouter les schémas partagés;
- créer un `context_compiler` sans dépendre de BGE;
- compiler T1/T2 depuis permissions, projet, Room et références métier;
- tests de fuite, scope et budget.

### PR-CTX-2 — Loadout resolver

- dériver apps, Rooms, personas et actions;
- supprimer les listes globales du contexte utilisateur;
- conserver les locked capabilities seulement pour les rôles autorisés;
- tester l'absence réelle d'un mode hors loadout.

### PR-CTX-3 — Checkpoints et reprise

- table et service `room_checkpoints`;
- création sur mutation significative, pas sur chaque clic;
- dernier contexte, boucles ouvertes et prochaine action;
- politique de rétention et confidentialité.

### PR-CTX-4 — RAG lié au contexte

- ajouter `purpose`, `room_instance_id`, `project_id`, tier et provenance;
- distinguer faits autoritaires et résultats dérivés;
- invalider les packs quand une source ou permission change;
- conserver le fallback lexical.

### PR-CTX-5 — Injection conversationnelle

- injecter le `RuntimeContextEnvelope` borné dans le WebSocket;
- citations et incertitude visibles;
- aucun pouvoir d'action supplémentaire donné au modèle;
- tests anti-fuite entre utilisateurs, projets et Rooms.

### PR-CTX-6 — Transitions multi-apps

- contrat de transition minimal;
- reprise d'artefact/tâche sans recopier tout l'historique;
- isolation des contextes personnel, équipe, classe et public.
- bridges inter-projets explicites, temporaires et audités.

### PR-CTX-7 — Mémoire compressée et payloads

- memory cards L2 avec source, scope, confiance et invalidation;
- compilation utile pour engines, exports, queues et API;
- politique include/summarize/reference-only;
- aucun raw conversationnel injecté par défaut.

### PR-CTX-8 — Teamspaces et surfaces

- contexte partagé sans fusion d'ownership;
- activation des Rooms selon maturité et collaboration;
- speaker routing vers chat, persona, widget, alerte ou diagnostic;
- tests d'isolation classe/projet/org.

### PR-CTX-9 — UI de contexte

- sources et tier visibles;
- action explicite pour élargir le contexte;
- widget de reprise;
- raisons de verrouillage et contexte manquant;
- aucune logique de permission locale.

### PR-CTX-10 — Observabilité

- traces de compilation sans contenu privé;
- hash du pack, sources, tiers, durée et invalidation;
- diagnostic privé owner/godmode;
- métriques de taille, pertinence, élargissements, bridges et contaminations rejetées.

## Articulation avec BGE/Qdrant

BGE/Qdrant peut avancer en parallèle comme infrastructure de recherche si son adapter reste
générique et permissionné. Il ne doit pas figer la sémantique des Rooms ou du contexte.

Ordre produit recommandé :

```txt
PR-CTX-1 contrats + compilateur minimal
-> PR-CTX-2 loadout
-> PR-CTX-3 checkpoints
-> PR-CTX-4 raccord RAG
-> PR-CTX-5 injection conversationnelle
-> transitions et bridges
-> mémoire/payloads
-> teamspaces/surfaces
-> UI et observabilité
```

Le runner vectoriel peut être branché dès que PR-CTX-1 fixe les références, purposes et règles
de provenance. Cela évite d'indexer vite un contexte mal défini.

## Prochaine action

Commencer par PR-CTX-1. C'est le pont manquant entre l'architecture canonique et les briques déjà
présentes dans le Git. Cette PR ne demande ni UI finale, ni modèle local opérationnel.
