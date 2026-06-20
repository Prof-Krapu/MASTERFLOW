# Arbitrage des personas et événements legacy — 2026-06-20

## Diagnostic

Les 24 personas et 12 systèmes d'événements sont des profils, méthodes et signaux. Aucun ne doit
devenir automatiquement identité, permission, surveillance ou action runtime.

## Contrat de déploiement

- Intention produit : préserver voix/méthodes et signaux utiles sans activation automatique.
- Partie du canon concernée : D04 Persona, D12 Runtime Control et ponts D03/D06/D08/D09/D11.
- Ce qui doit changer : statut, owner et politique d'activation/effet pour 36 artefacts.
- Ce qui ne doit pas changer : aucune persona active, aucun event listener, permission ou action sensible.
- Critère simple de succès : 24/24 personas et 12/12 événements arbitrés, effets bornés.
- Risque de dérive : élevé si persona = permission ou signal = décision.
- Validation nécessaire : non pour audit ; oui avant affectation réelle à un utilisateur ou branchement d'effet.

## Personas

| Décision | Nombre | Lecture |
|---|---:|---|
| `absorbed` | 7 | invariants persona/méthode/sécurité déjà canoniques |
| `canon_ready` | 6 | profils utiles à câbler par scope |
| `reduced` | 4 | modèles redondants consolidés dans Persona Engine |
| `restore_candidate` | 7 | profils legacy spécialisés à réévaluer par utilisateur/factory |

Politique commune : `manual_scoped_no_auto_activation`.

- persona ≠ identité réelle ;
- persona ≠ rôle/permission ;
- méthode secondaire ≠ porte-parole ;
- profil visuel ≠ accès aux références privées ;
- affectation utilisateur exige choix explicite et réversible.

## Événements

| Décision | Nombre | Lecture |
|---|---:|---|
| `absorbed` | 1 | lifecycle workflow déjà présent |
| `canon_ready` | 6 | alertes, policies et projections à câbler plus tard |
| `reduced` | 4 | systèmes signal/alerte fusionnés sous D12 |
| `restore_candidate` | 1 | autonomie réactive à garder hors runtime actuel |

Politique commune : `signal_only_no_sensitive_action`.

```txt
event -> observation -> finding/queue -> permission/preflight -> validation humaine
```

Un événement ne publie, ne note, ne sanctionne, ne génère, ne migre et ne déploie jamais seul.

## Alertes

- Les profils MasterFlex, MasterHelp, MasterBuilder, MasterScore, Incubator et MasterStory restent candidats.
- Les signaux cognitifs/pédagogiques ne sont ni diagnostics médicaux ni preuves comportementales.
- Les events techniques restent distincts des événements publics D10.
