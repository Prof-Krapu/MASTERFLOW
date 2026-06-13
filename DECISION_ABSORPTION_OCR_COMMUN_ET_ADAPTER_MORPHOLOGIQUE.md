# DÉCISION — Absorption du socle OCR commun et adapter morphologique

Statut : `DECISION MALEX / FOUNDATION DECLARED / 2026-06-13`

## Décision

Le protocole OCR multimodal construit par Vincent doit être conservé, audité, amélioré et absorbé
comme runner commun MasterFlow.

Il ne doit pas rester prisonnier de Corrector et ne doit pas être recopié intégralement pour
chaque usage.

```text
runner commun ocr_multimodal
-> adapter copie
-> adapter inventaire
-> adapter document/rubrique
-> adapter référence morphologique
-> futurs adapters spécialisés
```

Le runner mutualise l'infrastructure. Chaque adapter conserve ses propres contrats, permissions,
schémas de sortie, privacy, gates et validation.

## Adapter morphologique

Le canon Drive prévoit déjà :

- `MORPHOLOGICAL_REFERENCE_OCR_AND_CANON_HINTS_CONTRACT.md` ;
- `MORPHOLOGICAL_REFERENCE_OCR_PROCESS_AUDIT_2026-05-17.md` ;
- `USER_CANON_PASSPORT_AND_INVITATION_ONBOARDING_CONTRACT.md` ;
- `OURS_DOR_PHOTO_OCR_TO_AVATAR_COMFY_PIPELINE.md`.

L'adapter `morphological-reference-v1` produit un `MorphologicalHintProfile` privé :

- proportions et silhouette stylisables ;
- posture et énergie visuelle ;
- amplitude expressive ;
- coiffure, lunettes et accessoires identitaires ;
- invariants et changements interdits ;
- confiance d'extraction.

Il ne produit jamais :

- une identité vérifiée ;
- un profil biométrique ;
- une inférence médicale, ethnique, psychologique ou sensible ;
- une photo publique ;
- un canon automatiquement verrouillé.

## Gates obligatoires

```text
permission_check
-> photo_ocr_consent_gate
-> no_sensitive_inference
-> private source storage
-> hint profile draft
-> user validation
-> DA translation
-> image preflight
-> optional preview
```

La validation utilisateur gagne toujours sur l'enrichissement automatique.

## Règle d'implémentation

Améliorer le runner lorsqu'une capacité est générique :

- ingestion image/PDF ;
- normalisation ;
- extraction structurée ;
- confiance ;
- provenance ;
- gestion d'erreur ;
- job/retry ;
- observabilité.

Créer ou améliorer l'adapter lorsqu'une règle dépend du domaine :

- champs extraits ;
- consentement ;
- permissions ;
- rétention ;
- validation ;
- schéma de sortie ;
- usage autorisé.

Donc : **mutualiser le moteur, spécialiser les contrats**.

## État actuel

Le registre déclare le runner et l'adapter, mais aucun upload, stockage photo, job OCR ou endpoint
n'est `live`. L'activation attend l'audit du code Vincent, Project/Scope, storage privé,
suppression/révocation, jobs, tests et recette humaine.
