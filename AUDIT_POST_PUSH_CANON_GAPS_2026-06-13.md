# Audit post-push — briques manquantes et raccords canon

Date : 2026-06-13  
Git audité : `c7c2426`, complété par la lecture de `origin/main` à `141ab68`  
Canon : Drive MASTERFLOW

## Verdict

Les derniers pushes ont réellement fait progresser le runtime :

- Project/Scope et partage de ressources;
- jobs, leases, runners et observabilité;
- RAG permissionné;
- Guided Runtime privé;
- fondations correction, calibration, feedback et export;
- invitations, rôles et diagnostics;
- premières surfaces frontend réelles.

L'ancien audit du 12 juin est donc trop pessimiste sur ces familles. Elles ne sont plus
`ABSENT`, mais `PARTIAL` ou `SHELL`.

En revanche, l'intégration a laissé plusieurs raccords transversaux ouverts. Les plus urgents ne
sont pas de nouvelles features : ce sont des gates nécessaires pour que les briques déjà
livrées respectent le canon.

## Références canon

- `01_CORE/PERMISSION_RUNTIME_GUARDRAILS.md`
- `01_CORE/PERMISSION_AND_ACCESS_GOVERNANCE_SYSTEM.md`
- `01_CORE/MASTERFLOW_RUNTIME_CONTEXT_ISOLATION.md`
- `01_CORE/MEMORY_RETRIEVAL_RUNTIME.md`
- `02_CONTRACTS/RUNTIME_ACCESS_CONTROL_AND_SYSTEM_PERMISSION_MATRIX.md`
- `02_CONTRACTS/PERSONA_PERMISSION_FIREWALL_AND_ROLE_SCOPE_CONTRACT.md`
- `02_CONTRACTS/SESSION_BOOTSTRAP_CONTEXT_PACK_AND_USER_LOADOUT_CONTRACT.md`
- `02_CONTRACTS/RESOURCE_TRUTH_LOCK_AND_CANONICAL_ROUTING_CONTRACT.md`
- `02_CONTRACTS/ACTION_PREFLIGHT_DECISION_LOG_AND_VALIDATION_INBOX_CONTRACT.md`
- `02_CONTRACTS/PROJECT_INTRO_TUNNEL_AND_PROGRESSIVE_ROOM_ACTIVATION_CONTRACT.md`
- `02_CONTRACTS/PRIVACY_PUBLIC_POLICY_AND_MULTI_USER_DATA_GOVERNANCE_CONTRACT.md`
- `02_CONTRACTS/TOOL_CALL_MANAGEMENT_AND_LLM_INTERFACE_CONTRACT.md`
- `08_DATASETS/DATASET_ACCESS_MATRIX.md`
- `01_CORE/RECETTE_PR6_GUIDED_RUNTIME_DEPENDENCIES.md`

## P0 — À corriger avant nouvelle verticale

### 1. Les rôles JWT peuvent rester valides après une rétrogradation

`requireUser` fait confiance au rôle contenu dans le JWT. Il ne recharge ni le rôle actuel, ni
le statut `active` du compte. Un admin rétrogradé ou désactivé peut donc conserver ses droits
jusqu'à expiration de son token.

Le WebSocket utilise directement `verifyToken`, sans consulter la révocation.

Conséquences :

- une rétrogradation `set_user_role` n'est pas immédiatement effective;
- un compte désactivé peut conserver une session existante;
- un token révoqué au logout peut encore ouvrir un WebSocket;
- le rôle effectif REST et WS peut diverger.

Correction :

- créer un resolver unique `authenticateToken()` qui vérifie signature, révocation, utilisateur
  actif et rôle courant en BDD;
- l'utiliser pour REST et WS;
- invalider les sessions lors d'un changement de rôle ou d'une désactivation;
- ajouter des tests rétrogradation, désactivation, logout puis reconnexion WS.

### 2. Les Rooms et le WebSocket ne sont pas isolés par scope

Les routes Rooms listent toutes les Rooms et permettent à tout utilisateur authentifié de lire
une Room, puis de créer sa propre instance dessus, sans vérifier `owner_id`, `is_public`, projet
ou membership.

Le WebSocket vérifie le JWT mais pas que `room_instance.user_id === token.sub`, ni que la Room est
encore accessible.

Conséquences :

- découverte de Rooms privées;
- création d'instances sur une Room hors scope;
- utilisation d'un identifiant d'instance appartenant à un autre utilisateur;
- speaker/persona et état de Room lus hors isolation attendue.

Correction :

- ajouter un `room_access_resolver`;
- filtrer liste, détail, instance et mutation;
- vérifier l'ownership exact de l'instance au handshake WS;
- rattacher les Rooms projet à Project/Scope;
- tests croisés user A/user B, Room privée/publique/projet.

### 3. Le cycle d'action n'est pas borné par owner, scope et statut runtime

Les services chargent les actions par identifiant sans vérifier le créateur. L'inbox pending est
globale et expose les payloads à tous les teachers. Preflight et execute ne vérifient pas que
l'acteur possède ou peut gérer l'action.

Le permission runtime autorise actuellement toute action authentifiée. Il ne bloque pas les
entrées `future` ou `out_of_scope`.

Enfin, une action sans exécuteur réel est marquée `completed` avec un résultat simulé.

Conséquences :

- lecture ou mutation possible d'une action d'un autre utilisateur;
- exposition de payloads cross-project;
- une action future/hors scope peut finir en faux succès backend;
- divergence avec `mode absent du loadout = inexistant`.

Correction :

- persister/exposer `user_id`, `project_id` et scope de l'action;
- séparer `can_read`, `can_validate` et `can_execute`;
- filtrer l'inbox par rôle validateur et scope;
- refuser preflight/execute si registry status différent de `live`;
- refuser l'exécution sans executor, avec `not_implemented`, au lieu de simuler un succès.

### 4. Resource Truth est contournable depuis les ressources projet

`GET /projects/:id/resources` renvoie toutes les ressources attachées, quel que soit leur statut.
`attachResourceScope` accepte aussi une candidate ou une ressource dépréciée.

Le RAG projet peut enregistrer une ressource par identifiant sans exiger qu'elle soit déjà
attachée au projet ni vérifier un ownership/source scope.

Conséquences :

- une candidate peut être affichée comme ressource partagée;
- un statut déprécié peut continuer à circuler;
- un editor peut rattacher au RAG projet une ressource hors graphe de partage attendu.

Correction :

- filtrer `validated` par défaut dans les vues projet;
- réserver candidates/deprecated aux surfaces de review autorisées;
- exiger Resource Truth + `resource_scope` avant index RAG projet;
- synchroniser revoke/deprecate avec scopes, packs et UI.

## P1 — À fermer avant MOTH, cours ou déploiement public

### 5. Une Guided Session n'est pas réellement figée sur sa version

La session stocke `guide_version`, mais le recalcul recharge le guide courant par `guide_id`.
Comme un guide `draft` peut encore être modifié, une session déjà commencée peut changer de
questions, de progression ou de record cible.

Il n'existe pas non plus de route de validation du guide. Une session peut être créée depuis un
guide draft et un template candidate.

Correction :

- créer une révision immuable ou un snapshot de guide;
- exiger guide et template `validated` pour une session normale;
- réserver le mode draft à une preview owner explicite;
- interdire mutation d'une révision déjà utilisée.

Attention de synchronisation : `MAPPING_CANON_PROJECT_SCOPE_TEMPLATES.md`, ajouté sur
`origin/main` à `141ab68`, présente PR-6 comme un exemple de freeze déjà câblé. Le schéma stocke
bien `guide_version`, mais le comportement runtime n'utilise pas cette version pour relire un
snapshot : `refreshSessionState` et `submitGuidedAnswer` chargent encore le guide courant par
`guide_id`. Le mapping doit donc distinguer `référence de version stockée` et `révision réellement
immuable/rejouable`.

### 6. Le record Guided Runtime n'est pas validé par son schéma

Les réponses sont de type `unknown`. Le runtime vérifie que le champ cible existe, mais pas :

- le type de réponse;
- les options autorisées;
- les règles du JSON Schema;
- les `completion_rules`;
- la politique de consentement.

Une session peut donc être `completed` dès que les champs requis sont présents, même avec des
valeurs invalides.

Correction :

- compiler le template avec un validateur JSON Schema;
- valider chaque contribution et le record final;
- appliquer `kind`, options et completion rules;
- produire erreurs de champ lisibles et contradictions séparées.

### 7. Participants et consentements Guided Runtime sont incomplets

Le service sait ajouter un participant, mais aucune route ne l'expose. Le owner est ajouté avec
`consent_json = {}` même si `consent_policy.required = true`.

Les champs guest existent alors que l'accès reste privé et qu'aucun token d'invitation de
session n'est implémenté.

Correction :

- route participant authentifié, gated par Project/Scope;
- consentement explicite et versionné avant contribution;
- ne pas activer guest/public avant rate limit, anti-abus, privacy et expiration;
- journal d'accès et révocation participant.

### 8. Lire un job permet actuellement de l'annuler ou le relancer

`cancelJob` et `retryJob` utilisent seulement `getJob`. Un editor autorisé à lire un job projet
peut donc aussi annuler ou relancer le job d'un autre owner.

Correction :

- séparer `canReadJob` et `canManageJob`;
- owner ou rôle projet explicitement autorisé pour cancel/retry;
- supervision admin tracée comme override;
- interdire l'annulation d'un job sensible sans règle dédiée.

### 9. L'ownership projet peut diverger

Le projet a un `owner_id` unique mais la table de memberships autorise plusieurs rôles `owner`.
Une promotion en owner ne met pas à jour `projects.owner_id` et aucun transfert atomique
d'ownership n'existe.

Correction :

- choisir owner unique ou co-owners explicites;
- si owner unique, créer un workflow de transfert atomique;
- empêcher l'upsert direct du rôle owner;
- gérer suppression/départ/dernier owner.

### 10. L'inscription sur invitation manque encore de clôture opérationnelle

Le code est consommé avant le hash du mot de passe et l'insertion utilisateur. Une erreur
ultérieure peut donc brûler un usage sans compte créé. Le code brut est aussi écrit dans
l'audit d'inscription.

Correction :

- transaction englobant consommation et création du compte;
- ne jamais journaliser le code brut;
- envisager stockage hashé des codes;
- rate limiting sur login/register et rotation des secrets d'invitation.

## P2 — Fondations encore annoncées mais non raccordées

- `context_compiler`, bootstrap, loadout et checkpoints;
- historique conversationnel et memory cards;
- capability registry réellement filtré par rôle/scope;
- migration versionnée avec rollback/backup;
- Sentinel d'ingestion et tool gateway;
- event bus interne et notification inbox;
- assets/manifests génériques;
- output previews génériques hors correction;
- organisations/classes/teamspaces;
- CI, SLO, health des runners et procédures de restauration.

Ces éléments restent importants, mais ne doivent pas masquer les P0/P1 ci-dessus.

## Tests manquants

Ajouter en priorité :

1. rôle JWT rétrogradé/désactivé;
2. token révoqué sur handshake WS;
3. Room et room instance cross-user;
4. action cross-user et statut future/out_of_scope;
5. ressource candidate dans un projet;
6. guide modifié après création d'une session;
7. contribution invalide contre le template;
8. consentement requis;
9. editor lecteur qui tente cancel/retry;
10. transfert d'ownership projet.

La recherche dans `apps/backend/tests` ne montre pas de couverture actuelle pour ces scénarios.

## Ordre de PR recommandé

```txt
PR-HARD-1 auth effective + WS auth
-> PR-HARD-2 Room access resolver + WS room ownership
-> PR-HARD-3 action ownership/status/executor gates
-> PR-HARD-4 Resource Truth projet/RAG
-> PR-HARD-5 Guided Runtime version/schema/consent
-> PR-HARD-6 job mutation permissions
-> PR-HARD-7 project ownership transfer
-> PR-CTX-1 context compiler
```

Les quatre premières PRs sont courtes et protègent immédiatement tout ce qui vient d'être
livré. Elles doivent précéder BGE/Qdrant côté produit, même si le runner vectoriel peut continuer
en parallèle sur sa branche.

## Dernier delta Vincent lu pendant l'audit

Le commit `141ab68` ajoute :

- un audit des écarts BGE/PR-7;
- un mapping Project/Scope/Templates;
- l'émission de `WorkflowEvent` sur claim, review, completion et échec des jobs;
- des tests d'observabilité associés.

Apport réel : PR-9 devient mieux raccordée au lifecycle jobs.

Ce delta ne corrige pas :

- auth effective et révocation WS;
- accès Rooms/instances;
- ownership/statut des actions;
- Resource Truth projet;
- version immuable, validation de schéma et consentement Guided Runtime;
- séparation read/manage des jobs.

Le nouveau raccord d'observabilité conserve par ailleurs `blocker_category = error` sur les
échecs. À surveiller avant production : une erreur libre ne doit pas devenir une catégorie de
diagnostic à cardinalité illimitée ou contenir une donnée sensible. Préférer un code borné et
garder le détail dans une trace protégée.

## État de synchronisation

```txt
local_branch: codex/frontend-masterflow
local_head: c7c2426
origin_main: 141ab68
delta_HEAD_origin_main: 0 2
```

Les deux commits distants ajoutent la réponse RAG coordination, les audits BGE/Templates et le
raccord d'observabilité workflow des jobs. Ils ont été lus depuis `origin/main`, sans pull ni
fusion locale.
