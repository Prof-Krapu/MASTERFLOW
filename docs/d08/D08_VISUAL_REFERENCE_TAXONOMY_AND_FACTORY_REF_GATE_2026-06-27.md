# D08 — Taxonomie des références visuelles et gate Factory

Date : 2026-06-27  
Statut : spec documentaire, sans provider image  
Sources : D08 Git, Canonical Reference Resolver, Factories Batrasia / Nicok / Ours d'Or / Badge / Prof Krapu / MasterInventory  

## Diagnostic simple

MasterFlow a déjà des briques D08 réelles :

- registre de références visuelles privées ;
- manifests visuels ;
- assets générés/candidats et stockage fichier privé ;
- action registry prudent ;
- OCR candidates côté Inventory ;
- image generation job scaffolded et gated.

Mais une brique produit manque encore : **la taxonomie lisible des rôles de référence**.

Sans elle, une image envoyée par l'utilisateur peut être mal interprétée :

- inspiration prise pour canon ;
- photo privée envoyée trop loin ;
- résultat OCR pris pour vérité ;
- style board qui écrase une DA root ;
- image réussie qui devient canon par accident ;
- `go`, `ok`, `lance` pris pour `GO IMAGE`.

## Décision

D08 doit séparer trois dimensions :

```txt
provenance / droits / confiance
-> rôle visuel autorisé
-> statut dans le manifest
```

Une référence n'est exploitable que si les trois dimensions sont compatibles.

## Taxonomie commune

### 1. Provenance / droits / confiance

| Valeur | Sens | Gate |
|---|---|---|
| `canon_locked` | référence validée comme canon visuel | utilisable selon rôle |
| `approved_reference_candidate` | référence candidate approuvée pour ce manifest | utilisable dans ce manifest seulement |
| `source_material` | matériau fourni, non interprété comme canon | nécessite qualification |
| `user_private_photo` | photo privée utilisateur | consentement + scope strict |
| `third_party_reference` | référence externe ou inspiration | droits + usage déclaré |
| `ocr_candidate` | contenu extrait par OCR/vision | validation humaine obligatoire |
| `generated_candidate` | sortie générée ou importée | candidate-only |
| `weak_or_unknown` | provenance faible ou inconnue | bloque si critique |
| `rejected_reference` | explicitement rejetée | jamais utilisée comme influence positive |

### 2. Rôle visuel autorisé

| Valeur | Sens | Exemple d'usage |
|---|---|---|
| `canon_strict` | doit être respecté strictement | personnage, logo, forme canon |
| `identity_anchor` | aide à identifier une entité/persona | visage/persona validé |
| `pose_reference` | influence seulement posture/cadrage | photo de pose |
| `expression_only` | influence expression/acting | humeur, regard |
| `outfit_only` | influence vêtements/accessoires | costume |
| `world_style` | influence univers/ambiance | Batrasia noir/blanc |
| `graphic_language` | influence trait, matière, composition | encre, hachures, flat vector |
| `color_palette` | influence palette uniquement | gamme chromatique |
| `layout_reference` | influence structure/page | affiche, grille, UI |
| `filter_reference` | filtre ou texture | grain, contraste |
| `output_template` | gabarit final attendu | badge, roadbook, deck |
| `aspirational_reference` | inspiration lointaine, non canon | moodboard |
| `anti_pattern` | ce qu'il faut éviter | style interdit |
| `negative_lock` | contrainte négative forte | pas de couleur, pas de photoréalisme |
| `rejected` | référence à exclure | ne pas utiliser |

### 3. Statut manifest

| Statut | Sens |
|---|---|
| `resolved` | référence qualifiée et compatible |
| `partial` | utilisable mais avec limite explicite |
| `missing` | référence requise absente |
| `ambiguous` | rôle ou provenance floue |
| `blocked_rights` | droit/consentement insuffisant |
| `blocked_private` | référence privée non exportable |
| `blocked_low_confidence` | confiance trop faible pour criticité |
| `blocked_negative_conflict` | conflit avec anti-pattern / negative lock |

## Mapping avec Git actuel

Git possède déjà `VisualReferenceStatusSchema` :

| Git actuel | Couverture | Besoin |
|---|---|---|
| `canon_strict` | bon | conserver |
| `expression_only` | bon | conserver |
| `outfit_only` | bon | conserver |
| `world_style` | bon | conserver |
| `poster_energy` | utile mais spécifique | peut devenir `graphic_language` ou `aspirational_reference` selon cas |
| `filter_reference` | bon | conserver |
| `output_template` | bon | conserver |
| `anti_pattern` | bon | renforcer avec `negative_lock` |
| `rejected` | bon | conserver |

Manques à décider plus tard côté runtime :

- `identity_anchor` ;
- `pose_reference` ;
- `graphic_language` ;
- `color_palette` ;
- `layout_reference` ;
- `aspirational_reference` ;
- `negative_lock`.

Ces manques ne bloquent pas le documentaire, mais ils bloquent une génération image robuste.

## Gate D08 avant image

Avant tout provider ou runner image :

```txt
1. Intent visuel défini.
2. DA root choisie explicitement.
3. Références qualifiées par provenance + rôle + statut manifest.
4. Références privées et tierces vérifiées.
5. OCR/vision marqué candidate-only.
6. Anti-patterns et negative locks chargés.
7. Output readiness = ready_for_owner_review.
8. Validation humaine explicite.
9. Message exact GO IMAGE si génération.
10. Sortie = generated_candidate + rapport DA + review.
```

`oui`, `ok`, `go`, `lance`, `valide` ou `1` ne valent pas `GO IMAGE`.

## Rapport DA post-sortie

Chaque sortie visuelle candidate doit pouvoir produire :

```yaml
post_generation_da_report:
  generated_asset_id:
  manifest_id:
  output_status: candidate | rejected | approved_reference_candidate
  respected:
    - da_root
    - canon_refs
    - negative_locks
  drift:
    - element:
      severity: low | medium | high
      source_ref:
  accidental_successes:
    - candidate_only_signal:
      can_be_reused: yes | no | needs_review
  rights_or_privacy_flags:
  recommended_action: retry | revise_prompt | approve_as_reference_candidate | reject | park
```

Un accident réussi reste candidat. Il ne modifie pas la DA root ou le canon sans décision owner.

## OCR et images de référence

Règles :

- OCR lit une image, mais ne prouve rien seul.
- Une photo privée donne des indices, pas une identité ni un attribut sensible.
- Une référence morphologique exige consentement explicite.
- Une image générée ne remplace pas la source.
- Une source externe doit déclarer usage et droits.

## État Git actuel

| Brique | État |
|---|---|
| `VisualReferenceStatusSchema` | présent, partiel |
| `VisualManifestSchema` | présent |
| `GeneratedAssetSchema` | présent |
| upload fichier privé | présent |
| review asset | présent |
| OCR candidates | présent côté Inventory |
| `preflight_image_action` | action future, validation requise |
| `create_render_manifest` | action future, validation requise |
| provider image réel | fermé |
| post-generation DA report | gap runtime |
| taxonomie provenance/droits détaillée | gap runtime |
| `GO IMAGE` exact côté runtime UI | gap à auditer |

## Contrat de non-dérive

D08 peut accepter des références, manifests et assets privés.

D08 ne doit pas prétendre :

- générer une image complète sans gate ;
- avoir canonisé une référence ;
- avoir vérifié des droits externes sans preuve ;
- avoir transformé OCR en vérité ;
- avoir rendu public un asset privé ;
- avoir modifié Drive ou une DA root.

## Prochaine action recommandée

1. Garder cette taxonomie comme doc de contrôle.
2. Auditer `POST /api/v1/narrative/nodes/:id/generate-visual` contre ce gate.
3. Plus tard seulement, ajouter les nouveaux rôles au shared schema si le besoin UI est confirmé.
4. Préparer un composant UI `source/reference strip` qui montre provenance, rôle, confiance et blocage.
