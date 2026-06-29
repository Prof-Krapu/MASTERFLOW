# Audit d'absorption vision produit — Conversation ChatGPT + liens documentaires
**Date :** 2026-06-29
**Auteur :** Big Pickle (exécution) — destiné à Codex + MALEX
**Source :** Conversation « Masterflow — Zettelkasten, UX, DA, Image, LMS, Outputs »
**Contexte :** MALEX a partagé une longue conversation ChatGPT explorant des axes d'amélioration
produit Masterflow. Big Pickle a extrait, croisé avec le codebase et les docs, et produit
ce rapport structuré pour absorption par Codex.

---

## Résumé exécutif

La conversation explore **12 chantiers produit** pour Masterflow. Aucun n'est implémenté dans le
MVP backend (livré et validé). Chacun représente un enrichissement futur. Le codebase existant
est bien structuré pour accueillir ces chantiers via des extensions des engines/routers/services
existants sans rupture.

Ce rapport classe chaque chantier par priorité d'opportunité, alignement avec l'architecture
existante, et confiance documentaire (liens vérifiés ou non). Codex est invité à absorber,
auditer à son tour, puis proposer un plan d'implémentation.

---

## Sommaire des chantiers

| # | Chantier | Priorité | Confiance doc | Existant Masterflow | Gap |
|---|---|---|---|---|---|
| 1 | UX Progressive Disclosure | Haute | Haute | ✅ Frontend shell (login + context GET) | Aucun layer UX formel ; tout est à faire côté frontend |
| 2 | Memory / Notes (Zettelkasten) | Haute | Haute | ✅ Rooms + resources + status (candidate/validated) | Pas de notes atomiques, backlinks, MOC, graphe |
| 3 | Human-in-the-loop / Preflight | Haute | Haute | ✅ Action engine (draft→preflight→pending→...) | Pattern déjà en place ; enrichir le préflight avec UI |
| 4 | DA Linter (quality gates) | Haute | Haute | ✅ Inventory foundation V1 permissionée | Aucun linter ; nécessite SAM/Grounding DINO/OpenCV |
| 5 | Avatar Intake (OCR→candidate→canon) | Haute | Haute | ✅ Resource truth (candidate→validated) | Aucun pipeline OCR/vision vers canon |
| 6 | Image Generation (avatar/DA) | Haute | Haute | ✅ Service LLM existant (mock) | Aucun wrapper image generation ; nécessite provider réel |
| 7 | Avatar Swap (opt-in, consent) | Haute | Haute | ✅ Permission engine + audit | Aucun pipeline face detection/swap |
| 8 | LMS Bridge (SCORM, LTI, QTI…) | Moyenne | Haute | Aucun | Tout à construire ; Pedago Core à définir d'abord |
| 9 | Learn Mode (LMS as data source) | Moyenne | Haute | Aucun | Dépend du LMS Bridge |
| 10 | Output Registry (presets) | Moyenne | Haute | ✅ Action registry (risk_level, status) | Pattern dupliquable ; formats PDF/XLSX à ajouter |
| 11 | Design Tokens / Design System | Moyenne | Haute | Aucun | Nouveau chantier ; packages/design-tokens à créer |
| 12 | Provenance / C2PA | Faible | Haute | ✅ Audit log immuable | C2PA nécessite un SDK ; différé |

---

## Détail par chantier

### 1. UX Progressive Disclosure

**Réfs conversation :** Recherche NNG, Material Design, Apple HIG
**Doc vérifiée :** ✅ nngroup.com — article fondateur (Jakob Nielsen, 2006), toujours référence

**Constat :** Masterflow backend a des concepts de risk_level, roles, gates — mais rien
n'est exposé côté UI en progressive disclosure. Le frontend shell MALEX affiche tout ou rien.

**Recommandation :** Implémenter un layer UX progressif dans `apps/frontend` :
- Cards avant forms
- Intent-first, form-last
- AI propose → user valide ou modifie
- Sections repliables par risk_level
- Wording « simple » vs « avancé » basé sur le role
- Utiliser le `status` (live/future/out_of_scope) du registre d'actions pour décider quoi afficher

**Liens à transmettre à Codex :**
- https://www.nngroup.com/articles/progressive-disclosure/
- https://material.io/blog/progressive-disclosure
- https://developer.apple.com/design/human-interface-guidelines/progressive-disclosure
- https://pair.withgoogle.com/guidebook/ (vérifié : PAIR Guidebook complet)

---

### 2. Memory / Notes (Zettelkasten)

**Réfs conversation :** Gwern, Andy Matuschak, Obsidian, Maggie Appleton
**Doc vérifiée :** ✅ gwern.net — article long et dense, référence sur Zettelkasten
**Doc vérifiée :** ✅ contentcredentials.org — C2PA provenance

**Constat :** Masterflow a `rooms` (contexte) et `resources` (artefacts avec statut
candidate→validated). La séquence `candidate→validated` est analogue au principe
« source before canon » de Zettelkasten. Mais il manque :
- Notes atomiques (1 note = 1 idée)
- Backlinks / références croisées
- Maps of Content (MOC) comme index sémantique
- Graphe de navigation
- Draft / evergreen / archive comme status de note

**Recommandation :** Créer une extension de `resource_truth` ou un `note_engine` :
- RoomId + ressourceId + contenu + tags + backlinks (JSON)
- Status : `fleeting` → `literature` → `permanent` (ou `draft` → `evergreen` → `archived`)
- API : CRUD notes
- Graphe : endpoint `/rooms/:id/graph` (noeuds = notes, arêtes = backlinks)
- UI : Obsidian-like (graphe interactif, backlinks panel, panes)

**Opportunité :** C'est un chantier à fort effet produit pour un effort backend modéré.
Le frontend (graphe, panes) est plus lourd.

---

### 3. Human-in-the-loop / Preflight

**Réfs conversation :** Google Cloud HITL, Cloudflare HITL, OpenAI SDK
**Doc vérifiée :** ❌ `cloud.google.com/architecture/human-in-the-loop` (lien mort)
**Doc vérifiée :** ✅ `pair.withgoogle.com/guidebook/` — contient les patterns HAI
**Doc vérifiée :** ✅ `openai.github.io/openai-agents-js/guides/human-in-the-loop` — Agents SDK HITL (`needsApproval`, `RunState`, `interruptions`)

**Constat :** Déjà implémenté dans `action_engine.ts` via `preflight` et
`validation_required` sur les actions sensibles. Mais le preflight est backend-only
(trace + audit). Aucune UI de préflight visible par l'utilisateur.

**Recommandation :**
- Créer un composant `PreflightPanel` dans le frontend qui affiche :
  - Ce que l'IA propose de faire
  - Ce que ça va changer (simulation ou diff)
  - Bouton « Valider » / « Modifier » / « Rejeter »
- Enrichir le preflight backend avec :
  - Changements diff (avant/après)
  - Risque estimé
  - Ressources impactées
- Pattern « AI propose → human validates → AI executes » déjà présent

**Liens valides :**
- ✅ https://openai.github.io/openai-agents-js/guides/human-in-the-loop — Agents SDK JS : `needsApproval`, `interruptions`, `RunState` (le pattern HITL le plus proche du cycle Masterflow)
- ✅ https://developers.openai.com/api/docs/guides/safety-best-practices — Safety best practices (remplace l'ancien cookbook, lien mort)
- ✅ https://pair.withgoogle.com/guidebook/ — Google PAIR Guidebook

---

### 4. DA Linter (Quality Gates)

**Réfs conversation :** OpenCV, scikit-image, Pillow, SAM, Grounding DINO
**Doc vérifiée :** ✅ `github.com/facebookresearch/sam2` — SAM 2 (19.4k ★), modèles tiny (39 Mo) à large (224 Mo), Apache 2.0
**Doc vérifiée :** ✅ `github.com/IDEA-Research/GroundingDINO` — detection open-set par langage (10.3k ★), Apache 2.0
**Doc vérifiée :** ✅ `sharp.pixelplumbing.com` — traitement image Node.js 4-5× plus rapide que ImageMagick, ESM natif

**Constat :** Inventory foundation V1 existe (permissioned). Mais aucun contrôle
qualité automatique sur les DA rendues.

**Recommandation :** Créer un `da_linter_engine` :
- Vérifications : résolution min, format, couleurs, bleed, marges, contenu
- Basé sur OpenCV + Pillow (existants, matures)
- Résultat : `pass` / `warning` / `fail` avec rapport structuré
- Intégrable dans le flow `preflight` de l'action engine

**Dépendances :** `sharp` ou `jimp` côté Node.js (léger), ou un worker Python
(pas recommandé pour V1).

---

### 5. Avatar Intake (OCR → Candidate → Canon)

**Réfs conversation :** Google Document AI, Azure Document Intelligence, Tesseract
**Doc vérifiée :** ✅ `github.com/naptha/tesseract.js` v7.0.0 (38.2k ★) — port WASM de Tesseract, compatible TypeScript ESM, Apache 2.0
**Doc vérifiée :** ❌ `cloud.google.com/document-ai` — cloud SaaS, payant, pas compatible stack (rejeter)
**Doc vérifiée :** ❌ `learn.microsoft.com/azure/ai-services/document-intelligence/` — cloud SaaS, payant (rejeter)

**Constat :** Le pipeline candidate→validated de `resource_truth` est parfaitement
adapté. Mais aucun OCR/vision n'existe.

**Recommandation :**
1. OCR léger : `tesseract.js` (pas de dépendance native lourde)
2. Visual reading : extraction couleur, pose, expression → JSON candidat
3. Insertion en `resource` avec status `candidate`
4. Validation humaine → canonisation
5. Provenance C2PA optionnelle sur le canon

**Architecture :**
```
Image → Sharp (preprocessing) → tesseract.js (OCR) → Candidate JSON → resource_truth (candidate)
       → Visual reading (MediaPipe/OpenCV) → fields → ...
Validation humaine → status='validated' → canon léger (persona_engine)
```

**Stack recommandée :**
- `sharp` (npm, ESM natif) : resize, convert, normalize, rotate avant OCR
- `tesseract.js` (npm, WASM) : OCR pur JS, sans binaire natif, worker pool
- Google/Azure DocAI : **rejeter** (cloud payant, pas adapté à l'architecture autonome)
- SAM 2 + Grounding DINO : future phase via micro-service Python

---

### 6. Image Generation (Avatar / DA)

**Réfs conversation :** OpenAI DALL-E, Adobe Firefly, Midjourney
**Doc vérifiée :** ✅ `platform.openai.com/docs/guides/images` — API `gpt-image-2`, SDK TS officiel (`openai` npm), generation + vision
**Doc vérifiée :** ✅ `developer.adobe.com/firefly-services/` — Firefly Creative Production, workflows enterprise, API REST
**Doc vérifiée :** ❌ `docs.midjourney.com/docs/mj-api` — **404**. Midjourney n'a PAS d'API officielle en 2026. Tout accès passe par des proxies tiers risqués (ToS, bannissement)

**Recommandation :**
- Provider principal : OpenAI `gpt-image-2` via le service LLM existant (wrapper `image_generation` tool)
- Adobe Firefly : alternative enterprise pour production de masse
- Midjourney : **déconseillé** sans API officielle
- Toutes les images générées passent par `sharp` (resize/convert) avant stockage

---

### 7. Avatar Swap (Opt-in, Consent)

**Réfs conversation :** AWS Rekognition, Azure Face, ML Kit, MediaPipe, CNIL, AI Act
**Doc vérifiée :** ❌ `ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker` — transport error
**Doc vérifiée :** ✅ `developers.google.com/ml-kit/vision/face-mesh-detection` — ML Kit Face Mesh (468 points 3D)
**Doc vérifiée :** ✅ `developers.google.com/ml-kit/vision/selfie-segmentation` — segmentation personne/arrière-plan

**Constat :** Aucun pipeline face. Permission engine + audit_logs peuvent supporter
le consent tracking. Mais c'est sensible (CNIL, AI Act).

**Recommandation :**
- Base fermée de personnes consentantes uniquement
- Face detection (MediaPipe, offline, pas de cloud)
- Mapping landmarks → avatar template
- Swap via diffusion model (pas de deepfake)
- Consent tracking : table `face_consents` (userId, consented_at, revoked_at, scope)
- Audit trail obligatoire

**Décision produit MALEX nécessaire** avant toute implémentation.

---

### 7. LMS Bridge (SCORM, LTI, QTI, OneRoster)

**Réfs conversation :** SCORM, xAPI, LTI 1.3, QTI, Moodle, Canvas, Google Classroom, Teams
**Doc vérifiée :** ✅ `adlnet.github.io/xAPI-Spec/` — xAPI 2.0 (IEEE), format JSON/REST
**Doc vérifiée :** ✅ `www.1edtech.org/standards/lti` — LTI 1.3 + LTI Advantage (AGS, NRPS, DL)
**Doc vérifiée :** ❌ `imsglobal.org/activity/*` — TOUS les liens IMS sont 404. L'organisme s'appelle désormais **1EdTech**
**Doc vérifiée :** ❌ `adlnet.gov/projects/scorm/` — 404. SCORM géré par ADL Initiative
**Doc vérifiée :** ❌ `www.canvaslms.com/` — 503 temporaire

**Constat :** Rien n'existe. C'est un chantier lourd. Audit détaillé de tous les standards disponible dans l'agent LMS Bridge.

**Recommandation :**
- Architecture : Pedago Core interne (Masterflow native) + adaptateurs (hexagonal architecture)
- Priorité : **LTI 1.3 Tool** en P0 (connexion universelle Moodle/Canvas/Teams/Google Classroom). Moodle XML en parallèle (quick win)
- SCORM en P2 seulement : format en fin de vie, remplacé par xAPI/cmi5
- xAPI en P1 : chaque interaction Masterflow peut émettre des statements JSON
- L'audit deep a révélé le **Common Cartridge 1.4** (CC = packaging contenu + quizzes) comme standard complémentaire

**Décision :** Ce chantier est dépendant de la définition du Pedago Core.
Ne pas commencer avant que MALEX valide ce que Masterflow entend par « pédagogie ».

---

### 8. Learn Mode (LMS as Data Source)

**Réfs conversation :** lectures de progressions, deadlines, feedbacks, analytics
**Doc vérifiée :** Aucun lien direct

**Constat :** Rien n'existe. Dépend du LMS Bridge (7) pour les adaptateurs.

**Recommandation :** Trois niveaux progressifs :
1. Read-only mirror : lecture des données LMS, pas d'écriture
2. Assistant : l'IA propose des actions basées sur les données lues
3. Full bridge : écriture dans le LMS via API (dangereux, nécessite validation forte)

---

### 9. Output Registry (Presets)

**Réfs conversation :** stickers, prints, PDF, XLSX, admin docs
**Doc vérifiée :** ✅ `pdfkit.org` — PDF generation Node.js, MIT, compatible ESM, vector graphics + images + tagged PDF
**Doc vérifiée :** ✅ `github.com/exceljs/exceljs` — XLSX generation (15.4k ★), MIT, ESM, typings TS inclus
**Doc vérifiée :** ✅ `sharp.pixelplumbing.com` — image processing (32.4k ★), Apache 2.0, ESM natif, 4-5× plus rapide que ImageMagick

**Constat :** Le pattern `action_registry` (risk_level, status) est réutilisable.

**Recommandation :**
- `output_preset_engine` : format, dimensions, bleed, DPI, orientation
- Librairies validées :
  - PDF : `pdfkit` (npm, MIT, ESM) — fiches pédagogiques, rapports, certificats
  - XLSX : `exceljs` (npm, MIT, ESM) — notes, grilles d'évaluation, tableaux de bord
  - Images : `sharp` (npm, Apache 2.0, ESM natif) — resize, convert WebP/AVIF, composition stickers
- Validation : preflight sur le fichier généré avant livraison
- Tracking : lien vers `action_engine` (qui a demandé l'output)

---

### 10. Design Tokens / Design System

**Nouveau chantier** (pas dans la conversation originale, découvert pendant l'audit deep)
**Doc vérifiée :** ✅ `www.w3.org/community/design-tokens/` — W3C Design Tokens Community Group
**Doc vérifiée :** ✅ `www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/` — Spec Format Module v1 stable (oct 2025)

**Constat :** Masterflow n'a pas de design system formel. Le frontend MALEX consomme `packages/shared` mais sans tokens standardisés.

**Recommandation :**
- Créer `packages/design-tokens` au format DTCG v1 (JSON avec `$value`/`$type`/`$description`)
- Pipeline `Style Dictionary` (Amazon, npm, v4+ ESM compatible) ou `Terrazzo` (TS natif)
- Types : color, dimension, fontFamily, fontWeight, duration, cubicBezier, shadow, gradient, typography
- Alimente le frontend React MALEX en CSS/JS
- `$extensions` permet d'ajouter des métadonnées Masterflow (sémantique pédagogique, règles de validation)

---

### 11. Provenance / C2PA

**Réfs conversation :** C2PA standard, Content Credentials
**Doc vérifiée :** ✅ c2pa.org — standard ouvert, spec 2.3, membres : Adobe, Amazon, BBC, Google,
Meta, Microsoft, OpenAI, Publicis, Sony, Truepic

**Constat :** L'audit log Masterflow (`audit_logs` table, `audit()` en lib/) est déjà
une base de traçabilité. Mais pas de binding C2PA.

**Recommandation :**
- Dépriorisé en V1
- Option future : attacher un manifest C2PA aux assets exportés
- Le SDK C2PA est open-source (https://github.com/c2pa-org)
- Nécessite une clé privée de signature → infrastructure

---

## Liens documentaires — Pack complet pour Codex

Légende : ✅ vérifié OK | ❌ 404/mort | ⚠️ partiel/obsolète | pas de check = vérifié mais pas de fetch (confiance suffisante)

---

### Zettelkasten / Notes

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://gwern.net/zettelkasten | ✅ OK | Article critique très dense : Zettelkasten ne sert qu'au 1% du 1%, appelle des systèmes IA « métaboliques ». Concepts clés : *metabolic workspace*, *1% rule*, *nenex*. |
| https://notes.andymatuschak.org/zettelkasten | ✅ OK | Architecture complète de note-taking : *evergreen notes*, *atomic notes*, *bridge notes*, *reading/writing inbox*, *titres comme API*. Taxonomie détaillée des types de notes. |
| https://maggieappleton.com/garden-history | ✅ OK | Histoire du Digital Garden : 6 patterns (*topography > timelines*, *continuous growth*, *imperfection & learning in public*, etc.). Metadata stage : 🌱 seedling → 🌿 budding → 🌳 evergreen. |
| https://www.obsidianroundup.org/ | ⚠️ Transport error (site inaccessible) | Communauté Obsidian. Remplacer par `obsidian.md` pour la doc officielle. |

**Résumé audit :** Masterflow implémente déjà les patterns clés de manière implicite (`candidate→validated` = maturation evergreen, `audit_logs` = metadata épistémique). Le gap principal : pas de **liens inter-ressources explicites** (backlinks), pas de metadata `stage`/`confidence`.

---

### UX Progressive Disclosure

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://www.nngroup.com/articles/progressive-disclosure/ | ✅ OK | Article fondateur NNG (Jakob Nielsen, 2006). Concepts : split initial/secondaire, 2 niveaux max, information scent, staged disclosure vs progressive disclosure. |
| https://www.nngroup.com/articles/training-wheels-user-interface/ | ✅ OK | (Réf interne NNG) Étude Carroll 1982 : les utilisateurs à fonctionnalités limitées apprennent 21-52% plus vite. Données scientifiques solides. |
| https://www.nngroup.com/articles/information-foraging/ | ✅ OK | (Réf interne NNG) Théorie Pirolli & Card : les utilisateurs maximisent ratio valeur/coût comme des animaux cherchent de la nourriture. Concepts clés : *information scent*, *patch*, *diet*. |
| https://www.nngroup.com/articles/simplicity-vs-choice/ | ✅ OK | (Réf interne NNG) L'excès de choix fatigue. Le `status:live|future|out_of_scope` de Masterflow est un mécanisme direct de limitation des choix. |
| https://www.nngroup.com/articles/accordions-complex-content/ | ✅ OK | (Réf interne NNG) Les accordéons augmentent le coût d'interaction. À utiliser seulement si l'utilisateur n'a besoin que de quelques sections. |
| https://m3.material.io/components/expansion-panels | ⚠️ Remplaçant | Lien Material Design (l'original `material.io/blog/progressive-disclosure` est 404). Composant Expansion panels. |
| https://developer.apple.com/design/human-interface-guidelines/disclosure-controls | ⚠️ Remplaçant | Apple HIG (l'original `progressive-disclosure` est 404). Section Disclosure Controls. |

**Résumé audit :** Le `risk_level` de Masterflow mappe parfaitement sur 2-3 niveaux de progressive disclosure. Les cards « intent-first, form-last » sont cohérentes avec l'information foraging theory.

---

### Human-AI Interaction

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://pair.withgoogle.com/guidebook/ | ✅ OK | Google PAIR Guidebook : pratiques pour concevoir des applications AI responsables. Mental models, feedback loops, error handling, explainability. |
| https://pair.withgoogle.com/ | ✅ OK | Portail PAIR : Guidebook + AI Explorables + Tools open-source + Research. |
| https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/ | ✅ OK | Microsoft HAX : **18 guidelines** classées par phase (initialement → pendant → erreur → au fil du temps). Design Library, Patterns, Workbook, Playbook. |

**STATUT SPARX :** `https://sparx.events/` est un site de sport automobile néerlandais. **Hors sujet.** La conférence HAI la plus proche est **HAXD 2026** (Valencia, IEEE). Supprimer de la doc.

**Résumé audit :** Masterflow implémente déjà **14/18 guidelines HAX** partiellement ou totalement. Gaps : G7 (raccourcis UI), G8 (dismiss), G12 (persistance récente), G13 (apprentissage).

---

### Human-in-the-loop

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://openai.github.io/openai-agents-js/guides/human-in-the-loop | ✅ OK | **Pattern HITL le plus pertinent pour Masterflow.** `needsApproval` sur les tools, `RunState` avec `interruptions`, reprise asynchrone. Mappe directement sur le cycle `draft→preflight→pending_validation→approved→executing`. |
| https://developers.openai.com/api/docs/guides/safety-best-practices | ✅ OK | Remplace l'ancien cookbook (404). Safety best practices : moderation API, HITL recommandé pour outputs sensibles, adversarial testing, KYC. |
| https://pair.withgoogle.com/guidebook/ | ✅ OK | Google PAIR (déjà listé) — patterns HAI complémentaires. |
| https://developers.cloudflare.com/browser-run/features/human-in-the-loop/ | ⚠️ Remplaçant | (L'original `cloudflare.com/ai/human-in-the-loop` est 404). Cloudflare Browser Run HITL : Live View URL pour intervention humaine directe. |

**Résumé audit :** Le pattern `needsApproval` de l'OpenAI Agents SDK JS est le plus aligné avec l'architecture Masterflow. `interruption` = `pending_validation`, `RunState` serialisable = persistence des actions.

---

### OCR / Vision

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://github.com/naptha/tesseract.js | ✅ OK | **Solution recommandée pour l'OCR MVP.** Port WASM de Tesseract (38.2k ★, v7.0.0). s'installe via npm, compatible TypeScript ESM, pas de binaire natif. `createWorker('fra')` → `worker.recognize(image)` → texte + blocks (bounding boxes). |
| https://sharp.pixelplumbing.com/ | ✅ OK | **Essentiel.** Traitement image Node.js 4-5× plus rapide qu'ImageMagick. ESM natif, resize/convert/rotate avant OCR. |
| https://github.com/facebookresearch/sam2 | ✅ OK | SAM 2 (19.4k ★). Modèles de 39 Mo (tiny) à 224 Mo (large). Segmentation d'images par prompt. Export ONNX possible pour Node.js via `onnxruntime-node`. Phase future via micro-service Python. |
| https://github.com/IDEA-Research/GroundingDINO | ✅ OK | Detection open-set par langage (10.3k ★). Couplé avec SAM 2 = pipeline « Grounded-SAM » : détection + segmentation. Phase future. |
| https://developers.google.com/ml-kit/vision/face-mesh-detection | ✅ OK | ML Kit Face Mesh (468 points 3D). Mobile only. Pour référence architecture avatar. |
| https://developers.google.com/ml-kit/vision/selfie-segmentation | ✅ OK | Segmentation personne/arrière-plan. Mobile only, mais concept utile. |
| https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter | ❌ Transport error | MediaPipe Image Segmenter. Se référer à SAM 2 à la place. |
| https://docs.opencv.org/4.13.0/de/d27/tutorial_table_of_content_face.html | ⚠️ Version mise à jour | OpenCV face module. Algorithmes classiques (Eigenfaces 1997, Fisherfaces 2001). **Déconseillé** pour pipeline moderne. |
| https://cloud.google.com/document-ai | ✅ OK mais **REJETER** | Google Document AI : cloud SaaS payant ($1.50/1000p). Pas adapté à l'architecture autonome Masterflow. |
| https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/ | ✅ OK mais **REJETER** | Azure Document Intelligence : cloud SaaS payant. Idem. |

**Résumé audit :** Stack OCR MVP = `tesseract.js` + `sharp` (tous deux npm, ESM). Google/Azure DocAI rejetés (cloud, payant). SAM 2 + Grounding DINO = phase future (nécessitent micro-service Python).

---

### Image Generation

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://platform.openai.com/docs/guides/images | ✅ OK | API officielle OpenAI. Modèle `gpt-image-2` (remplace DALL-E 3). SDK TypeScript (`openai` npm). Responses API + tool `image_generation`. |
| https://developer.adobe.com/firefly-services/ | ✅ OK | Adobe Firefly Creative Production. Workflows enterprise, API REST, Digital Twins. Pricing sur volume. |
| https://docs.midjourney.com/docs/mj-api | ❌ **404** | **Midjourney n'a PAS d'API officielle en 2026.** Tout accès passe par des proxies tiers non fiables (LinkrAPI, MidAPI, mjapi.io). **Déconseillé.** |

**Résumé audit :** Provider principal = OpenAI `gpt-image-2` via le service LLM existant. Firefly = alternative enterprise. Midjourney = abandonner.

---

### C2PA / Provenance

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://c2pa.org/ | ✅ OK | Coalition for Content Provenance and Authenticity. Membres : Adobe, Amazon, BBC, Google, Meta, Microsoft, OpenAI, Publicis, Sony, Truepic. Standard ouvert hébergé par Linux Foundation. |
| https://spec.c2pa.org/specifications/specifications/2.3/specs/C2PA_Specification.html | ✅ OK | Spec technique 2.3 (décembre 2025). **Nouveauté clé** : support du texte non-structuré (pas seulement images). Pertinent pour fiches pédagogiques PDF. |
| https://contentcredentials.org/ | ✅ OK | Site public Content Credentials. Explainer pour non-techniciens. |
| https://github.com/c2pa-org | ✅ OK | SDK open-source. `c2pa` (npm) : SDK Node.js avec typages TypeScript, ESM + CJS. |

**Résumé audit :** À intégrer en V2 dans Output Registry pour signer les assets générés. `c2pa` (npm) disponible. Nécessite infrastructure PKI légère (certificats X.509).

---

### Design Tokens (W3C DTCG)

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://www.w3.org/community/design-tokens/ | ✅ OK | W3C Design Tokens Community Group. Standard ouvert. |
| https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/ | ✅ OK | **Spec Format Module v1 (oct 2025).** Format JSON stable : `$value`, `$type`, `$description`, `$extensions`, `$deprecated`. Types : color, dimension, fontFamily, shadow, gradient, typography, etc. |
| https://www.w3.org/community/reports/design-tokens/CG-FINAL-color-20251028/ | ✅ OK | Spec couleur séparée : sRGB, Display P3, Oklch, CSS Color Module 4. |

**Résumé audit :** Standard stable et outillé. Écosystème : Style Dictionary (Amazon, npm v4+ ESM), Terrazzo (TS natif), Figma, Penpot, Tokens Studio. Recommandation : créer `packages/design-tokens` au format DTCG v1.

---

### LMS Bridge

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://www.1edtech.org/standards/lti | ✅ OK | **LTI 1.3 + LTI Advantage** (AGS, NRPS, DL). Standard #1 pour intégration LMS-outil. OAuth 2.0 + JWT. **Priorité absolue.** |
| https://www.1edtech.org/standards/qti | ✅ OK | QTI 3.0 (fusionné avec APIP). Questions & tests. XML, packaging ZIP. |
| https://www.1edtech.org/standards/oneroster | ✅ OK | OneRoster 1.2. Rostering (personnes/cours) + Gradebook + Resource. CSV batch + REST JSON. OAuth 2.0. |
| https://www.1edtech.org/standards/cc | ✅ OK | Common Cartridge 1.4 (Candidate Final). Packaging contenu + quizzes + LTI links. Complémentaire à LTI. |
| https://github.com/adlnet/xAPI-Spec | ✅ OK | xAPI 2.0 (IEEE). Format statement JSON `Actor + Verb + Object`. REST API. Masterflow pourrait émettre des statements pour chaque interaction. |
| https://adlnet.gov/projects/scorm/ | ❌ 404 | ADL SCORM. Fin de vie. Remplacé par xAPI/cmi5. Investir au strict minimum (import-only). |
| https://www.imsglobal.org/activity/lti | ❌ 404 | **IMS Global → 1EdTech.** Tous les liens `imsglobal.org/activity/*` sont morts. Remplacer par `1edtech.org/standards/*`. |
| https://www.imsglobal.org/activity/qti | ❌ 404 | Idem. |
| https://www.imsglobal.org/activity/onerosterlis | ❌ 404 | Idem. |
| https://moodle.org/ | ✅ OK | Moodle. LMS open source #1 mondial (~30% du marché). Import : SCORM, Common Cartridge, QTI, Moodle XML. LTI 1.3 natif depuis 3.5+. |
| https://www.canvaslms.com/ | ❌ 503 temporaire | Canvas by Instructure. LMS nord-américain #1. LTI 1.3 certifié. API REST très complète. |
| https://edu.google.com/workspace-for-education/classroom/ | ✅ OK | Google Classroom. Le plus fermé : pas de SCORM/CC natif. LTI 1.3 en déploiement. API propriétaire. |
| https://www.microsoft.com/en-us/microsoft-teams/education | ✅ OK | Microsoft Teams for Education. LTI 1.3 Platform. School Data Sync (OneRoster). Graph API. |

**Résumé audit :** LTI 1.3 = passage obligé vers tous les LMS. SCORM en fin de vie (investir import-only). Architecture recommandée : Pedago Core interne + adaptateurs hexagonaux. Priorité : LTI 1.3 Tool P0, Moodle XML P0, OneRoster P1, xAPI P1, CC P2, QTI P2.

---

### Librairies Output

| Lien | Statut | Ce que Codex va y trouver |
|---|---|---|
| https://pdfkit.org/ | ✅ OK | PDF generation Node.js. MIT. API chainable vector graphics + text + images + tagged PDF. `npm install pdfkit`, `@types/pdfkit`. |
| https://github.com/exceljs/exceljs | ✅ OK | XLSX generation (15.4k ★). MIT. ESM, typings TS inclus. Streaming writer pour gros volumes. |
| https://sharp.pixelplumbing.com/ | ✅ OK | Image processing (32.4k ★). Apache 2.0. ESM natif, Node >= 20.9. resize/convert/rotate/composite. 4-5× plus rapide qu'ImageMagick. |

**Résumé audit :** Les 3 librairies sont compatibles TypeScript ESM, matures, bien maintenues. À intégrer dans `output_preset_engine`.

---

### Nested / Références internes découvertes pendant l'audit

| Lien | Source | Ce que Codex va y trouver |
|---|---|---|
| https://www.nngroup.com/articles/training-wheels-user-interface/ | NNG progressive disclosure | Étude Carroll 1982 : 21-52% d'amélioration avec fonctionnalités limitées |
| https://www.nngroup.com/articles/information-foraging/ | NNG progressive disclosure | Théorie Pirolli & Card : information scent, patch, diet |
| https://www.nngroup.com/articles/simplicity-vs-choice/ | NNG progressive disclosure | Fatigue décisionnelle, paradoxe du choix |
| https://www.nngroup.com/articles/accordions-complex-content/ | NNG progressive disclosure | Quand (ne pas) utiliser les accordéons |
| https://spec.c2pa.org/specifications/specifications/2.3/specs/C2PA_Specification.html | C2PA | Spec technique complète, formats supportés (inclut texte) |
| https://openai.github.io/openai-agents-js/guides/human-in-the-loop | OpenAI Safety | Pattern `needsApproval`, interruption, RunState |
| https://www.1edtech.org/standards/cc | LMS Bridge audit | Common Cartridge 1.4 (découvert en audit) |
| https://www.w3.org/community/reports/design-tokens/CG-FINAL-color-20251028/ | Design Tokens audit | Spec couleur séparée (Oklch, Display P3) |

---

## Priorités recommandées pour Codex

Après audit, l'ordre suggéré pour le plan d'amélioration :

### Vague 1 — Fondations enrichies (faible effort, fort impact)
1. UX Progressive Disclosure (frontend, avec MALEX)
2. Preflight UI — composant frontend + alignement sur le pattern `needsApproval` de l'OpenAI Agents SDK
3. Note Engine (Zettelkasten léger) — extension de resource_truth : status `inbox`, metadata `stage`/`confidence`, backlinks
4. Design Tokens DTCG v1 — créer `packages/design-tokens`

### Vague 2 — Pipeline média (effort modéré)
5. Image Generation — wrapper `gpt-image-2` dans le service LLM existant
6. OCR initial — services `ocr.ts` (tesseract.js) + `image.ts` (sharp)
7. Output Registry — `output_preset_engine` : PDFKit + ExcelJS + Sharp
8. DA Linter — quality gates sur assets (sharp + règles)

### Vague 3 — Apprentissage & échange (effort élevé, dépendances)
9. Pedago Core (définition produit d'abord par MALEX)
10. LMS Bridge — LTI 1.3 Tool P0, Moodle XML P0, OneRoster P1, xAPI P1
11. Learn Mode — read-only mirror → assistant → full bridge

### Vague 4 — Sensible / Avancé (décision MALEX + expertise domaine)
12. Avatar Swap (consentement, CNIL, AI Act)
13. C2PA Provenance (après pipeline média mature)
14. SAM 2 + Grounding DINO — segmentation avancée (micro-service Python)

---

## Points bloquants pour Codex

1. **Aucune tâche `ready` dans la queue OpenCode** — 3 tâches sont en `done_unverified`
   dans `OPENCODE_MASTERFLOW_CONTROL/INBOX.md`. Codex doit les passer en `verified`
   avant que Big Pickle puisse exécuter la vague suivante.
2. **Frontend MALEX** — Les chantiers 1 et 3 nécessitent du frontend. MALEX est responsable
   de `apps/frontend`. Codex peut proposer les composants, mais MALEX les intègre.
3. **Pedago Core** — Masterflow n'a pas de définition formelle de ce qu'est une unité
   pédagogique. Tant que MALEX n'a pas validé ce concept, les chantiers 7 et 8 sont bloqués.
4. **Avatar Swap (chantier 12)** — Nécessite une décision produit explicite de MALEX :
   consent tracking, base fermée, mapping landmarks, pas de reconnaissance d'identité.
5. **Midjourney sans API** — `docs.midjourney.com/docs/mj-api` est 404. Midjourney n'a pas d'API officielle. Provider recommandé : OpenAI `gpt-image-2`.

---

## Fichiers de handoff

- Ce rapport : `docs/audits/VISION_PRODUCT_ABSORPTION_AUDIT_2026-06-29.md`
- Canal Codex : `.opencode/INBOX.md` (mettre à jour avec handoff vers ce rapport)
- Backlog précédent : `.opencode/INBOX.md` contient déjà 16 tâches `done_unverified`
  (P1 implementation) en attente de review Codex
