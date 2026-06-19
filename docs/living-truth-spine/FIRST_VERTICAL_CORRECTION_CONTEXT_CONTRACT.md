# Première verticale — Classe, roster et contexte de correction

Statut : `CANON_CANDIDATE_FROM_LEGACY_RECONCILIATION_WAVE_4`

## Intention produit

Une correction orale ou écrite doit retrouver, sans reposer sur la mémoire de
la conversation, la bonne classe, le bon élève, le bon sujet, le bon barème et
les bonnes preuves. Le système prépare un feedback candidat ; seul le professeur
le valide et l'inscrit dans le dossier pédagogique privé.

```txt
cohorte/classe -> roster versionné -> source (copie/transcription)
-> sujet + barème versionnés -> Context Pack correction immuable
-> feedback candidat -> validation prof -> suivi privé
```

## Objets minimaux

| Objet | Contenu minimal | Règle |
|---|---|---|
| `cohort` | libellé, période, owner, scope | pas de déduction depuis un chat |
| `roster_version` | cohorte, liste d'identités, date, état | une modification crée une version, ne réécrit pas l'ancienne |
| `student_identity` | identifiant interne, nom d'usage, scopes | privé, jamais exposé par défaut |
| `identity_match_candidate` | alias observé, candidats, confiance, décision | aucune fusion automatique en cas d'ambiguïté |
| `source_record` | type, provenance, droits, checksum, fraîcheur | transcription et copie sont des preuves, non une autorité |
| `correction_context_snapshot` | références exactes roster/sujet/barème/source/profil | immuable après lancement du run |
| `feedback_candidate` | analyse, preuves, limites, statut | pas de note finale automatique |
| `pedagogical_record` | lien validé, visibilité, conservation | écriture seulement après validation prof |

## Portée et confidentialité

- Les données d'élèves sont privées et teacher/admin scoped.
- Le système n'utilise jamais une liste trouvée dans l'historique comme roster
  actif sans référence de version explicite.
- Une absence, un homonyme ou un alias ambigu bloque la personnalisation pour
  cet élève ; le reste du batch peut continuer en mode review.
- Une source révoquée ou non autorisée est retirée des nouveaux Context Packs.
- Le suivi longitudinal formule des signaux prudents, jamais des jugements ni
  des décisions automatiques.

## Comportement attendu

| Situation | Réponse MasterFlow |
|---|---|
| Roster valide et source rattachée | construit le Context Pack traçable |
| Nouveau roster | crée une version pour les prochains runs |
| Nom non reconnu | crée un candidat de rapprochement et demande review |
| Transcription sans sujet/barème | produit au plus une analyse candidate limitée, signale le manque |
| Demande de feedback final | exige validation prof avant écriture du dossier |
| Relecture d'un ancien feedback | recharge les versions historiques, jamais les dernières par défaut |

## Frontières de cette tranche

Cette tranche ne réalise pas : import automatique de listes, migration des
données existantes, connexion à un établissement, notation autonome, accès
élève, envoi externe ou synchronisation avec un outil tiers.

Ces actions nécessitent un contrat technique spécifique, consentement/scopes,
sauvegarde, plan de rollback et preuves de test.

## Découpage Git requis

1. Modèle et migrations réversibles pour les objets minimaux.
2. Permissions par owner/cohorte/professeur.
3. Création manuelle d'une cohorte et d'un roster versionné.
4. Résolution explicite d'identité et queue de review.
5. Snapshot de contexte injecté dans un run de correction.
6. Tests d'isolement, d'invalidation, d'ambiguïté et de non-réécriture.
7. Interface de validation professeur avant tout dossier longitudinal.

## Critères de succès

- un professeur peut corriger une transcription sans recoller sa liste à chaque
  conversation ;
- le système sait dire quelle version de roster, sujet et barème a servi ;
- une ambiguïté d'identité ne devient jamais une erreur silencieuse ;
- un feedback passé reste compréhensible après changement de classe ou de
  barème ;
- aucune donnée existante n'est modifiée lors de l'activation initiale.
