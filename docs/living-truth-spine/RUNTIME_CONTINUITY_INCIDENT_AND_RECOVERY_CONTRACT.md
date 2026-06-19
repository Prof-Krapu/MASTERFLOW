# Runtime Continuity, Incident & Recovery Contract

Statut : `CANON_CANDIDATE_FROM_LEGACY_RECONCILIATION_WAVE_6`

## Intention produit

Rendre la santé réelle de MasterFlow compréhensible : quelle release tourne,
quelle sauvegarde est connue, quel incident a eu lieu, quelle action a été
tentée et quel smoke le prouve.

```txt
release receipt -> health/smoke -> incident (if any) -> operator action
-> recovery attempt -> verification -> owner decision
```

## Registre minimal

| Objet | Contenu minimal | Règle |
|---|---|---|
| `release_receipt` | SHA, environnement, date, opérateur, composants | une release non prouvée reste `unknown` |
| `backup_receipt` | cible, date, checksum, restauration testée ou non | backup != validation métier |
| `incident_record` | sévérité, impact, scopes, symptômes, traces | incident != échec total |
| `recovery_attempt` | action, préconditions, résultat, rollback | recovery != effacement |
| `smoke_receipt` | endpoint/recette, résultat, horodatage | test historique ≠ santé actuelle |
| `continuity_decision` | suspendre, isoler, fallback, reprendre | aucune action sensible automatique |

## Règles de sécurité

- Toute récupération conserve les traces et l'état observé avant action.
- Un rollback restaure une configuration ou un état technique ; il ne valide
  jamais le contenu, le canon ou les données métier.
- Une migration, une rotation de secret, une exposition réseau ou un
  redéploiement exige un preflight, une sauvegarde et une décision explicite.
- Le cockpit distingue toujours `observé`, `hypothèse`, `action proposée`,
  `action réalisée` et `preuve vérifiée`.

## État actuel

Le backend expose de l'observabilité et des données de release, mais le live
historique reste non prouvé après un smoke 502 et l'inbox Vincent demande une
récupération conservatrice. Cette absence de preuve est un statut, pas une
permission de redéployer.

## Critères de succès

- l'owner sait dire si le live est prouvé, dégradé ou inconnu ;
- chaque action de recovery est reliée à une sauvegarde et à un smoke ;
- les données existantes ne sont pas remplacées ou migrées à l'aveugle ;
- l'incident et sa résolution restent auditables.
