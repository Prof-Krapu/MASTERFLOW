# Arbitrage des datasets de vérité — 2026-06-20

| Dataset legacy | Décision | Ce qui est conservé / ce qui manque |
|---|---|---|
| Student Profile & Avatar Roster | `reduced` | identité/roster versionné et lien humain existent ; profil longitudinal, compte↔fiche, préférences, avatars et privacy fine restent à livrer |
| Memory Graph & Relation Runtime | `canon_ready` | mémoire, scopes, invalidation et relations sont dans le contrat D02 ; graphe persistant/provenance UI absent |
| Core DA Root Registry | `absorbed` | séparation DA core/propriétaire/event et principes UI/asset repris dans D08 ; registry exécutable absent |
| Active Contract Index JSON | `reduced` | registre humain restauré ; projection machine-readable et couverture engines à construire |
| Pedagogical Resource Routing | `canon_ready` | Resource Truth + candidats existent ; import normalisé des routings/tutoriels historiques non livré |
| Dataset Versioning Append-only | `canon_ready` | snapshots ciblés et immutabilité correction existent ; Version & Change Ledger transverse absent |
| Backflow BDD Schema Registry | `reduced` | D11 intake/backflow et D12 candidates existent ; passports, assets, opportunity, canon traits et schemas complets restent futurs |

## Conséquence pour ton bot de correction

La liste d'étudiants ne doit plus dépendre d'une conversation à rappeler : elle est désormais un
roster versionné, figé dans le snapshot de correction et relié par confirmation humaine. En
revanche, le **profil longitudinal complet** imaginé dans le legacy n'est pas encore livré : c'est
la prochaine brique après le workflow de correction de base, pas une promesse déjà active.
