# Theme Studio Asset Packs V1

Date : 2026-06-29  
Vague : `THEME-STUDIO-ASSET-PACKS-001`  
Statut : `runtime_preview_only`

## Décision simple

Theme Studio devient le cockpit de préparation des packs thème, typos, palettes, assets et lore,
mais pas encore le bouton d'application.

La V1 produit uniquement un `ThemePack` candidat en lecture seule depuis un manifest D08 ou une
grammaire visuelle. Le pack est linté, expliqué et verrouillé : aucune fonte n'est téléchargée,
aucun CSS n'est appliqué, aucun asset n'est généré et rien n'est canonisé.

## Contrat

Intention produit : permettre à MALEX/GodMode de voir si une DA peut devenir un pack utilisable
avant de coder l'application réelle du thème.

Ce qui change :

- route privée `/experience/theme-studio/asset-pack` ;
- preview déterministe `ThemeStudioAssetPackPreview` ;
- `ThemePack` candidat avec palette, typos Google Fonts sourcées, refs assets et lint ;
- affichage dans le panneau Theme Studio existant.

Ce qui ne change pas :

- pas de stockage de thème actif ;
- pas d'application UI globale ;
- pas de provider image ;
- pas de génération ou canonisation d'asset ;
- pas de téléchargement de fonte ;
- pas de migration.

## Verrous

Actions explicitement fermées dans le preview :

- `apply_theme_pack`
- `download_font`
- `generate_asset`
- `canonize_asset`
- `publish_event_skin`

## Prochaine tranche possible

`THEME-STUDIO-ACTIVATION-PREFLIGHT-001` : créer une action sensible d'activation candidate, avec
préflight visible et validation humaine. L'application réelle du thème et le rollback restent une
vague séparée.
