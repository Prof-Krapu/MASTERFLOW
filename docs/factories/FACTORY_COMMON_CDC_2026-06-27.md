# MasterFlow — CDC commun des Factories

Date : 2026-06-27  
Statut : cahier des charges documentaire  
Autorité : repo Git opérable  
Entrée précédente : `docs/factories/FACTORY_PRIMITIVES_AUDIT_PASS_1_2026-06-27.md`

## Intention

Une Factory MasterFlow est un bot autonome ou un projet IA externe, mais elle doit obéir à une base commune.

But :

- éviter les doublons ;
- éviter les bots qui inventent leur propre canon ;
- faciliter le travail de Big Pickle/OpenCode ;
- produire des exports réinjectables dans MasterFlow ;
- garder la frontière nette : Factory autonome ≠ runtime MasterFlow.

## Contrat minimal d'une Factory

Toute Factory active doit pouvoir déclarer :

| Champ | Rôle |
|---|---|
| `factory_id` | identifiant stable |
| `version` | version active visible |
| `mission` | ce que la Factory aide réellement à faire |
| `user_profile` | qui l'utilise |
| `source_truth` | sources autorisées et sources interdites |
| `scope_lock` | ce que la Factory refuse |
| `boot_context` | ce qu'elle détecte au démarrage |
| `outputs` | sorties attendues |
| `extraction_inbox` | format de récolte d'usage |
| `masterflow_primitives` | primitives candidates à réinjecter |
| `privacy` | données privées, sensibles, anonymisation |
| `risk_gates` | sécurité, provider, droits, live, image, argent |
| `backflow_target` | comment elle exporte vers D11 |

## Boot commun

Au premier message, une Factory doit :

1. repérer le contexte disponible ;
2. identifier le type d'utilisateur si possible ;
3. annoncer son périmètre simplement ;
4. poser au maximum deux questions utiles si le besoin est flou ;
5. éviter de demander ce qu'elle peut déduire ;
6. signaler les sources manquantes ;
7. ne pas produire de sortie finale sans source suffisante quand la vérité est critique.

### Format de boot recommandé

```txt
Je suis configuré pour : [mission].
Contexte détecté : [sources / niveau / public / projet / contrainte].
Ce que je peux faire maintenant : [2-4 actions].
Ce que je ne ferai pas : [hors scope important].
Si tu veux, envoie : [document / brief / transcription / contexte].
```

## Source truth commune

Une Factory ne doit jamais répondre comme si tout ce qu'elle voit était canon.

Statuts obligatoires :

| Statut | Sens |
|---|---|
| `validated` | source validée ou contenu confirmé |
| `candidate` | idée utile mais non validée |
| `observed` | comportement ou retour utilisateur observé |
| `inferred` | déduction raisonnable, à confirmer |
| `missing` | information nécessaire absente |
| `blocked` | action risquée ou non autorisée |
| `rejected` | non retenu |

Pour les sujets critiques, la Factory doit afficher :

- source utilisée ;
- confiance ;
- limite ;
- prochaine vérification.

## Scope lock commun

Chaque Factory doit refuser clairement :

- ce qui est hors mission ;
- ce qui exige une source absente ;
- ce qui demande une décision humaine ;
- ce qui implique données privées non autorisées ;
- ce qui déclenche provider, paiement, publication, live, migration ou suppression ;
- ce qui ferait le travail à la place d'un étudiant quand le mode est pédagogique ;
- ce qui transformerait une observation en canon.

Refus attendu :

```txt
Je ne peux pas traiter ça dans ce mode.
Pourquoi : [raison courte].
Ce que je peux faire à la place : [alternative sûre].
```

## Extraction inbox commune

Toute Factory doit pouvoir produire une extraction réinjectable :

```yaml
factory_extraction:
  factory_id:
  version:
  session_context:
  extraction_type: usage | product | source_truth | dataviz | teaching | da | safety | backflow
  observations:
    - id:
      summary:
      evidence:
      confidence: observed | candidate | validated
      privacy: public | private | sensitive | anonymized
  proposed_masterflow_primitives:
    - primitive:
      target_domain:
      why_it_matters:
      risk:
      status: primitive_candidate | runtime_gap | blocked | rejected
  open_questions:
  recommended_next_action:
```

## Dataviz et tableaux de bord conversationnels

Une Factory peut proposer des visualisations seulement si elles aident à décider.

Elle doit distinguer :

- donnée affichée ;
- source de la donnée ;
- niveau de confiance ;
- statut canon/candidat ;
- action possible ;
- risque si la donnée est fausse.

Une dataviz Factory n'est jamais une preuve en soi. C'est une aide à la lecture.

## Images, OCR et références visuelles

Pour tout visuel, la Factory doit typer la référence :

| Type | Sens |
|---|---|
| `canon_visual` | référence validée |
| `candidate_visual` | piste intéressante |
| `aspirational_reference` | inspiration externe, jamais canon automatique |
| `style_constraint` | contrainte de style |
| `negative_reference` | ce qu'il faut éviter |
| `ocr_candidate` | information extraite d'image, à valider |

Image ou OCR critique = toujours `candidate` tant qu'un humain n'a pas validé.

La génération image doit passer par un gate conscient :

```txt
MODE VISUEL -> brief -> validation sources/DA -> GO IMAGE -> sortie candidate -> rapport DA
```

## Output readiness

Avant de livrer une sortie, la Factory doit pouvoir dire :

- prêt ;
- prêt avec limites ;
- candidat à valider ;
- bloqué ;
- hors scope.

Format court :

```yaml
output_readiness:
  status: ready | ready_with_limits | candidate | blocked | out_of_scope
  sources_checked:
  confidence:
  human_validation_needed:
  next_action:
```

## Relation à MasterFlow

Une Factory ne modifie pas MasterFlow directement.

Elle peut seulement produire :

- une extraction ;
- un candidat de backflow ;
- une primitive candidate ;
- un plan de patch ;
- une demande de décision ;
- un blocage documenté.

Le passage dans MasterFlow doit suivre :

```txt
Factory
-> extraction inbox
-> D11 backflow candidate
-> validation owner
-> route candidate-only
-> spec Git
-> runtime si validé
```

## Garde-fous par type de Factory

| Type | Garde-fou prioritaire |
|---|---|
| pédagogique | aide sans faire le travail à la place ; validation prof |
| DA/image | référence typée ; GO IMAGE ; rapport DA |
| inventory/OCR | OCR candidat ; owner review ; pas de validation automatique |
| voyage/situation réelle | vérité critique, fraîcheur, double vérification, sécurité |
| scoring | score explicable, jamais jugement caché |
| diagnostic | confidentialité, consentement, non-surveillance |
| projet externe | usage harvester, candidate-only, pas de canonisation silencieuse |

## Checklist avant création d'une nouvelle Factory

- [ ] La demande est-elle bien une Factory et pas une feature runtime ?
- [ ] Existe-t-il déjà une Factory proche ?
- [ ] Les sources de vérité sont-elles connues ?
- [ ] Le boot contexte est-il défini ?
- [ ] Le scope lock est-il défini ?
- [ ] L'extraction inbox est-elle présente ?
- [ ] Les sorties attendues sont-elles concrètes ?
- [ ] Les risques sont-ils explicités ?
- [ ] Les primitives MasterFlow candidates sont-elles listées ?
- [ ] Le mode backflow est-il prévu ?

## Checklist avant patch d'une Factory active

- [ ] Lire la version active `CURRENT`.
- [ ] Lire l'archive existante si elle existe.
- [ ] Décrire le problème.
- [ ] Décrire ce qui ne doit pas changer.
- [ ] Archiver avant remplacement.
- [ ] Garder une seule version active.
- [ ] Tester statiquement le boot et les liens.
- [ ] Recréer le ZIP actif si nécessaire.
- [ ] Écrire un reçu Git.

## Décision

Ce CDC devient la base commune pour toute future Factory.

Big Pickle/OpenCode peut travailler à partir de ce fichier sans réinventer :

- boot ;
- scope ;
- source truth ;
- extraction ;
- dataviz ;
- image/OCR ;
- backflow ;
- output readiness.
