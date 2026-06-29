# Theme Studio Activation Preflight V1

Date : 2026-06-29  
Vague : `THEME-STUDIO-ACTIVATION-PREFLIGHT-001`  
Statut : `preflight_only`

## Décision simple

MasterFlow sait maintenant préparer une activation de thème comme une action sensible : préflight
visible, validation humaine godmode et trace Action Engine.

Il ne sait pas encore appliquer le thème. C'est volontaire : tant que le stockage du thème actif,
le rollback réel, l'impact UI et les permissions fines ne sont pas stabilisés, l'exécution échoue
explicitement en `not_implemented`.

## Contrat

Intention produit : permettre à MALEX/GodMode de voir et valider une activation candidate avant de
construire l'application réelle du ThemePack.

Ce qui change :

- action registre `activate_theme_pack_candidate` ;
- préflight visible via l'Action Engine existant ;
- validation obligatoire par rôle `godmode` ;
- payload non divulgué dans l'explication UI ;
- exécution refusée proprement faute d'exécuteur réel.

Ce qui ne change pas :

- aucun thème actif n'est écrit ;
- aucun CSS, font, asset ou lore n'est appliqué ;
- aucune génération image, canonisation, migration ou provider ;
- aucun rollback réel n'est encore exécuté ;
- aucun contournement des permissions Theme Studio.

## Critère de succès

Un teacher peut créer la proposition, mais seul un godmode peut la valider. Même validée, elle ne
modifie pas l'interface : elle échoue en `not_implemented` jusqu'à une prochaine vague dédiée à
l'application réelle et au rollback.

## Prochaine tranche possible

`THEME-STUDIO-ACTIVATION-RUNTIME-001`, bloquée tant qu'on n'a pas validé :

- où stocker le thème actif ;
- comment calculer et tester le rollback ;
- quelles surfaces UI doivent changer ;
- qui peut appliquer un thème global, institutionnel, événementiel, projet ou utilisateur.
