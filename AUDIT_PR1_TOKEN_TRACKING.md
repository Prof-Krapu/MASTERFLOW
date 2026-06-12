# Audit PR-1 - Suivi token et diagnostic

Date : 2026-06-12
Commit audite : `1b08b38`
Verdict : acceptable avec correctifs bornes

## Conforme

- `GET /diagnostics/token-usage` exige `admin` ou `godmode`.
- `student`, `teacher` et les requetes anonymes restent refuses.
- Le regroupement SQL utilise une whitelist statique.
- La surface est en lecture seule et n'affecte pas le runtime utilisateur.
- Le contrat partage est additif.
- Un modele inconnu ne produit pas de cout invente.
- Le comptage provider utilise une estimation si `usage` est absent ou invalide.

## Correctifs appliques

1. L'index composite `(user_id, ts)` possede maintenant un nom distinct et stable.
   Le commit initial reutilisait `idx_token_events_user`, ce qui produisait un schema
   different entre une base neuve et une base deja migree.
2. Les bornes `from` et `to` invalides, negatives ou inversees renvoient desormais
   `400 invalid_time_range` au lieu d'etre silencieusement remplacees.
3. Les compteurs provider negatifs, non entiers ou non finis sont ignores au profit
   de l'estimation locale.
4. Le calcul de cout neutralise les compteurs invalides.
5. Des tests couvrent l'index composite, les bornes temporelles, les prix declares,
   les suffixes de version et les modeles inconnus.

## Risques residuels

- La table de prix est indicative, manuelle et non versionnee. `cost_eur` est une
  estimation d'observabilite, pas une base de facturation ou de marge.
- Un appel provider rejete avant le debut du stream ou un stream interrompu avant sa
  consommation complete peut ne produire aucun `token_event`. Traiter ce cas exige
  un statut d'evenement explicite (`completed`, `failed`, `interrupted`) et merite une
  PR separee.
- Certains providers seulement partiellement compatibles OpenAI peuvent refuser
  `stream_options.include_usage`. La compatibilite doit etre validee pour chaque
  provider reel avant activation.

## Verifications

| Verification | Resultat |
|---|---|
| `npm test` | OK, 27/27 |
| `npm run lint` | OK |
| `npm run lint:frontend` | OK |
| `npm run build:frontend` | OK, 32 modules |
| `git diff --check` | OK |
