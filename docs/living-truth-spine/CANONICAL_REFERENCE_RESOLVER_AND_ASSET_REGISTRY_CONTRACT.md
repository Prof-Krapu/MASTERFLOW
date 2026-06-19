# Canonical Reference Resolver & Asset Registry

Statut : `CANON_CANDIDATE_FROM_LEGACY_RECONCILIATION_WAVE_5`

## Intention produit

Préparer les références visuelles nécessaires à un manifest D08 sans improviser
la DA, sans exposer une référence privée et sans appeler un provider.

```txt
reference request -> canonical reference resolver -> access/review check
-> immutable manifest context -> Action Ready preview
-> provider handoff (future, gated) -> review -> learning candidate
```

## Deux dimensions à ne jamais confondre

Le legacy mélangeait parfois la nature d'une source et son influence autorisée.
Le canon les sépare :

| Dimension | Question | Valeurs exemples |
|---|---|---|
| Provenance / confiance | cette référence est-elle utilisable et sous quels droits ? | `source_material`, `approved_reference_candidate`, `canon_locked`, `rejected_reference`, `sensitive_private_reference` |
| Rôle visuel | que peut-elle influencer dans ce manifest ? | `canon_strict`, `expression_only`, `outfit_only`, `world_style`, `filter_reference`, `anti_pattern` |

Une référence ne peut être utilisée que si les deux dimensions sont compatibles.
Une photo privée peut avoir un rôle `pose_reference`, mais reste bloquée sans
permission ; un asset `canon_locked` ne peut pas être rétrogradé silencieusement
en simple inspiration.

## Registre minimal

| Objet | Contenu minimal | Règle |
|---|---|---|
| `asset_reference` | source, owner, scope, droits, hash, fraîcheur | la copie de travail ne remplace jamais la source |
| `reference_qualification` | provenance/confiance, rôle, sensibilité, review | toute qualification est auditée |
| `da_root` | racine applicable, couches, filtres, version | une DA root n'est jamais choisie par la dernière image réussie |
| `reference_resolution` | demande, références choisies/rejetées/manquantes, conflits | résultat `resolved`, `partial`, `missing` ou `blocked` |
| `manifest_context_snapshot` | références et versions effectivement retenues | immuable après Action Ready |
| `render_learning_signal` | réussite, dérive, manque, suggestion | signal candidat, jamais mutation canon |

## Règles de résolution

Ordre cible : DA root -> canon entité/persona -> assets validés -> références
qualifiées -> outputs acceptés -> signaux de review -> archive autorisée.

- `missing` ou `blocked` conserve le manifest préparatoire mais bloque le
  handoff provider.
- Les références rejetées et anti-patterns servent à prévenir une dérive, pas à
  alimenter un prompt de style.
- Une sortie générée reste `generated_candidate` ; même approuvée comme
  référence, elle ne modifie pas le canon sans décision owner.
- Aucun chemin Drive/local, fichier, copie temporaire, provider ou stockage ne
  fait partie de cette tranche.

## Pont avec le contrat D08 existant

Le `reference_status_board` D08 est conservé. Il devient la projection UI des
qualifications : rôle visuel lisible, état de confiance, sensibilité et gate.
Le Canonical Reference Resolver fournit au manifest la décision explicable ; le
manifest ne devine jamais ses références.

## Frontières

Cette tranche n'autorise pas : synchronisation locale Comfy, accès Drive par un
runner, provider image, persistance de fichiers générés, export public,
canonisation automatique ou activation factory.

## Critères de succès

- un owner sait quelles références ont été retenues, écartées ou manquent ;
- une référence privée/rejetée ne peut pas fuir vers un handoff ;
- un manifest D08 garde les versions exactes de sa DA et de ses références ;
- le feedback de render devient une candidate traçable, jamais une modification
  automatique de la DA.
