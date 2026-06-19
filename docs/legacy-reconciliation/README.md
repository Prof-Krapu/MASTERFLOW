# Pipeline Legacy → Canon → GitHub

Ce dossier est le poste de pilotage unique pour réintégrer le dernier MasterFlow legacy sans
réimporter son chaos. Le legacy reste une archive de preuves ; le Drive reste le canon produit ;
GitHub reste la vérité de ce qui est réellement implémenté.

## Règle de passage

```txt
legacy evidence → classification → canon patch → Canon/Git matrix → tested runtime → release proof
```

Aucun élément ne saute une étape. Un statut `canon` ne signifie jamais `implémenté` ; un merge Git
ne signifie jamais `live`.

## États de couverture

- `absorbed` : repris sans perte matérielle dans le canon actif ;
- `reduced` : repris, mais une capacité concrète a été perdue ;
- `canon_ready` : présent dans le canon, Git non confirmé ou absent ;
- `restore_candidate` : valeur legacy à réintégrer après contrôle ;
- `deprecated` : volontairement hors périmètre actif ;
- `blocked` : conflit produit, droits, coût, migration ou owner inconnu.

## Gates

Les seules pauses obligatoires concernent un conflit entre décisions produit, un droit/consentement,
une migration de données, un coût/provider/déploiement externe ou un owner impossible à établir.
Tout le reste avance automatiquement vague par vague.

## Factories

Une factory est indexée par Passport, `owner_user_ref`, scopes, sources autorisées et capacités.
Elle est candidate D11 par défaut : aucun ZIP, secret, mémoire brute, import ou activation runtime
ne traverse sans validation.
