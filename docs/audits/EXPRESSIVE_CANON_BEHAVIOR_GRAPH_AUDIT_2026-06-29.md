# Audit : EXPRESSIVE_CANON — Behavior Graph & Voix Stylisée

**Date :** 2026-06-29
**Type :** Audit recherche + proposition architecture
**Chantier lié :** MASTERLAB_BEHAVIOR_GRAPH / EXPRESSIVE_CANON
**Contexte :** MasterFlow dispose déjà d'un système d'avatar canon visuel (DA, morphologie, persona). Il manque l'équivalent **verbal/expressif** : un moteur qui permet à un personnage de s'exprimer avec les habitudes, l'humour, les tics, les registres de son utilisateur — sans devenir une imitation dangereuse ou non consentie.

---

## 1. Définition du concept

**EXPRESSIVE_CANON** = pont entre avatar canon visuel et voix stylisée :
- humour, rythme, formules, attitudes, registres
- limites comportementales
- validation utilisateur avant activation
- label "version stylisée, consentie, contrôlée"

≠ deepfake textuel
≠ imitation non consentie
= persona expressive consentie, stylisée, caricaturale, contrôlée

---

## 2. État de la recherche

### 2.1 Persona Graphs — représentation structurée de l'identité

| Papier | Année | Résultat utile |
|---|---|---|
| **ThinkPersona** (ACL 2026) | 2026 | Persona Graphs encodent trajectoires de vie, valeurs, relations, événements. QRA dataset (23k samples). Améliore fidélité roleplay et raisonnement contextualisé. |
| **PsyMem** (TACL 2026) | 2026 | 26 indicateurs psychologiques (Big Five, Schwartz, styles sociaux). Memory alignment training. Contrôle explicite mémoire + attributs. |
| **Dynamic Persona Coherence** (ACL 2026) | 2026 | Découple stabilité identitaire (L-layer) de l'adaptation émotionnelle (M/S-layers). L/M/S Psychological State Model : traits stables ≠ stress cumulé ≠ affect court-terme. |
| **Act-LLM** | 2025 | Pipeline complet data→train→dialogue avec dual-memory (long terme biographique + court terme contexte). |

**Verbatim clé ThinkPersona :**
> "Persona Graphs as structured representations that encode life trajectories, values, relationships, and events as interconnected knowledge."

### 2.2 Style verbal / stylométrie / signature lexicale

| Papier | Année | Résultat utile |
|---|---|---|
| **Survey: Representing Linguistic Style** (ACL ARR 2026) | 2026 | Définition opérationnelle du style pour praticiens. Taxonomie des méthodes de représentation. |
| **EAVAE** (ACL 2026) | 2026 | Disentanglement style/contenu via VAE. SOTA en authorship attribution. |
| **SSLA** (ACL 2026 Findings) | 2026 | Style fingerprint multi-couche : lexical, syntaxique, sémantique. 7-way LLM attribution. |
| **HumorGen** (arXiv 2026) | 2026 | Cognitive Synergy Framework : 6 persona cognitifs (The Absurdist, The Cynic...) génèrent humour via Mixture-of-Thought. Distillation 7B. |

**Constat :** Les LLMs laissent des empreintes stylistiques persistantes et mesurables (distribution de mots fonctionnels, structures syntaxiques, abstraction). La stylométrie moderne permet d'extraire une signature utilisateur exploitable pour génération contrôlée.

### 2.3 Language Style Matching & accommodation

| Papier | Année | Résultat utile |
|---|---|---|
| **LSM in LLMs** (SIGDIAL 2025) | 2025 | Les LLMs montrent peu de LSM natif. Logit-Constrained Generation améliore l'alignement stylistique. |
| **Linguistic Convergence** (EACL 2026) | 2026 | Les LLMs sur-convergent fortement vers le style utilisateur (souvent plus que les humains). L'instruction-tuning réduit cette sur-convergence. |
| **Who Accommodates Whom** (MDPI 2026) | 2026 | Convergence interpersonnelle progressive. L'influence LLM sur le style des utilisateurs est mesurable. |
| **LLMs stick to point, humans to style** (SIGDIAL 2025) | 2025 | LLMs : haute similarité sémantique, basse similarité stylistique. Humains : inverse. |

**Constat critique :** Les LLMs sur-ajustent leur style à l'utilisateur. C'est un risque (parodie inconsciente) MAIS aussi une opportunité : avec des garde-fous, cette capacité peut être contrôlée pour produire une voix stylisée VALIDÉE plutôt qu'une imitation sauvage.

### 2.4 Contrôle fin de génération

| Papier | Année | Résultat utile |
|---|---|---|
| **CTG Survey** (arXiv 2024) | 2024 | Taxonomie complète : retraining, fine-tuning, RL, prompt engineering, latent space manipulation, decoding-time intervention. |
| **Malleable Prompting** (arXiv 2026) | 2026 | GUI widgets (sliders) → modulation token probabilities. Attribution des spans aux contrôles. |
| **Multi-Personality Generation** (arXiv 2025) | 2025 | MPG + Speculative Chunk-level Rejection sampling. Contrôle multi-traits au decoding. |
| **LingGen** (EACL 2026) | 2026 | Contrôle 40 attributs linguistiques simultanés. BOS-based injection + Pareto masking. |
| **Style Arithmetic** (ACL 2025) | 2025 | Paramètre-space style control. Extrapolation, transfert, composition de styles. |

**Conclusion :** Le contrôle fin multi-attribut existe et mature. Les approches decoding-time (Malleable Prompting, MPG) sont les plus pertinentes pour MasterFlow car :
- plug-and-play (pas de retraining)
- ajustables en runtime
- composables (plusieurs dimensions style)

### 2.5 Role-Playing Agents — synthèse des surveys

| Papier | Résultat utile |
|---|---|
| **Two Tales of Persona** (arXiv 2024) | Distinction clé : LLM Role-Playing (persona du LLM) vs LLM Personalization (persona de l'utilisateur). MasterFlow fait les DEUX. |
| **RPLA Survey** (arXiv 2024) | 3 types de persona : démographique, personnage, individualisé. Construction → data → évaluation. |
| **True-to-Role** (Techrxiv 2026) | Taxonomie Static-Dynamic : Static Persona (ancrage) + Dynamic Memory (Self + User). |
| **Role-Playing Agents** (arXiv 2026) | CHARMAP, Ditto, behavioral decision-making. Personnalité → motivation → situation. |

---

## 3. Architecture proposée pour MasterFlow

### 3.1 Concept BEHAVIOR_PROFILE

Objet métier lié à l'avatar canon, stocké en base avec status `candidate` → `validated` :

```typescript
interface BehaviorProfile {
  id: string;               // UUID
  status: 'candidate' | 'validated' | 'deprecated';
  ownerId: string;          // user_id
  avatarCanonId: string;    // lien vers le canon visuel

  // Sources d'apprentissage (consenties)
  sourceSamples: SourceSample[];

  // Traits de voix
  voiceTraits: {
    register: string[];           // familier, stimulant, taquin, formel...
    humor: string[];              // joute verbale, absurde, ironie...
    rhythm: string;               // phrases courtes, relances rapides...
    recurringPhrases: string[];   // expressions typiques
    forbiddenTones: string[];     // corporate mou, pédant...
  };

  // Patterns d'interaction
  interactionPatterns: {
    howUserCorrects: Pattern[];
    howUserValidates: Pattern[];
    howUserRequests: Pattern[];
    howUserJokes: Pattern[];
  };

  // Contrôles continus (0..1)
  styleControls: {
    humorLevel: number;
    directness: number;
    warmth: number;
    chaos: number;
    technicalDensity: number;
  };

  // Sécurité (non négociable)
  safety: {
    consentRequired: true;
    noImpersonation: true;
    labelAsStylized: true;
    humanReviewRequired: true;
  };
}
```

### 3.2 Pipeline

```
1. COLLECT → Messages, feedbacks, prompts (consentement explicite)
       ↓
2. EXTRACT → Stylométrie : mots fonction, rythme, syntaxe, registre
       ↓
3. BUILD → Behavior Graph : traits ↔ exemples ↔ contextes ↔ règles ↔ interdits
       ↓
4. GENERATE → Voix candidate (pas imitation : interprétation stylisée)
       ↓
5. EVALUATE → Cohérence, ressemblance, non-caricature, lisibilité
       ↓
6. VALIDATE → humain : devient canon seulement si l'utilisateur valide
```

### 3.3 Moteur de génération contrôlée

Deux niveaux :

**Niveau 1 — Prompt steering :**
- Le BEHAVIOR_PROFILE est sérialisé en contexte système (traits + interdits + examples)
- Simple, immédiat, sans infra additionnelle

**Niveau 2 — Decoding-time intervention (post-MVP) :**
- Modulation des logits via contrôle multi-attribut (inspiré Malleable Prompting, MPG)
- Attributable : chaque span est traçable au contrôle qui l'a produit
- Ajustable en runtime (sliders sur humorLevel, directness, etc.)

### 3.4 Invariant sécurité (copié de POLITIQUE_VALIDATION_GRADUEE)

- Consentement REQUIS avant extraction de style
- `noImpersonation: true` — le système ne se présente JAMAIS comme l'utilisateur
- `labelAsStylized: true` — toute sortie précise "version stylisée"
- `humanReviewRequired: true` — le profil reste `candidate` jusqu'à validation humaine
- Comportement Observable ≠ Vérité canonique (principe `resource_truth`)

---

## 4. Self-Rewriting / Auto-Debugging — le système qui se réécrit lui-même

### 4.1 État de la recherche

| Papier / Projet | Année | Résultat utile |
|---|---|---|
| **MOSS** (arXiv) | 2025 | Source-level self-rewriting sur agentic substrates. Cycle 7 étapes : trigger → diagnose → plan → implement → build → trial → decide. `moss evo` CLI. Swap validé par utilisateur, rollback auto sur health check échoué. |
| **SICA** (arXiv) | 2025 | Self-Improving Coding Agent. 17-53% gains SWE-Bench. Élimine la distinction meta-agent / target-agent. |
| **Gödel Agent** (arXiv) | 2024 | Self-referential framework. Inspecte sa propre mémoire runtime (variables globales/locales Python), monkey-patch son code en direct. Fonction main récursive. |
| **POLARIS** (ACL 2026 Findings) | 2026 | Gödel agent pour petits modèles (7B). Experience abstraction : échecs → stratégies réutilisables → patches minimales. Traceabilité complète. |
| **ReflexiCoder** (ACL 2026 Findings) | 2026 | RL-only self-reflection + self-correction. 40% token réduction vs base model. SOTA 1.5B-14B sur HumanEval/MBPP. |
| **Self-Rewriting for Reasoning** (AAAI 2026) | 2026 | GRPO + rewriting de traces de raisonnement. -46% longueur, +0.6 accuracy. |
| **DebugHarness** (arXiv) | 2025 | Agent debugging autonome avec introspection runtime (GDB, pwndbg, rr). Signature-driven investigation. |

**Verbatim clé MOSS :**
> "MOSS surfaces its entire evolution lifecycle—triggering, status query, stop, apply, conversational flagging—to the agentic substrate as a built-in CLI via system-prompt injection."

### 4.2 Architecture proposée pour MasterFlow

MasterFlow pourrait implémenter un cycle **SELF_DEBUG** inspiré de MOSS + Gödel Agent, adapté à son contexte pédagogique :

```
1. TRIGGER → Détection automatique (erreur 5xx, plainte utilisateur, test échoué)
       ↓
2. DIAGNOSE → Analyse des logs, traces, state DB
       ↓
3. PLAN → Patch candidat (code, seed, permission, config)
       ↓
4. IMPLEMENT → Génération du diff
       ↓
5. VERIFY → Tests + lint + smoke sur instance éphémère
       ↓
6. DECIDE → Présentation à l'humain (MALEX ou enseignant)
       ↓
7. APPLY → Swap avec rollback auto si health check échoue
```

**Invariant critique :** le système ne s'applique JAMAIS sans validation humaine (MALEX). Le cycle propose, n'exécute pas.

**Ce qui existe déjà dans MasterFlow :**
- `resource_truth` (candidate → validated)
- `action_engine` (draft → preflight → pending_validation → approved → executing → completed)
- Audit logs tracés

**Ces patterns sont réutilisables** pour le cycle SELF_DEBUG.

---

## 5. Usage Locks / Guardrails — verrous d'utilisation

### 5.1 Pourquoi c'est un problème distinct

Comme le montre ILION, la modération de contenu textuel (OpenAI Moderation, Llama Guard) échoue systématiquement sur la sécurité d'exécution (F1 < 0.12). Ce sont deux problèmes différents :

| | Content Moderation | Execution Safety |
|---|---|---|
| Ce qu'il évalue | Texte (haine, violence, sexe) | Actions (tool calls, API, shell) |
| Verdict | BLOCK/ALLOW sur le contenu | BLOCK/ALLOW sur l'effet de bord |
| Latence | 100-500ms | < 1ms requis |
| Déterministe | Non (LLM judge) | Oui (règles) |

### 5.2 État de la recherche / outillage

| Projet | Année | Approche |
|---|---|---|
| **ILION** (arXiv) | 2025 | 5-component cascade (TII, SVRF, IDC, IRS, CVL). Déterministe. 143μs. F1 0.85. Zero training data. |
| **AEGIS** (open source) | 2026 | Pre-execution firewall. Cryptographic audit trail (hash chain + Ed25519). HITL approvals. Kill switch. |
| **Signet** (open source) | 2026 | Capability-based safety gates. HMAC-chained audit. NIST 800-53. Prompt injection detection + tool call inspection. |
| **LatchGate** (open source) | 2026 | Fail-closed kernel. OPA/Rego policies. WASM sandbox providers. Ed25519 receipts. Budgets + HITL. |
| **Mirage** (open source) | 2026 | Policy DSL déterministe. Même YAML en CI et prod. Pas de LLM dans la boucle de décision. |
| **Actenon** (open source) | 2026 | Proof-gate cryptographique. Exact-action binding. Single-use replay protection. |
| **AgentLock** (open source) | 2026 | Standard d'autorisation pour agents. v1.2 : adaptive hardening, MODIFY/DEFER/STEP_UP. |
| **Amazon Bedrock Guardrails** | 2026 | InvokeGuardrailChecks API. Scores numériques par safeguard. Per-request granular. |

### 5.3 Ce qui existe déjà dans MasterFlow

MasterFlow a déjà implémenté les bases :

| Composant | Statut | Mapping guardrail |
|---|---|---|
| `permission_runtime` (ACL > rôles > gates) | ✅ Existant | Pre-execution policy |
| `action_engine` (draft → preflight → pending_validation → approved → executing) | ✅ Existant | HITL gate |
| `risk_level` statique depuis seed | ✅ Existant | Risk-tier gating |
| `audit_logs` | ✅ Existant | Trace trail |
| Signature cryptographique des reçus | ❌ Manquant | Evidence chain |

### 5.4 Recommandation

Plutôt qu'adopter un système externe (AEGIS, Signet, LatchGate), MasterFlow peut **durcir ses propres gates** en s'inspirant de leur architecture :

1. **Pre-execution gate** : `permission_runtime` + `risk_level` + validation humaine → déjà existant
2. **Audit chain cryptographique** : hash chain + signature Ed25519 sur les `audit_logs` → manquant mais pas bloquant V1
3. **Kill switch** : révocation de token en runtime, blocage automatique après N violations → manquant, utile pour prod
4. **Proof-bound execution** : lier une action à un proof cryptographique (Actenon pattern) → hors scope V1
5. **Budget / quota** : limitation de tokens, actions, coût par session → utile pour déploiement étudiant

---

## 6. Liens utiles

### Persona / Dialogue cohérent
- ThinkPersona : https://github.com/Hualeez/ThinkPersona
- Two Tales of Persona survey : https://arxiv.org/abs/2406.01171
- Role-Playing Agents survey : https://arxiv.org/abs/2404.18231
- True-to-Role survey : https://doi.org/10.36227/techrxiv.177160619.98027802/v1
- Act-LLM : https://www.sciencedirect.com/science/article/abs/pii/S0957417425026417
- PsyMem : https://aclanthology.org/2026.tacl-1.24.pdf
- Dynamic Persona Coherence : https://aclanthology.org/2026.acl-long.1336.pdf
- Memory-Driven Role-Playing : https://aclanthology.org/2026.findings-acl.1175.pdf

### Style / Stylométrie
- Survey Representing Linguistic Style : https://openreview.net/forum?id=Ou7yQ6od1X
- EAVAE (disentanglement) : https://aclanthology.org/2026.acl-long.2018/
- Authorship Attribution survey : https://pmc.ncbi.nlm.nih.gov/articles/PMC12019761/
- HumorGen : https://arxiv.org/abs/2604.09629
- Style Arithmetic : https://aclanthology.org/2025.acl-long.767.pdf

### Language Style Matching
- LSM in LLMs (SIGDIAL 2025) : https://aclanthology.org/2025.sigdial-1.50/
- Linguistic Convergence (EACL 2026) : https://aclanthology.org/2026.eacl-long.34/
- LLMs stick to point (SIGDIAL 2025) : https://aclanthology.org/2025.sigdial-1.16.pdf
- Accommodation Goes Both Ways : https://arxiv.org/abs/2605.29278

### Contrôle de génération
- CTG Survey : https://arxiv.org/abs/2408.12599
- Malleable Prompting : https://arxiv.org/abs/2604.10925
- Multi-Personality Generation : https://arxiv.org/abs/2511.01891
- LingGen (40 attributs) : https://aclanthology.org/2026.eacl-long.85.pdf

### Self-Rewriting / Auto-Debugging
- MOSS : https://arxiv.org/abs/2605.22794
- SICA : https://arxiv.org/abs/2504.15228
- Gödel Agent : https://arxiv.org/abs/2410.04444
- POLARIS : https://aclanthology.org/2026.findings-acl.1969.pdf
- ReflexiCoder : https://aclanthology.org/2026.findings-acl.1872/
- Self-Rewriting Reasoning (AAAI 2026) : https://ojs.aaai.org/index.php/AAAI/article/view/40738
- DebugHarness : https://arxiv.org/abs/2604.03610

### Usage Locks / Guardrails
- ILION : https://arxiv.org/abs/2603.13247
- AEGIS : https://github.com/Justin0504/Aegis
- Signet : https://github.com/thornveil-ai/signet
- LatchGate : https://github.com/latchgate-ai/latchgate
- Mirage : https://github.com/ysham123/Mirage
- Actenon : https://github.com/Actenon/actenon-kernel
- AgentLock : https://github.com/webpro255/agentlock
- Amazon Bedrock Guardrails : https://aws.amazon.com/blogs/machine-learning/safeguard-your-agentic-ai-applications-with-the-amazon-bedrock-guardrails-invokeguardrailchecks-api/

---

## 7. Décisions de périmètre

| Composant | Priorité | Statut |
|---|---|---|
| BEHAVIOR_PROFILE (type + table) | P1 | À créer dans `packages/shared` |
| Pipeline extracteur de style | P2 | Post-MVP : nécessite stockage + consentement |
| Profile steering (niveau 1) | P1 | Simple prompt sérialisé, viable tout de suite |
| Decoding-time control (niveau 2) | P3 | Post-MVP : infra LLM additionnelle |
| Behavior Graph visualisation | P3 | Hors scope V1 |
| Collecte automatique de style | P2 | Consentement requis, design à valider |
| **SELF_DEBUG cycle** (auto-debug) | P2 | Inspiré MOSS + Gödel Agent. À spécifier |
| **Audit chain cryptographique** | P3 | Hash chain + Ed25519 sur audit_logs |
| **Kill switch agent** | P2 | Révocation + blocage après N violations |
| **Proof-bound execution** | P3 | Actenon pattern, hors V1 |

**Décisions immédiates :**
1. Créer le type `BehaviorProfile` dans `packages/shared/src/schemas/`, status `future`
2. Les verrous d'usage existants (permission_runtime, action_engine, risk_level) sont suffisants pour V1. Durcissement cryptographique différé en V2.
3. Self-debugging : ne pas implémenter le cycle complet. Mais le pattern `resource_truth` + `action_engine` est réutilisable pour un cycle SELF_DEBUG si le besoin devient critique.

---

## 8. Risques identifiés

1. **Sur-ajustement** : les LLMs convergent naturellement vers le style utilisateur (Blevins EACL 2026). Risque d'imitation non consentie. Mitigation : `labelAsStylized`, `noImpersonation`.
2. **Consentement** : l'extraction de style nécessite un consentement explicite (GDPR/CNIL/AI Act). Mitigation : gate `consent_required` avant collecte.
3. **Dérive persona** : sans Dynamic Persona Coherence, le personnage peut dériver ou devenir rigide. Mitigation : architecturer L/M/S layers dès le design.
4. **Hallucination de style** : le LLM peut inventer des traits stylistiques non présents dans les sources. Mitigation : appliquer `resource_truth` (candidate → validated).

---

## 9. Prochaines étapes

1. [ ] Codex review le rapport complet (3 chantiers : EXPRESSIVE_CANON, SELF_DEBUG, USAGE_LOCKS)
2. [ ] Créer le type `BehaviorProfile` dans `packages/shared`
3. [ ] Ajouter la table `behavior_profiles` dans `schema.ts`
4. [ ] Concevoir le prompt steering (niveau 1) avec profil sérialisé
5. [ ] Spécifier le protocole de consentement pour extraction de style
6. [ ] Ajouter un kill switch agent (révocation + seuil de violations)
7. [ ] Documenter les 3 chantiers dans `SUIVI.md`
