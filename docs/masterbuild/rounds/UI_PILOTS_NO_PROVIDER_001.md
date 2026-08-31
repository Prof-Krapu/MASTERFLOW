# Round UI-PILOTS-NO-PROVIDER-001

Statut : `active — awaiting merge authorization`

Étape : `7/8 — Publier`

Propriétaire : MALEX

Autorisation locale : `AUTH-UI-PILOTS-NO-PROVIDER-LOCAL-2026-08-31`

Autorisation de publication : `AUTH-UI-PILOTS-PUBLISH-2026-08-31`

## Intention produit

Faire avancer l'interface des deux premiers pilotes avant l'arrivée d'une clé API, sans masquer la
nature simulée des réponses et sans modifier les garde-fous pédagogiques.

## Contrat

- Partie du canon concernée : V1 conversationnelles Ours d'Or et Talents Créatifs.
- Ce qui change : accès Home, projection d'état pilote, workspace conversationnel responsive,
  persona visible, amorces de conversation et retour de Room.
- Ce qui ne change pas : provider, budget, secrets, backend vertical, permissions, sources réelles,
  validation professeur, livrable final, preview et stable.
- Critère de succès : les deux pilotes sont trouvables et utilisables en `mock` sur desktop/mobile,
  avec le même shell et deux identités distinctes.
- Risque principal : faire croire qu'une IA réelle ou une validation automatique est active.
- Validation nécessaire : obtenue pour commit, push et PR ; oui séparément avant merge ou
  déploiement.

## Preuves locales

- Home active : deux entrées prioritaires, desktop et 390 px ;
- Ours d'Or : MasterFlex, état projet/étape/actions, prompt guidé et réponse `mock` ;
- Talents Créatifs : ProfKrapu, même shell, RuntimePack et copie distincts ;
- mobile : conversation avant le contexte détaillé, suggestions horizontales ;
- retour Home : changement réel de Room ;
- navigateur : aucune erreur ou alerte console ;
- frontend : lint et build verts.

## Gate courant

Interface validée telle quelle par MALEX et publiée dans la PR #250 depuis
`codex/ui-pilots-no-provider` au commit `429fa473bf017e2014d8a838cf02d744d637f35f`. Le round est
arrêté avant le merge, qui exige une validation explicite séparée. Le provider réel reste reporté aux
tests IRL et tout déploiement conserve son gate séparé.
