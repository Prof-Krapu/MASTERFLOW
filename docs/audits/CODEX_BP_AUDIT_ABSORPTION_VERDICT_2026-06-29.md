# Verdict Codex — absorption des audits Big Pickle du 29/06

Date : 2026-06-29  
Statut : arbitrage Git opérable, sans implémentation runtime

## Résumé

Les rapports Big Pickle contiennent des pistes utiles, mais ne doivent pas être exécutés comme une
queue. Ils servent de matière d'audit à confronter au MasterFlow réel.

Verdict :

- absorber les idées en primitives MasterFlow ;
- corriger les propositions qui recréent des moteurs parallèles ;
- garder Big Pickle en pause tant qu'aucune tâche mécanique bornée n'est écrite dans l'inbox unique ;
- ne pas lancer provider, OCR, LMS, avatar swap, self-debug ou migration sensible depuis ces rapports.

## Sources lues

Rapports Big Pickle :

- `EXPRESSIVE_CANON_BEHAVIOR_GRAPH_AUDIT_2026-06-29.md`
- `VISION_PRODUCT_ABSORPTION_AUDIT_2026-06-29.md`
- `FACTORIES_VS_MASTERFLOW_CONFRONTATION_AUDIT_2026-06-29.md`
- rapports historiques du 27/06 : D08, OCR, Boot Context, Factories Backflow, synthèse master audit.

Sources externes utiles, à considérer comme appuis et non comme autorisations d'implémentation :

- Persona / personnalisation : `https://arxiv.org/abs/2406.01171`
- Contrôle de génération : `https://arxiv.org/abs/2408.12599`
- Style control avancé : `https://aclanthology.org/2025.acl-long.767/`
- Language Style Matching : `https://aclanthology.org/2025.sigdial-1.50/`
- Progressive disclosure : `https://www.nngroup.com/articles/progressive-disclosure/`
- HITL / validation humaine : `https://openai.github.io/openai-agents-js/guides/human-in-the-loop/`
- Design tokens : `https://www.w3.org/community/design-tokens/`
- C2PA / provenance : `https://spec.c2pa.org/specifications/specifications/2.3/specs/C2PA_Specification.html`

## Arbitrage par rapport au MasterFlow réel

| Sujet | Verdict Codex | Pourquoi |
|---|---|---|
| EXPRESSIVE_CANON | À absorber via Style Mirror | `style_mirror_profiles`, routes et injection chat existent déjà. Créer `behavior_profiles` ferait un doublon. |
| Behavior Graph | Concept utile, P2/P3 | P1 doit rester profil expressif borné, consenti et prompt-only. Pas de psychologie inférée ni collecte automatique. |
| Prompt steering style | P1 | Le chat n'utilise pas encore le `project_id` pour sélectionner le profil projet et ignore une partie des contrôles existants. |
| UX progressive | P1 UI | Cohérent avec Home légère, modes à la demande et preflight visible. |
| Preflight visible | P1 UI | Le moteur backend existe ; il manque la surface utilisateur explicable. |
| Zettelkasten / notes | À absorber via Knowledge Fabric | `memory_cards` et liens existent. Ne pas créer un deuxième cerveau sans preuve de besoin. |
| Theme Studio / design tokens | P1/P2 ciblé | `ThemePack` existe déjà. Prochaine étape : stockage, application UI, export DTCG et lint. |
| Factories | Primitives seulement | Les factories restent des bots Desktop. Git n'absorbe ni packs complets ni audits détaillés, seulement les primitives validées. |
| C2PA | Futur | Pertinent pour assets/outputs, mais après Output Registry et pipeline média mature. |
| LMS / Learn bridge | Futur après Pedago Core | Ne pas brancher LTI/xAPI avant d'avoir le modèle pédagogique interne stable. |
| OCR / image provider / avatar swap | Bloqué décision | Données sensibles, providers et consentements. Pas de lancement implicite. |
| Self-debug / kill switch / audit crypto | Chantiers séparés | Ce ne sont pas des sous-tâches EXPRESSIVE_CANON. |

## Décisions P1

1. **EXPRESSIVE_CANON P1 = Style Mirror hardening.**
   - Ajouter consentement, validation sujet, source refs sans texte brut, config expressive bornée.
   - Injecter seulement profil actif + consenti + validé.
   - Passer le `project_id` réel dans le chat.
   - Limiter le bloc expressif et préserver le persona canon comme porte-parole unique.

2. **Vision Product Absorption = roadmap par primitives.**
   - UX progressive et preflight UI : à remonter dans le chantier interface.
   - Notes/backlinks : uniquement comme extension Knowledge Fabric.
   - Theme Studio : prolonger `ThemePack`, pas nouveau moteur DA.
   - Output/LMS/C2PA/OCR : tranches futures avec contrats et consentements séparés.

3. **Factories = atelier externe + backflow maîtrisé.**
   - Ne pas importer de factory entière.
   - Créer plus tard un validateur de pack si besoin : anonymisation, doublons, refs externes, scope lock, manifest.
   - Toute idée factory utile doit devenir une fiche primitive courte avant intégration.

## Non-objectifs immédiats

- pas de table `behavior_profiles` ;
- pas de collecte automatique de style ;
- pas de Big Five, diagnostic psychologique ou profil sensible ;
- pas de génération image réelle ;
- pas d'OCR/provider ;
- pas d'avatar swap ;
- pas de LMS ;
- pas de C2PA runtime ;
- pas de self-debug ;
- pas d'import massif de factories.

## Prochaine vague recommandée

`EXPRESSIVE-CANON-P1` : durcir Style Mirror, tests inclus, en PR atomique.

Critère de succès simple : un style non consenti ou révoqué n'est jamais injecté, un professeur ne
peut pas activer le style d'un étudiant, et une room projet sélectionne réellement le profil projet.
