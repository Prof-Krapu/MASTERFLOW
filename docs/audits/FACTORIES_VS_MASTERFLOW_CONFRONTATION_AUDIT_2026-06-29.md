# Audit de confrontation — Factories Desktop vs Masterflow
**Date :** 2026-06-29
**Auteur :** Big Pickle
**Source :** `/Users/malex/Desktop/FACTORIES/` (22 factories + _MASTERFLOW_ROUTER + _KERNEL)
**Cible :** `apps/backend/` Masterflow + conventions CLAUDE.md + décisions de périmètre

---

## Résumé exécutif

Les 22 factories Desktop sont des **bots LLM autonomes** qui vivent hors du Git Masterflow.
Elles implémentent des patterns qui **mirent l'architecture Masterflow** (candidate→canon,
gates, extraction inbox, resource truth) mais sans aucune connexion runtime au backend.

**10 problèmes critiques** identifiés sur l'ensemble des factories. Le Router
(`_MASTERFLOW_ROUTER/`) est le seul composain bien conçu ; il est propre et suit le protocole.

**Aucune factory n'est prête à être importée dans Git.** C'est une décision d'architecture
délibérée (voir `00_README_ROUTER.md` : "Une Factory complète ne va pas dans Git").

---

## État des 22 factories

| Factory | Version | Problèmes | Prête à envoyer |
|---|---|---|---|
| OURS_DOR_FACTORY | V2.3 lean | **6 problèmes** : noms internes, doublon Manifest, blocs DA répétés, conflit numérotation, refs externes absentes, données morphologiques privées | **Non** (anonymisation) |
| OURS_DOR_BADGE_FACTORY | V1.2 lean | Non audité en détail | Vérifier |
| TALENTS_CREATIFS_BRIEF_INTAKE | V1.1 | Noms internes résiduels à vérifier (correction 003 en cours) | Presque |
| TALENTS_CREATIFS_GUIDE | V1.1 | Propre (déjà nettoyé par correction 002) | Oui |
| PROF_KRAPU_FACTORY | V2.2 SAFE | Fichier `04_VISUAL_REFERENCE_INDEX.md` quasi vide | Oui |
| NICOK_FACTORY | V2.2 SAFE | PROFILE_NICO.md expose prénom réel | Presque (anonymiser profil) |
| BATRASIA | V1 | Artefacts addendum MasterFlow hérités dans ARCHIVE | Oui |
| MASTERINVENTORY | V1 | **Bloc DA Orchestrator dans les instructions GPT** (hors-sujet) | **Non** |
| MASTERSCORE | V1 rebuild | **SCOPE_LOCK.md et BOOT_CONTEXT_INTAKE.md copiés de MASTERCLASS** (décrivent le mauvais produit) + PROFILES en placeholders | **Non** |
| LEARNING_MIRROR | V1 fusion | Noms "Malex/Vincent" dans BOOT_CONTEXT, perte modules chimie orga et troll lexique, pas d'instructions déploiement Gemini | **Non** |
| MASTERFLEX_COACH | V1 | Artefacts déploiement dupliqués (`03_KNOWLEDGE_FILES/`, `_DEPLOYMENT/`), JSON ~16K lignes | Presque |
| STAND_UP | V1 rebuild | Non audité | Vérifier |
| ROADTRIP_MOTO | V1 Copilot | Non audité | Vérifier |
| GESTION_PROJET | Kit Claude | Usage Harvester (apprentissage contexte) | Vérifier |
| REDACTION_SEO | Kit Claude | Usage Harvester | Vérifier |
| ESPRIMED_LEARNING | Phase 1 | En attente diagnostic | Vérifier |
| ISCOM_JPO | V2.2 strict | Non audité | Vérifier |
| MASTERCLASS | V1 migrée | Non audité | Vérifier |
| HELPLAB | V1 migrée | Non audité | Vérifier |

---

## Problèmes critiques

### C1 — MASTERSCORE : contamination SCOPE_LOCK + BOOT_CONTEXT (COPY-PASTE)

**Fichiers :** `MASTERSCORE/CURRENT/MASTERSCORE_V1/SCOPE_LOCK.md` et
`MASTERSCORE/CURRENT/MASTERSCORE_V1/BOOT_CONTEXT_INTAKE.md`

**Problème :** Ces deux fichiers décrivent une factory d'**évaluation pédagogique**
(grilles de correction, notes, relevés, copies, QCM, examens). MASTERSCORE est un
**moteur de rivalité Street Fighter 6** (screenshots → score → domination → trash-talk).

**Impact :** Un déploiement naïf produirait un bot qui demande à noter des copies
au lieu de traiter des screenshots SF6. Le bot est cassé dès le boot.

**Origine probable :** Copier-coller depuis MASTERCLASS ou une factory d'évaluation similaire.

### C2 — OURS_DOR : noms internes exposés (privacy)

**Fichiers :** 6 fichiers dont `PROFILES/PROFILE_MALEX.md`, les instructions GPT,
et 4 fichiers Knowledge.

**Exposition :** "Malex/Alex/le créateur" présent dans les contenus livrés à un GPT Custom.
Données morphologiques privées (tête, museau, casquette) dans le Knowledge.

**Violation :** GO_INBOX_NOW.md : "Aucun nom propre interne dans les packs actifs,
y compris Alexandre/MALEX." CLAUDE.md : "Ne pas exposer les coulisses."

### C3 — Noms internes dans LEARNING_MIRROR + NICOK

**LEARNING_MIRROR :** `BOOT_CONTEXT_INTAKE.md` demande "Quel est votre profil actif ?
Malex / Vincent / À détecter automatiquement" — noms exposés dans le prompt de boot.

**NICOK :** `PROFILES/PROFILE_NICO.md` expose le prénom réel "Nico/Nini".

### C4 — Duplication de contenu intra/inter fichiers

**OURS_DOR :**
- `MANIFEST.md` et `02_MANIFEST.md` sont strictement identiques (gaspille un slot GPT)
- Bloc `MASTERFLOW_DA_ORCHESTRATION_V5_BEGIN...END` répété 2-3× dans les mêmes fichiers
  (`02_MASTERFLEX_CANON`, `01_MASTERFLOW_CORE`, `03_OUTPUTS`, `04_ROLES_MONSTERS`)

**MASTERFLEX_COACH :**
- `03_KNOWLEDGE_FILES/` contient un fichier qui semble dupliquer `12_CONTEXT_PAYLOAD...`
- `_DEPLOYMENT/GPT_CUSTOM_READY/UPLOAD_KNOWLEDGE/` duplicata supplémentaire

### C5 — Artefacts MasterFlow hérités non nettoyés

**MASTERINVENTORY :** Le fichier `01_COLLER_DANS_INSTRUCTIONS_GPT.md` contient
un bloc complet `MASTERFLOW_DA_ORCHESTRATION_V5_BEGIN...END` qui décrit le pipeline
DA global. C'est un artefact de migration legacy qui n'a rien à faire dans les
instructions d'un assistant inventaire OCR. Il pollue le comportement du bot.

**BATRASIA :** Les mêmes blocs DA Final, Graphic Refinement V2, Visual Pedagogy,
Post-Generation DA Report sont présents dans l'archive (moins grave mais signale
un nettoyage incomplet).

### C6 — Conflit de numérotation (OURS_DOR)

`09_EXTRACTION_INBOX.md` et `09_DA_COMPONENTS_FILTERS_GAUGES_AND_ASSETS.md`
portent le même préfixe `09_`. Il manque `05_`, `06_` (archivés).

### C7 — PROFILES non remplis (MASTERSCORE)

`PROFILE_MALEX.md` et `PROFILE_VINCENT.md` sont des placeholders `[a compléter]`
partout. Si le pack est déployé tel quel, le bot n'aura aucun profil utilisateur.

### C8 — Références à des fichiers externes absents du pack (OURS_DOR)

Plusieurs Knowledge files référencent des chemins MasterFlow qui n'existent pas
dans le pack GPT. Exemple : `03_OUTPUTS` référence `12_GRAPHIC_PREFERENCE_MEMORY...`,
`06_LORE_ROLE_CLASSES...`, `11_PLATFORM_SOCIAL_VIDEO...` — ces fichiers ont été
fusionnés mais les références restent, pouvant induire le modèle en erreur.

### C9 — Perte fonctionnelle dans la fusion LEARNING_MIRROR

La fusion MASTERLEARN + KRAPULEARN a sacrifié :
- `04_ORGANIC_CHEMISTRY_SIMULATION_PEDAGOGY.md` (module spécialisé chimie orga Vincent)
- `05_TROLL_STRATEGY_LEXICON.md` (lexique Street Fighter / StarCraft)
- `04_OUTPUT_MODES_AND_COMMANDS.md` (détail des commandes MASTERLEARN)

L'utilisateur Vincent perd des capacités fonctionnelles.

### C10 — Mix linguistique (OURS_DOR)

`07_REFERENCE_STATUS_AND_VISUAL_BOARD_INDEX.md` entièrement en anglais.
`08_NARRATIVE_IMAGE_AND_VISUAL_REVIEW.md` bilingue. Les instructions GPT sont en
français. Cohérence linguistique non maintenue.

---

## Confrontation avec l'architecture Masterflow

### Patterns communs (factories mirent Masterflow)

| Pattern Factory | Équivalent Masterflow | Note |
|---|---|---|
| candidate → validated | `resource_truth` status | Pattern commun, les factories l'ont adopté avant que Masterflow ne le code |
| Source Truth + Gates | `seeds/actions.json` + `permission_runtime` | Les gates factories sont textuelles (prompt), Masterflow les a en code + DB |
| Extraction inbox | `audit_logs` + `action_engine` cycle | Les factories proposent, Masterflow trace |
| SCOPE_LOCK scope | `PERMISSION > CONTEXT_LOCK > SAFETY > ...` | Même hiérarchie |
| BOOT_CONTEXT intak | `context_engine` | Les factories font du pré-flight conversationnel |
| PROFILES | `user_runtime_loadout` | Découpage conceptuel similaire |
| MANIFEST.md | `seeds/actions.json` | Registre de capacités |
| DA report post-generation | `action_engine` status `completed` | Même concept de reçu d'exécution |
| GO IMAGE gate strict | `preflight` avant action sensible | Même pattern de validation avant exécution |

### Ce que les factories ont que Masterflow n'a pas (primitives candidates)

| Primitive | Factory source | Potentiel Masterflow |
|---|---|---|
| **Identity Protection (9 couches)** | MASTERSCORE `05_IDENTITY_PROTECTION.md` | Modèle de consent tracking pour Avatar Swap |
| **Multi-brief tracking** | TALENTS_CREATIFS `MULTI_BRIEF_TRACKING_RULES.md` | Gestion de multiples objects dans une Room |
| **Boot context diagnostics** | Toutes les factories | Pattern UI onboarding pour Masterflow |
| **Usage harvester** | GESTION_PROJET, REDACTION_SEO | Backflow analytics pour D11/D12 |
| **Learning gauges** | LEARNING_MIRROR `08_CONSOLE_AND_GAUGES.md` | Dashboard compétences étudiant |
| **Subject pack schema** | TALENTS_CREATIFS `subject_pedago.schema.json` | Schema de ressource pédagogique pour Pedago Core |
| **Extraction protocol (détection douce)** | `_KERNEL/09_EXTRACTION_INBOX.md` | Modèle de feedback non-intrusif |

### Ce que Masterflow a que les factories n'ont pas

| Capacité Masterflow | Équivalent Factory manquant |
|---|---|
| **Exécution runtime réelle** | Les factories ne font que proposer du texte, pas exécuter |
| **Base de données persistante** | Les factories n'ont que le contexte LLM (éphémère) |
| **Validation humaine tracée** | `action_engine` cycle avec audit trail |
| **Permissions par rôle** | Les factories ont des gates textuelles, pas de RBAC |
| **WebSocket streaming** | Les factories sont chat-only, pas de streaming structuré |
| **Tests automatisés** | Les factories ont des tests manuels (prompts) |
| **Contrats partagés TypeScript** | Pas de typage, tout est en markdown |
| **API REST** | Pas d'API, tout est conversationnel |

---

## Problèmes structurels transverses

### 1. Pas de standard de versioning unifié

Chaque factory a son propre format de version :
- `2026.06.24-v2.3-visual-board-lean` (OURS_DOR)
- `V2.2 SAFE` (PROF_KRAPU, NICOK)
- `V1 rebuild 2026.06.25` (STAND_UP, MASTERSCORE)
- `V1 -- legacy MasterFlow` (MASTERINVENTORY)

Pas de `semver`, pas de changelog standard, pas de correspondance avec les versions
Git Masterflow.

### 2. Pas de gate CI/CD

Aucune factory n'est testée automatiquement. Les tests sont des fichiers .md
à exécuter manuellement. Rien ne vérifie qu'un pack est cohérent avant déploiement.

### 3. L'écart se creuse entre Factory et Masterflow

Le Router (`_MASTERFLOW_ROUTER/`) est bien conçu mais n'est alimenté que par
3 décisions de routage. Les 22 factories continuent d'évoluer sans synchronisation
avec le backend Masterflow. Les patterns que les factories ont inventés
(candidate→canon, gates, extraction) sont maintenant codés dans Masterflow,
mais les factories ne le savent pas.

### 4. Hygiène des données

- Noms réels dans les packs (Malex, Alex, Nico, Nini, Vincent)
- Données morphologiques privées
- Profils utilisateur complets dans le Knowledge (extractibles par un utilisateur)
- Blocs DA MasterFlow internes dans des fichiers livrés à des GPT

---

## Le Router : le seul composant sain

`_MASTERFLOW_ROUTER/` est bien conçu :

| Composant | Qualité |
|---|---|
| `00_README_ROUTER.md` | Clair sur le rôle, les limites, la règle d'or |
| `01_ROUTING_PROTOCOL.md` | Protocole complet, séquence standard, rails de sortie |
| `04_PRIMITIVE_MAP.md` | 22 primitives listées avec cible Masterflow |
| `02_MASTERFLOW_FAST_INDEX.jsonl` | Index de recherche rapide |
| `05_IDEA_INBOX.md` | Propre, 1 entrée routée |
| `06_ROUTING_DECISIONS_LEDGER.md` | 3 décisions, format YAML correct |

Le protocole de routage distingue proprement :
- `GIT_KEEP` / `GIT_REMOVE_TO_FACTORY_ROUTER` / `FACTORY_WORKSHOP` / `FACTORY_PATCH`
- `DUAL_TRACK` / `MASTERFLOW_PRIMITIVE_CANDIDATE` / `MASTERFLOW_RUNTIME_GAP`
- `MASTERFLOW_DOC_ONLY` / `BLOCKED` / `REJECTED` / `ARCHIVE_ONLY`

**Le problème :** Le Router est cohérent mais les décisions de routage sont
stagnantes (3 entrées seulement). Aucun des problèmes listés ci-dessus n'a
été routé via le protocole.

---

## Recommandations par priorité

### Immédiat — corriger avant tout envoi
1. **MASTERSCORE** : Remplacer `SCOPE_LOCK.md` et `BOOT_CONTEXT_INTAKE.md` par des versions SF6
2. **MASTERSCORE** : Compléter ou retirer les PROFILES placeholders
3. **OURS_DOR** : Anonymiser tous les fichiers (Malex/Alex → créateur, retirer PROFILE_MALEX.md)
4. **MASTERINVENTORY** : Nettoyer le bloc DA Orchestrator des instructions GPT
5. **LEARNING_MIRROR** : Anonymiser le BOOT_CONTEXT (Malex/Vincent → rôles)
6. **NICOK** : Anonymiser PROFILE_NICO.md

### Court terme — hygiène
7. **OURS_DOR** : Supprimer le doublon `02_MANIFEST.md`
8. **OURS_DOR** : Dédoublonner les blocs DA_ORCHESTRATION (1 occurrence par fichier max)
9. **OURS_DOR** : Renumérotter le conflit `09_`
10. **MASTERFLEX_COACH** : Nettoyer `03_KNOWLEDGE_FILES/` et `_DEPLOYMENT/`
11. **OURS_DOR** : Nettoyer les refs externes absentes du pack
12. **LEARNING_MIRROR** : Réintégrer ou documenter la perte des modules Vincent

### Moyen terme — alignement Masterflow
13. Documenter les primitives candidates du Router vers Codex pour évaluation
14. Établir un mapping versionné entre versions Factory et versions Masterflow
15. Créer un script de validation de pack (vérifie : anonymisation, doublons, refs externes)

### Long terme — architecture
16. Définir si les factories doivent un jour être importées dans Masterflow
    (décision produit MALEX) ou rester des bots autonomes
17. Si oui, planifier un `factory_bridge_engine` pour exécuter des factories
    depuis le backend Masterflow

---

## Fichiers audités

- `/Users/malex/Desktop/FACTORIES/_INDEX_FACTORIES.md`
- `/Users/malex/Desktop/FACTORIES/README_STRUCTURE.md`
- `/Users/malex/Desktop/FACTORIES/_KERNEL/09_EXTRACTION_INBOX.md`
- `/Users/malex/Desktop/FACTORIES/_MASTERFLOW_ROUTER/` (00 à 06)
- `/Users/malex/Desktop/FACTORIES/OURS_DOR_FACTORY/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/TALENTS_CREATIFS_BRIEF_INTAKE/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/TALENTS_CREATIFS_GUIDE/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/PROF_KRAPU_FACTORY/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/NICOK_FACTORY/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/BATRASIA/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/MASTERINVENTORY/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/MASTERSCORE/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/LEARNING_MIRROR/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/MASTERFLEX_COACH/CURRENT/` (pack complet)
- `/Users/malex/Desktop/FACTORIES/_ARCHIVE_GLOBAL/`
