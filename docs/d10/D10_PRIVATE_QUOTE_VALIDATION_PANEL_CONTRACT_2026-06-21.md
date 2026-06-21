# D10 R5.4 — Contrôle de validation privée

## Contrat de déploiement

- Intention produit : permettre au owner de confirmer son brouillon sans créer d'engagement externe.
- Partie du canon concernée : D10 Events / Quotes / Public Intake, Quote Builder privé.
- Ce qui doit changer : afficher l'action `Valider en privé` sur un devis au statut `draft` et refléter son statut interne.
- Ce qui ne doit pas changer : aucun export, envoi, facture, paiement, publication ou validation commerciale.
- Critère simple de succès : un brouillon peut passer à `validated_private` depuis le panneau owner, puis l'action disparaît.
- Risque de dérive : faible tant que la transition reste privée et sans effet externe.
- Validation nécessaire : non pour l'interface privée ; oui avant toute sortie ou action commerciale.

## Trace Legacy → Canon → GitHub

- Source canon Drive : `03_DOMAINS/D10_EVENTS_QUOTES_PUBLIC_INTAKE/DOMAIN_CARD.md`.
- Preuve legacy/arbitrage : arbitrage D09-D10 du Coverage Ledger, capacité Quote Builder classée `canon_ready`.
- Statut legacy : `canon_ready`, absorbé progressivement sous D10.
- Écart GitHub traité : le backend savait valider, mais le owner ne disposait d'aucun geste dans l'interface.
- Exclusions : export, envoi, facture, paiement, public intake, automatisation et live.

## Résultat attendu

Le bouton appelle uniquement la transition backend existante `draft → validated_private`. Une validation
interne réussie recharge la liste et affiche une confirmation explicite qu'aucun export ou envoi n'a eu lieu.
