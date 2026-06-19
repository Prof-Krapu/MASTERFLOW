# D11-D12 — Structured Usage Sources V6B — 2026-06-19

Status: `IMPLEMENTED_LOCAL_VERIFIED_STRUCTURED_SOURCES_ONLY`

## Intention

Étendre le Native Usage Harvester avec deux sources internes déjà structurées et permissionnées,
sans lire les contenus qu'elles référencent.

## Source 1 — Teacher Decision Delta

Après enregistrement autorisé d'un `teacher_decision_delta`, MasterFlow crée ou renforce une
candidate `repeated_correction`.

Collecté :

- type d'objet ;
- noms des champs modifiés ;
- références vers proposition IA, décision humaine et objet ;
- owner et scope projet.

Non collecté :

- contenu de la proposition IA ;
- contenu de la décision humaine ;
- note libre ;
- texte étudiant ou conversation.

## Source 2 — Finding D12 validée

Une finding D12 ne devient source d'apprentissage que lorsque la décision owner la passe en
`validated_alert`.

Les statuts observation, hypothesis, candidate_pattern, stale et archived ne déclenchent aucune
candidate Usage Learning.

## Garde-fous communs

- `privacy = do_not_export` ;
- même service de qualification, déduplication et routage que V6A ;
- candidate unique, même si plusieurs propriétaires fonctionnels doivent arbitrer ;
- revue dans la Shared Validation Inbox ;
- aucun process update, canon write, job, provider ou effet externe.

## Recette

- Usage Harvester + teacher delta + finding D12 + Validation Inbox : 37/37 ;
- backend complet : 347/347 ;
- TypeScript backend/frontend : OK ;
- build Vite : OK ;
- diff-check : OK.

La première suite complète lancée sous sandbox a été bloquée par l'interdiction d'ouvrir des
ports locaux éphémères. La même suite, relancée avec l'autorisation locale adaptée, passe 347/347.

## Prochaine extension sûre

Préparer un intake explicite pour les exports de factories portables. Aucun ZIP, conversation ou
package ne doit être absorbé automatiquement : import explicite, préflight, confidentialité,
déduplication, puis candidate inbox uniquement.
