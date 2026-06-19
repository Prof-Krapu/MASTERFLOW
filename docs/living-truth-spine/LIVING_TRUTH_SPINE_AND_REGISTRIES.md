# Living Truth Spine And Registries

Status: `CANON_CANDIDATE_FROM_LEGACY_RECONCILIATION_WAVE_3`

## But

Transformer les principes Source Truth, Context Loadout et Validation en objets vivants :

```txt
source -> version -> identity -> scope -> context pack -> output -> decision -> continuity
```

## Registres communs

1. `source_registry` : origine, owner, scope, droits, fraîcheur, checksum, statut.
2. `version_change_ledger` : version, diff, remplacement, invalidation, rollback possible.
3. `identity_registry` : user, étudiant, alias, cohorte, ambiguïté et décision de rapprochement.
4. `asset_reference_registry` : DA root, référence, asset candidat/validé, review et dérive.
5. `process_context_profile` : intention, sources requises, tier de contexte, gates, output attendu.
6. `runtime_continuity_registry` : release, sauvegarde, incident, recovery, opérateur et smoke.

## Règles

- une conversation, transcription ou image est une source ; jamais une autorité autonome ;
- une correction conserve la version exacte du roster, du sujet, des critères et des preuves ;
- une nouvelle version est utilisée par les nouveaux runs, jamais injectée silencieusement dans un ancien résultat ;
- un alias ou nom ambigu crée une `identity_match_candidate` à valider ;
- un asset DA ne devient réutilisable qu'après review et statut explicite ;
- backup, recovery et rollback préservent les traces ; ils ne valident pas le contenu restauré.

## Première verticale

```txt
classe/cohorte -> roster versionné -> transcription orale -> Context Pack correction
-> feedback candidat -> validation prof -> dossier longitudinal privé
```

## Frontières

Pas de synchronisation externe, import, migration, activation factory, provider ou déploiement
automatique sans contrat technique, preflight et validation applicables.
