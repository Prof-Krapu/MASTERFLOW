# MasterFlow Identity Forge — Tunnel Contract V1

Date : 2026-07-02  
Statut : `future_product_contract_candidate`  
Surface future : tunnel d’introduction / DA Studio / profil persona

## Intention

Identity Forge transforme l’enquête d’introduction d’un utilisateur en identité visuelle cohérente,
versionnée et validée.

Le système ne promet pas une génération parfaite. Il garantit qu’aucune dérive, erreur de
détourage ou mauvaise ressemblance ne devient canon silencieusement.

## Frontières

- Le tunnel d’introduction orchestre le processus.
- DA Studio porte les presets, contrôles et assets candidats.
- Le profil utilisateur ne consomme que des assets validés.
- Une photo sert de référence de ressemblance, jamais de preuve d’identité.
- L’analyse d’une photo relève de la vision.
- L’OCR reste réservé au texte présent dans des documents ou images.
- Aucun asset candidat n’accorde de permission et ne modifie le canon automatiquement.

## Entrées

### Enquête Utilisateur

- nom ou nom de persona ;
- rôle et usages attendus ;
- univers, ton et niveau de fantaisie ;
- traits visuels souhaités ;
- vêtements et accessoires ;
- couleurs préférées et interdites ;
- limites de représentation ;
- préférences institutionnelles ou RPG ;
- consentement et durée de conservation.

### Références Facultatives

- photos de ressemblance ;
- dessins ou avatars existants ;
- planches de style ;
- références de costume ;
- documents à analyser par OCR si du texte doit être extrait.

Les références doivent recevoir un rôle explicite : identité, style, costume, cadrage ou ambiance.

## Sorties Candidates

- `PersonaIdentityBrief` : identité, DA, invariants et interdits ;
- `CanonPortraitCandidate` : portrait neutre ;
- `IdentityStatePackCandidate` : états expressifs ;
- `CanonFullBodyCandidate` : visuel canon en pied ;
- `PersonaPaletteCandidate` : couleurs UI et persona validées ;
- `IdentityGenerationReceipt` : sources, prompt, modèle, preset, contrôles et résultat ;
- `PersonaIdentityPackCandidate` : paquet final soumis à validation.

## Machine D’États

```text
not_started
  -> consent_pending
  -> interview_active
  -> references_pending
  -> brief_review
  -> neutral_candidate
  -> neutral_review
  -> identity_locked
  -> expressions_candidate
  -> full_body_candidate
  -> automated_qa
  -> final_review
  -> active
```

Sorties alternatives :

- `needs_revision`
- `blocked_missing_consent`
- `blocked_quality_failure`
- `rejected`
- `revoked`
- `archived`

## Gates Humains

### Gate 1 — Consentement

Avant toute analyse de photo :

- finalité expliquée ;
- consentement explicite ;
- durée de conservation choisie ;
- suppression et révocation possibles.

### Gate 2 — Portrait Neutre

Le portrait neutre doit être validé avant toute déclinaison.

Cette validation verrouille :

- visage et âge apparent ;
- proportions ;
- coiffure, lunettes et signes distinctifs ;
- costume principal ;
- angle et cadrage ;
- langage graphique.

### Gate 3 — Pack Final

L’utilisateur compare le portrait, les expressions, le canon en pied et la palette. Le pack reste
`candidate` tant que cette validation n’est pas obtenue.

## Pipeline Visuel

1. Compiler l’enquête et les références dans `PersonaIdentityBrief`.
2. Vérifier les contradictions et demander uniquement les décisions produit bloquantes.
3. Générer un portrait neutre candidat.
4. Valider ou réviser le neutre sur un seul axe à la fois.
5. Verrouiller le neutre comme autorité d’identité.
6. Générer les états expressifs depuis ce neutre.
7. Recomposer les expressions sur le gabarit invariant.
8. Générer le canon en pied avec rôles de référence explicites.
9. Produire l’alpha selon le niveau de complexité de l’asset.
10. Normaliser dimensions, marges, bbox et centre visuel.
11. Exécuter les contrôles automatiques.
12. Présenter une planche de validation courte.
13. Activer uniquement le pack validé.

Procédures techniques :

- `docs/theme-studio/MASTERFLOW_PERSONA_ASSET_RUNBOOK_V1.md`
- `docs/theme-studio/MASTERFLOW_ID_ASSET_PIPELINE_V1.md`

## Contrôles Automatiques

### Identité

- dérive du visage ;
- changement d’âge apparent ;
- changement de costume ou accessoire verrouillé ;
- incohérence de style ;
- changement involontaire de morphologie.

### Fichiers

- format PNG RGBA ;
- dimensions attendues ;
- bbox et centre visuel ;
- marges de sécurité ;
- alpha valide ;
- absence de fichiers manquants.

### Détourage

- chroma résiduel extérieur ;
- chroma enfermé dans lunettes, fioles ou contours ;
- trous nouveaux dans peau, visage, mains ou vêtements ;
- halo ou spill excessif ;
- perte de détails sur les bords.

### Série D’États

- même gabarit ;
- même silhouette ;
- même position de tête et d’épaules ;
- expression lisible à petite taille ;
- transition sans saut ;
- aucun état dupliqué ou absent.

Un échec place le pack en `blocked_quality_failure` ou `needs_revision`. Il ne déclenche jamais un
fallback silencieux vers un asset dégradé.

## Données Et Vie Privée

- photos sources privées et non publiques par défaut ;
- chiffrement et contrôle d’accès au stockage ;
- journal des traitements ;
- pas d’inférence d’origine, santé, religion, orientation ou autre donnée sensible ;
- pas d’usage biométrique ou d’authentification ;
- révocation du consentement effective ;
- suppression possible des sources sans casser les assets déjà validés, selon le choix utilisateur ;
- aucune réutilisation comme référence pour un autre utilisateur.

## Expérience Tunnel

Le tunnel doit rester court et progressif :

1. discussion de profil ;
2. choix du niveau de personnalisation ;
3. ajout facultatif de références ;
4. validation du brief ;
5. validation du portrait neutre ;
6. préparation des autres assets en tâche de fond ;
7. validation finale depuis le profil ou DA Studio.

Pendant la génération, un asset par défaut peut être affiché. Il doit être explicitement présenté
comme temporaire et ne doit pas remplacer automatiquement un canon déjà validé.

## Contrat De Fiabilité

Identity Forge est considéré fiable si :

- chaque étape laisse un reçu ;
- chaque sortie possède un statut ;
- chaque référence possède un rôle ;
- chaque échec est visible et récupérable ;
- chaque version canon peut être restaurée ;
- aucune photo n’est traitée sans consentement ;
- aucun candidat ne devient actif sans gate humain ;
- le système sait s’arrêter plutôt que d’inventer ou dégrader.

## Hors Scope V1

- authentification biométrique ;
- entraînement automatique sur les photos utilisateurs ;
- publication automatique ;
- génération sans consentement ;
- remplacement silencieux d’un canon actif ;
- inférence sensible ;
- canonisation entièrement autonome.

## Prochaines Fondations Techniques

À construire seulement après validation produit :

- schémas partagés des candidats et reçus ;
- registre versionné des packs d’identité ;
- stockage privé et politique de rétention ;
- runner de contrôles visuels ;
- queue de génération avec `needs_review` ;
- surface tunnel d’introduction ;
- surface de validation dans DA Studio ;
- restauration d’une version précédente.
