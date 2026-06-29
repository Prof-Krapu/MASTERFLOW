# Experience Fabric — Visual Narrative Grammar V1

Statut : V1 locale, lecture seule/explication only.
Source : plan MasterFlow Experience Fabric — vague 5.

## Intention

Relier MasterStory, D08 et Theme Studio sans ouvrir la génération image.

La grammaire visuelle narrative répond à une question simple :

> Pourquoi ce visuel existe, ce qu'il signifie, et quelles sources l'autorisent ?

Elle transforme les manifests D08 en lecture exploitable par l'UI, le GodMode, le Theme Studio et les
futurs compagnons vivants.

## Sources projetées

La V1 ne crée pas de canon visuel parallèle. Elle projette :

- `visual_manifests` ;
- références D08 attachées ;
- `NarrativeCanonGraph` quand un workbench est disponible ;
- couches DA, filtres, templates et `da_root_ref` déjà présents.

## Contrats ajoutés

- `VisualGrammarElement`
- `EmotionalArcPoint`
- `VisualNarrativeGrammar`
- `VisualNarrativeGrammarReport`

## Endpoint

`GET /api/v1/experience/visual-grammar`

Paramètres :

- `workbench_id`
- `manifest_id`
- `project_id` optionnel

Le `project_id` n'est pas requis si le workbench permet de retrouver le projet. Cela garde l'UI
progressive : elle peut demander une grammaire depuis le contexte actif sans connaître toute la
plomberie.

## Politique d'exécution

La V1 retourne toujours :

```json
{"execution_policy": "explain_only"}
```

Aucune génération, canonisation, application de thème, publication, export ou appel provider n'est
déclenché.

## Diagnostics V1

Le rapport signale :

- `missing_continuity_refs` : manifest sans référence ou sans lien canon ;
- `unjustified_evolution` : intention d'évolution sans preuve canon suffisante ;
- `graphic_drift` : manifest rejeté ou non prêt ;
- `decorative_motif_without_function` : motif sans source explicite.

## Surfaces futures

- D08 : afficher « pourquoi ce visuel ? » avant génération.
- Theme Studio : relier thème, motifs, couleurs, typo et continuité narrative.
- MasterStory : distinguer canon narratif, présentation et supports visuels.
- Teaching/Ours d'Or : expliquer l'évolution d'un monstre ou subpersona.
- GodMode : détecter dérive graphique, évolution injustifiée et trou de provenance.

## Hors périmètre V1

- pas de génération image ;
- pas de provider ;
- pas d'asset lifecycle complet ;
- pas de color script persistant ;
- pas d'application de thème ;
- pas de UI dédiée ;
- pas de migration destructive ;
- pas de canonisation automatique.
