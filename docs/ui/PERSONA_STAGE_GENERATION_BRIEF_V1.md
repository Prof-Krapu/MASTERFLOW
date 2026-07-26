# Persona Stage Generation Brief V1

Statut : brief de génération candidat
Owner : MALEX
Portée : MasterFlex + ProfKrapu, stage actors UI, Lab puis prototype
Source : DA Registry, D08 Visual Reference Gate, Persona Stage Actor Asset Pack V1

## Intention

Créer des packs de personnages d'interface en plan américain / bassin, utilisables à gauche ou à droite
du cockpit MasterFlow.

Le persona n'est pas une décoration. Il sert à rendre lisibles :

- qui parle ;
- quel type de réponse arrive ;
- si le système écoute, réfléchit, recadre, valide ou développe ;
- quand on passe d'une réponse courte à un tunnel long.

Le système doit être industrialisable : même grammaire d'états pour tous les personas, mais acting,
silhouette, costume, couleur et lore propres à chaque personnage.

## Sources De Vérité

| Source | Rôle |
|---|---|
| `apps/backend/src/seeds/visual_da_registry_seed.v1.json` | DA root, profils visuels, briques atomiques, acting narratif |
| `docs/d08/D08_VISUAL_REFERENCE_TAXONOMY_AND_FACTORY_REF_GATE_2026-06-27.md` | gate avant génération, candidate-only, anti-dérive |
| `docs/experience-fabric/DA_REGISTRY_NARRATIVE_ACTING_ABSORPTION_2026-06-30.md` | absorption DA + narrative acting |
| `docs/ui/PERSONA_STAGE_ACTOR_ASSET_PACK_V1.md` | format final du pack |
| `docs/ui/PERSONA_STAGE_LAYOUT_MATRIX_V1.md` | usage UI, tunnel, bulle, cockpit |
| assets actifs `apps/frontend/src/assets/` | références candidates de cadrage et identité |

## Règles Non Négociables

- Sortie = `generated_candidate`, jamais canon automatique.
- Pas d'intégration dans `/ui-reset` sans validation MALEX.
- Pas de remplacement des assets actifs pendant la génération.
- Pas de mélange de générations incohérentes dans un même pack.
- Même gabarit entre états : hauteur, ancrage bas, volume général et position de tête stables.
- Les variantes gauche/droite doivent être validées comme assets propres.
- Pas de texte, pas de bulle, pas de décor intégré dans l'image.
- Fond transparent final ; si fond chroma, il doit être simple et détourable.
- Rapport DA léger après sortie : respecté / dérive / action recommandée.

## DA Root Commune

MasterFlow Core :

- cartoon occidental adulte ;
- trait manuel vivant, asymétrie contrôlée ;
- émotion avant beauté ;
- silhouette lisible en miniature ;
- étrangeté contrôlée ;
- jamais photoréalisme ;
- jamais mascotte corporate ;
- jamais 3D glossy, vector lisse ou visage IA trop propre.

## États Communs V1

| État UI | Usage | Acting commun |
|---|---|---|
| `neutral` | repos | présence disponible, stable |
| `listening` | micro / écoute | attention orientée user |
| `thinking` | génération / réflexion | concentration, retenue, pas loading cartoon |
| `positive` | validation | bonne piste, accord contrôlé |
| `negative` | refus doux | limite claire, pas humiliant |
| `doubt` | précision nécessaire | incertitude, question courte |
| `warning` | action sensible | garde, alerte, sécurité |
| `explaining` | tunnel | prise de parole longue, énergie pédagogique |

## Lore MasterFlex

Rôle : persona lead créatif de MALEX, guide MasterFlow, graphiste-troll, gardien de la DA et du cap produit.

Traits :

- ours blanc cartoon adulte ;
- gavroche brune basse, large, une oreille partiellement couverte ;
- regard bleu intentionnel sous l'ombre de la casquette ;
- corps compact, centre de gravité bas ;
- veste denim bleue / silhouette lourde ;
- attitude sèche, lucide, drôle sans devenir clown ;
- présence "maître de cockpit", pas super-héros.

Acting par état :

| État | Direction d'acting MasterFlex |
|---|---|
| `neutral` | calme, bras croisés ou main contrôlée, regard prêt à répondre |
| `listening` | tête légèrement tournée vers le user, attention sous la casquette |
| `thinking` | sourcils actifs, regard de côté, posture retenue |
| `positive` | micro-sourire en coin, validation sobre |
| `negative` | regard froid mais pas agressif, bouche minimale |
| `doubt` | side-eye interrogatif, "tu vas m'expliquer ça proprement" |
| `warning` | posture de garde, épaules ancrées, autorité calme |
| `explaining` | posture plus ouverte, geste pédagogique, prêt pour tunnel long |

Negative locks MasterFlex :

- pas de visage humain ;
- pas de furry réaliste ;
- pas de mascotte cute ;
- pas de pose héroïque ;
- pas d'anime ;
- pas de sourire maniaque ;
- pas de costume qui change l'identité ;
- pas de logo inventé.

## Lore ProfKrapu

Rôle : persona Vincent, professeur science-pulp, précision scientifique, troll pédagogique sec.

Traits :

- humain stylisé franco-belge ;
- silhouette adulte, sèche, élégante ;
- lunettes noires épaisses ;
- barbe courte structurée ;
- blouse blanche propre ouverte ;
- t-shirt sombre avec molécule sobre ;
- accessoire science lisible mais pas gadget ;
- jamais copie photoréaliste de Vincent ;
- jamais savant fou générique.

Acting par état :

| État | Direction d'acting ProfKrapu |
|---|---|
| `neutral` | observation calme, posture professeur |
| `listening` | écoute analytique, stylo/craie prêt |
| `thinking` | regard derrière lunettes, raisonnement visible |
| `positive` | satisfaction précise, "là, ça réagit" |
| `negative` | correction sèche mais utile |
| `doubt` | suspicion logique, sourcil et bouche serrée |
| `warning` | sécurité / vérité scientifique avant style |
| `explaining` | démonstration, dataviz, molécule ou schéma contrôlé |

Negative locks ProfKrapu :

- pas de Doc Brown ;
- pas de blouse sale ;
- pas de boss final ;
- pas de cosplay combat ;
- pas de supériorité écrasante sur MasterFlex ;
- pas de biométrie / photo réaliste ;
- pas de science illisible ou décorative.

## Prompt Cadre Générique

```text
Create one generated_candidate UI stage actor asset for MasterFlow.

Character must be a transparent-background full character stage actor, cropped as an American shot / hips-up UI presence, anchored at the bottom, no speech bubble, no text, no decor.

Use the MasterFlow Core DA: adult western cartoon illustration, lively hand-drawn ink line, controlled texture, readable silhouette at small size, emotion before beauty, controlled strangeness. Not photorealistic, not glossy 3D, not smooth vector, not corporate mascot.

Keep the character identity, outfit, proportions, silhouette, head position and body scale consistent with the validated canon. Only the acting/expression/posture changes for the requested state.

Output should feel like a reusable interface actor, not a poster, not a scene, not a sticker sheet.
```

## Prompt MasterFlex — Base À Compléter Par État

```text
Character: MasterFlex, adult stylized polar bear cartoon, compact broad torso, low center of gravity, warm ivory white fur with pale blue-gray graphic shadows, large designed head, strong short muzzle, black cartoon nose, blue intentional gaze under a low wide brown gavroche cap, denim jacket, grounded boots if visible.

Lore: creative MasterFlow lead persona, dry graphic-design troll, lucid guide, calm authority, never heroic, never cute mascot.

Strict locks: keep the brown gavroche cap wide and low, one ear partly tucked, keep the denim outfit and heavy compact silhouette, keep the blue eyes and handmade fur strokes. No human face, no photoreal bear, no plush, no anime, no superhero pose.

State to generate: {{state}}
Acting: {{state_acting}}
Direction: {{left_or_right}}
```

## Prompt ProfKrapu — Base À Compléter Par État

```text
Character: ProfKrapu, stylized adult human teacher in expressive Franco-Belgian science-pulp cartoon DA, tall lean elegant silhouette, black wayfarer glasses, short structured beard, clean open white lab coat, dark molecular t-shirt, sober bermuda, simple sneakers, one clean science prop if useful.

Lore: Vincent persona, precise physics-chemistry teacher, dry pedagogical troll, useful before stylish, science clarity before spectacle.

Strict locks: keep black glasses, clean lab coat, molecule cue, stylized non-photoreal face, controlled comic timing. No biometric copy, no generic mad scientist, no dirty coat, no Doc Brown, no boss final, no fighting-game cosplay.

State to generate: {{state}}
Acting: {{state_acting}}
Direction: {{left_or_right}}
```

## Ordre De Génération Recommandé

1. MasterFlex `neutral-left` en grand format candidat.
2. Valider gabarit et DA.
3. MasterFlex `neutral-right`.
4. Générer les 7 autres états en conservant le gabarit.
5. Planche contact 8 x 2.
6. Correction du pack complet si gabarit instable.
7. Répéter pour ProfKrapu.

On ne génère pas tout si le neutre dérive. Le neutre sert de verrou.

## Rapport DA Léger Après Sortie

```yaml
post_generation_da_report:
  persona:
  state:
  direction:
  output_status: generated_candidate
  respected:
    - da_root
    - canon_identity
    - outfit_lock
    - silhouette_lock
    - acting_state
  drift:
    - element:
      severity:
      note:
  recommended_action: approve_for_contact_sheet | revise_prompt | reject
```

## Prochaine Action

Attendre `GO IMAGE` explicite, puis générer uniquement `MasterFlex neutral-left` comme premier candidat.
