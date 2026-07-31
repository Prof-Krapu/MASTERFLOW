# ProfKrapu Canon Reboot Brief — 2026-07-27

Statut : `canon_reboot_promoted`
Portee : nouveau visuel canon en pied ProfKrapu, avant nouveau pack Stage Actor.

## Diagnostic

Le visuel full-body ProfKrapu actuel est exploitable comme preuve de pipeline, mais il derive trop :

- proportions trop humaines ;
- corps trop maigre / trop "prof realiste" ;
- cheveux trop longs ou trop clairs selon sorties ;
- bermuda trop short ou trop pantalon de ville ;
- acting trop pose, pas assez BD ;
- direction gauche/droite instable dans les assets Stage Actor ;
- lunettes et chroma doivent etre mieux anticipes.

Les portraits UI ProfKrapu restent valides et doivent servir d'autorite visage.

## Sources

Sources repo :

- `apps/frontend/src/assets/profkrapu-portraits/neutral.png`
- `apps/frontend/src/assets/profkrapu-portraits/*.png`
- `apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v3.png` comme ancienne piste, pas autorite finale.

Sources Factory :

- `/Users/malex/Desktop/FACTORIES/PROF_KRAPU_FACTORY/CURRENT/PROF_KRAPU_GPT_CUSTOM_READY_V2_2_SAFE/UPLOAD_KNOWLEDGE/02_OUTPUTS_YOUTUBE_SOCIAL_MONSTERS.md`
- `/Users/malex/Desktop/FACTORIES/PROF_KRAPU_FACTORY/CURRENT/PROF_KRAPU_GPT_CUSTOM_READY_V2_2_SAFE/UPLOAD_KNOWLEDGE/05_SHARED_DA_COMPILER_REFERENCE_ROUTER.md`
- `/Users/malex/Desktop/FACTORIES/PROF_KRAPU_FACTORY/CURRENT/PROF_KRAPU_GPT_CUSTOM_READY_V2_2_SAFE/VISUAL_REFERENCE_BOARDS/REF_BOARD_01_PROF_KRAPU_CANON_STYLE.png`

Veille rapide :

- Ligne claire : contours nets, couleurs lisibles, peu de bruit, lecture immediate.
- Marcinelle / Franquin : acting corporel, elasticite, timing facial, gros nez/expressivite, silhouette qui raconte.

Conclusion DA : ProfKrapu ne doit pas etre une ligne claire froide. Il doit etre un hybride MasterFlow :

`ligne claire lisible + acting Marcinelle + science-pulp pedagogique`.

## Canon A Conserver

- ProfKrapu est un humain stylise franco-belge.
- Lunettes noires epaisses obligatoires.
- Barbe courte structuree.
- Cheveux tres courts, noirs ou brun tres fonce.
- Regard analytique, side-eye sec, troll pedagogique.
- Blouse blanche propre, ouverte, bien coupee.
- T-shirt sombre avec molecule sobre.
- Bermuda propre, plus proche d'un vrai bermuda que d'un short court.
- Sneakers simples type NB 574 / Veja, lisibles mais pas fashion show.
- Accessoire utile : craie, carnet de recherche use, tablette ou petit objet science-pedago.

## Corrections De Morphologie

Le nouveau canon doit verrouiller :

- tete plus grande que le canon actuel ;
- rapport tete/corps plus cartoon, sans chibi ;
- corps moins maigre, plus dense, professeur BD solide ;
- jambes moins longues et moins seches ;
- posture plus theatrale, plus fun, moins photo de fiche personnage ;
- silhouette globale lisible a petite taille ;
- visage plus proche des portraits UI valides.

Ratio cible :

- hauteur totale : format vertical canon MasterFlow ;
- tete : environ 18-22 % de la hauteur utile ;
- epaules : lisibles, pas etroites ;
- bermuda : longueur au-dessus du genou / genou, propre, sans poches cargo ;
- chaussures : presentes, ancrage stable.

## Acting Canon Neutral

Neutral ne veut pas dire mou.

Direction :

- posture professeur disponible ;
- une main peut tenir une craie ou un carnet, mais pas gadget ;
- expression : suspicion calme, "je vous ecoute, mais sortez les preuves" ;
- attitude : intelligent, sec, joueur, pas malade, pas vieux, pas realiste.

## Negative Locks

Interdit :

- photorealisme ;
- copie biometrie Vincent ;
- savant fou generique ;
- Doc Brown ;
- boss final ;
- cosplay combat ;
- blouse sale ;
- taches de peinture ;
- lunettes absentes ;
- cheveux longs ;
- cheveux blonds/cuivres dominants ;
- short trop court ;
- poches cargo ;
- jambes filiformes ;
- corps de super-heros ;
- tete trop petite ;
- mascotte corporate ;
- style comic US ;
- anime ;
- posture statique de catalogue.

## Prompt Canon Neutral V1

```text
Use case: illustration-story
Asset type: MasterFlow ProfKrapu full-body canon candidate, future UI persona stage actor base

Input image roles:
- ProfKrapu portrait neutral: strict face identity, glasses, beard, expression authority.
- ProfKrapu factory canon board: DA and morphology candidate reference, not a sheet to copy literally.
- Previous ProfKrapu canon V3: outfit/function reference only; do not preserve its too-human proportions.

Create one full-body ProfKrapu canon candidate on a perfectly flat solid #ff00ff chroma-key background.

Character:
ProfKrapu, stylized adult human physics-chemistry teacher, Franco-Belgian cartoon, science-pulp pedagogy, dry analytical troll.

Design direction:
More Franquin / Marcinelle acting than US comic.
Readable ligne claire structure, lively flexible ink, clean shapes, expressive face and hands, clear silhouette.
Head-to-body ratio more cartoon than the current canon: larger head, shorter denser body, less skinny, more theatrical.
Not chibi, not cute, not childish.

Face:
Use the validated ProfKrapu portrait as authority.
Very short black or very dark hair.
Thick black wayfarer glasses mandatory.
Short structured beard.
Suspicious analytical side-eye, dry teacher energy.
Large expressive nose, eyebrows, jaw and mouth acting, caricature pushed 25-35 percent.

Outfit:
Clean open well-cut white lab coat, absolutely no stains.
Dark t-shirt with one sober molecule cue.
Clean sober bermuda, longer than shorts, no cargo pockets.
Simple NB 574 / Veja-like sneakers.
One useful science-teacher prop only: chalk or worn research notebook.

Pose:
Neutral but alive.
Professor posture, slightly theatrical, one hand useful, body tells "I am listening but bring evidence".
Full body, shoes visible, centered, bottom anchored, generous padding.

Style:
MasterFlow handmade cartoon DA.
Franco-Belgian science-pulp, clear line readability plus Marcinelle expressive acting.
Flat readable colors, controlled texture, not glossy, not realistic.

Avoid:
photorealism, biometric portrait, Doc Brown, mad scientist cliche, old sick professor, anime, US superhero comic, boss final, corporate mascot, dirty lab coat, paint splashes, cargo shorts, huge thigh pockets, skinny fashion body, long hair, missing glasses, glassware everywhere, unreadable text, second character, speech bubble, logo, watermark, shadows or gradients in the background.
```

## Process

1. Generer une seule candidate neutral full-body.
2. Revue MALEX : proportions, visage, fun, bermuda, cheveux, acting.
3. Si OK : detourage / normalisation canon.
4. Ensuite seulement : declinaisons Stage Actor left/right avec contrat directionnel strict.
5. Ancien pack Stage Actor ProfKrapu reste candidat technique, non canon.

## Contrat Directionnel Stage Actor

Cette regle reprend le principe pose pendant le pack MasterFlex : les versions `left`
et `right` ne sont pas de simples variantes de pose.

Definition UI :

- `left` = asset place sur le bord gauche de l'interface, regard et torse orientes vers le centre/droite.
- `right` = asset place sur le bord droit de l'interface, regard et torse orientes vers le centre/gauche.
- le couple doit fonctionner en champ/contrechamp, comme deux personnages qui peuvent dialoguer a travers le centre de l'ecran.
- `right` n'est pas un miroir mecanique, mais il doit clairement lire comme le pendant de bord droit.
- une version qui regarde deja vers le bon cote en canon n'est pas automatiquement une bonne version `left/right`.

Regle pratique :

1. generer d'abord un `left` fort ;
2. valider la lecture depuis le bord gauche ;
3. generer ensuite le `right` depuis le `left` valide + canon V4 ;
4. verifier que le `right` regarde franchement vers le centre/gauche ;
5. normaliser la hauteur de silhouette et la baseline comme MasterFlex.

Prompt commun a reinjecter :

```text
This is a UI edge actor, not a generic character pose.
LEFT means: the character stands on the left edge of the interface and clearly faces inward toward the center/right.
RIGHT means: the character stands on the right edge of the interface and clearly faces inward toward the center/left.
Create a shot/reverse-shot pair for interface dialogue.
Do not create two almost identical three-quarter poses.
Do not mechanically mirror hands or props.
Keep the same actor, outfit, proportions, baseline and crop.
```

## Candidate 01 → Canon V4

Fichier :

Raw :

`apps/frontend/src/assets/profkrapu-canon/candidates/reboot-20260727/raw/profkrapu-canon-reboot-candidate-01.png`

Alpha :

`apps/frontend/src/assets/profkrapu-canon/candidates/reboot-20260727/alpha/profkrapu-canon-reboot-candidate-01-alpha.png`

Normalise :

`apps/frontend/src/assets/profkrapu-canon/candidates/reboot-20260727/normalized/profkrapu-canon-reboot-candidate-01-829x1500.png`

Statut : `promoted_to_active_canon_v4`

Ce qui avance :

- cheveux plus courts ;
- tenue plus propre ;
- bermuda plus proche de la demande ;
- accessoire carnet plus utile que fiole gratuite ;
- silhouette plus exploitable que le pack Stage Actor derive.

Points a verifier / corriger avant canon :

- tete encore probablement trop petite ;
- corps encore trop longiligne ;
- acting encore trop sage ;
- il faut pousser davantage la caricature franco-belge / Marcinelle ;
- il faut verifier avec MALEX si le carnet est le bon accessoire neutral.

Decision : MALEX valide la direction. La source normalisee est promue en :

`apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v4.png`

Usage : `/ui-reset` + `/ui-lab`. L'ancien `v3` reste une preuve locale, mais ne guide plus la DA.

Prochaine vague : regenerer les Stage Actors ProfKrapu depuis `v4`, pas depuis le pack 2026-07-26.

## Stage Actor Reboot — Direction Draft

Fichiers bruts :

- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/raw/neutral-left.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/raw/neutral-right.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/raw/listening-left.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/raw/listening-right.png`

Fichiers alpha :

- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/alpha/neutral-left.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/alpha/neutral-right.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/alpha/listening-left.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/alpha/listening-right.png`

Fichiers normalises :

- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/normalized/neutral-left.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/normalized/neutral-right.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/normalized/listening-left.png`
- `apps/frontend/src/assets/profkrapu-stage-actor/archive-process/reboot-20260727/normalized/listening-right.png`

Statut : `direction_draft_archived`

Decision : utile comme preuve de generation et de gabarit, mais pas assez clair pour le contrat `left/right`.

Lecture MALEX :

- le canon V4 est dans le bon sens et reste valide ;
- les declinaisons `left/right` sont trop proches ;
- il faut reprendre le brief MasterFlex : bord gauche/bord droit, champ/contrechamp, regard interieur explicite.

Suite : refaire `neutral-left` uniquement avec le contrat directionnel, valider, puis produire `neutral-right`.
Les etats suivants restent en attente.

## Stage Actor Directional V2 — Neutral Left

Fichier brut :

`apps/frontend/src/assets/profkrapu-stage-actor/rejected/reboot-20260730-directional/neutral-left-wrong-direction.png`

Statut : `rejected`

Correction recherchee :

- lecture bord gauche plus explicite ;
- regard et torse orientes vers centre/droite ;
- vraie pose UI edge actor, pas variante canon frontale ;
- carnet conserve en accessoire secondaire ;
- main ouverte vers le centre, utile pour la prise de parole.

Decision : orientation et alpha non conformes. Conserver comme preuve de dérive uniquement et ne
pas générer le `neutral-right` depuis ce fichier.
