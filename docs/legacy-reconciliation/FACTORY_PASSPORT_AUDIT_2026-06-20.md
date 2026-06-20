# Audit Passport des 2 062 fichiers factories — 2026-06-20

## Diagnostic

Les 2 062 fichiers représentent 13 groupes de factories actives candidates, plus archives,
templates, modules partagés, passerelles Vincent et ZIPs de livraison. Ils ne représentent ni
2 062 features ni 2 062 factories installables.

## Contrat de déploiement

- Intention produit : préserver les meilleures factories comme satellites D11 réabsorbables.
- Partie du canon concernée : D11 Factory Passport & Backflow, avec owners D04/D05/D07/D09/D10.
- Ce qui doit changer : inventaire par groupe, owner, capacité, plateforme et statut Passport.
- Ce qui ne doit pas changer : aucune installation, extraction de ZIP, affectation utilisateur, activation ou écriture canon.
- Critère simple de succès : 2 062/2 062 fichiers lus, zéro manquant, chaque groupe classé.
- Risque de dérive : critique si manifeste legacy = Passport validé ou ZIP = runtime.
- Validation nécessaire : non pour audit ; oui avant affectation utilisateur, installation ou import.

## Résultat

| Mesure | Résultat |
|---|---:|
| Fichiers factories | 2 062 |
| Fichiers manquants | 0 |
| Groupes examinés | 18 |
| Factories actives candidates | 13 |
| Groupes de doublons exacts | 233 |
| Fichiers dans ces groupes | 768 |
| Passports stricts validés | 0 |
| Factories installées | 0 |
| Factories activées | 0 |

L'index complet est `FACTORY_PASSPORT_INVENTORY_2026-06-20.json`.

## Factories candidates et owners

| Factory candidate | Owner | Capacité | Plateforme indicative | Fichiers |
|---|---|---|---|---:|
| Masterclass | D05 | masterclass/sujets | GPT Custom ou manuel | 495 |
| Batrasia | D09 | atelier narratif | Claude/GPT/manual | 202 |
| Prof Krapu | D04 | persona/pédagogie | GPT Custom | 192 |
| Ours d'Or | D10 | event/concours | GPT Custom | 147 |
| Stand Up | D04 | persona | GPT Custom | 64 |
| Nicok | D04 | persona | GPT Custom | 55 |
| MasterFlex Coach | D04 | coach | GPT Custom | 30 |
| MasterInventory | D07 | inventaire | GPT Custom | 27 |
| Prof Krapu Backend Coach | D11 | coach backend portable | bundle manuel | 26 |
| Ours d'Or GPT-ready | D10 | variante event | GPT Custom | 18 |
| KrapuLearn | D05 | apprentissage | Gemini Gem | 12 |
| HelpLab | D05 | aide pédagogique | GPT Custom | 11 |
| MasterLearn | D05 | apprentissage | GPT Custom | 11 |

Chaque ligne reste `passport_candidate_only`. Les manifests et marqueurs de version existants
sont des indices, pas des Passports D11 validés.

## Éléments qui ne sont pas des factories actives

- `VINCENT_PASSERELLES_ET_ZIPS_MASTERFLOW` : 611 fichiers de bridge/handoff, réduits à preuve historique.
- `_ARCHIVE` : 138 fichiers immuables en lecture seule.
- `_FACTORY_TEMPLATE` et `_SHARED_MODULES` : scaffolds communs absorbables, pas factories.
- racine `FACTORIES` : ZIPs et documents de livraison, jamais runtime.

## Doublons structurants

Les plus gros groupes exacts montrent des modules recopiés dans plusieurs packs :

- narrative-to-image : 19 copies ;
- prompt DA de sujets : 18 copies ;
- Lore Canon Builder : 15 copies ;
- multi-photo continuity : 15 copies ;
- conversation harvest : 11 copies ;
- addendums DA/pédagogie/review : 9 à 11 copies.

Décision : ces contenus doivent devenir des modules partagés versionnés lors d'une future
reconstruction, pas être maintenus séparément dans chaque factory.

## Privacy et affectation utilisateur

Des noms de chemins sensibles (`private`, `student`, `roster`, `morph`, `key`, `token`) ont été
signalés comme indices à examiner, pas comme preuve de secret réel. Aucun contenu n'est exporté.

L'association à un utilisateur identifié reste facile techniquement mais n'est pas automatique :

```txt
factory candidate -> Passport strict -> owner utilisateur explicite -> sources autorisées
-> privacy/security/simulation -> validation -> installation séparée
```

## Stop rules

- Passport candidat ≠ Passport validé.
- Factory ≠ persona utilisateur.
- ZIP ≠ installation.
- Installation ≠ activation.
- Backflow ≠ canon.
- Une factory portable ne lit jamais le Drive/Git/archive au runtime.
