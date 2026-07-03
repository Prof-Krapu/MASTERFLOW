# MasterFlow UI Reset CDC V1

Statut : reference de reconstruction UI
Owner : MALEX
Date : 2026-06-30
Source operable : repo Git `MASTERFLOW`

## 1. Decision de reset

On repart de zero cote experience UI.

Le prototype actuel prouve que les contrats existent : login, contexte, modes, panels, Validation
Inbox, jobs, personas, ressources, Project, Teaching, Learn, Inventory, DA et Story. Il ne guide ni
le layout, ni la direction artistique, ni la hierarchie produit finale.

L'ancien `docs/ui/MASTERFLOW_UI_CDC_ACTIVE.md` devient une source auditée. Ce document devient la
reference de build pour la nouvelle coque et la Home.

## 2. Vision produit

MasterFlow doit s'ouvrir comme un canvas pedagogique vivant, pas comme un back-office.

L'utilisateur doit comprendre en moins de dix secondes :

- ou il est ;
- quel contexte est charge ;
- quel persona l'accompagne ;
- quelle action utile faire maintenant ;
- ce qui demande attention ;
- ou sont les modes autorises.

La Home est un point de reprise, pas un catalogue de fonctions.

## 3. Architecture d'ecran V1

```txt
gauche      centre             droite
mode rail   canvas actif       actions utiles / persona

haut        systeme calme      notifications / jobs / inbox
bas         clavier / micro    action chips
```

Zones obligatoires :

- gauche : navigation modes autorises ;
- centre : scene active ou Home minimale ;
- bas : entree texte, micro placeholder et action chips ;
- droite : persona actif et actions utiles ;
- haut droite : notifications, Task Monitor et Validation Inbox ;
- panels lourds : charges a la demande, jamais au repos.

## 4. Sources auditees

| Source | Statut reset | Decision |
|---|---|---|
| `/Users/malex/Desktop/UI_MASTERFLOW/` | garder comme inspiration CDC | extraire principes, pas copier les visuels |
| `MASTERFLOW_LINKS_WATCHLIST.md` | garder | sources humaines, pas assets |
| `MASTERFLOW_SOURCE_EXTRACTION_PACK.zip` | garder | protocoles DA/explainer/title sequence reutilisables |
| `docs/ui/MASTERFLOW_UI_CDC_ACTIVE.md` | archiver comme historique | ne plus utiliser comme plan actif unique |
| `docs/ui/MASTERFLOW_INTERFACE_EXECUTION_PLAN.md` | recycler | garder la logique une seule app React/Vite responsive |
| `FRONTEND_UI_DOCTRINE.md` | garder | doctrine fondatrice : situation, pas inventaire |
| `apps/frontend` actuel | preuve technique | rebrancher les contrats, ne pas copier la composition visuelle |

## 5. Matrice garder / recycler / archiver / rejeter

| Element | Decision | Raison |
|---|---|---|
| Login et contexte courant | garder | contrat runtime stable |
| `CurrentContext`, loadout, actions, personas | garder | source d'orchestration V1 |
| Panels existants | recycler | garder en lazy-load derriere les modes |
| Home dashboard technique | rejeter | trop proche d'un inventaire d'outils |
| Mode rail existant | recycler | le rendre plus calme et lateral |
| Chat dock existant | recycler | devenir entree basse avec action chips |
| Persona rail existant | recycler | compagnon visible, non permissionnant |
| Validation Inbox | garder | decision humaine, distincte des jobs |
| Jobs / Task Monitor | garder | production en cours, pas decision |
| Outils D08/D09/D10/D12 en Home | rejeter | outils lourds caches au repos |
| DA Studio complet | archiver pour plus tard | pas Bloc 1 |
| Onboarding persona complet | futur cadré par `docs/theme-studio/MASTERFLOW_IDENTITY_FORGE_TUNNEL_CONTRACT_V1.md` | pas Bloc 1 |
| Learn scene immersive | recycler plus tard | Bloc 5 apres Home validee |
| Teaching cockpit complet | recycler plus tard | pas avant coque + Home |

## 6. Surfaces V1

### Shell

- sidebar gauche retractable a terme, compacte des maintenant ;
- canvas central ;
- persona actif ;
- rail actions droite ;
- icones systeme haut droite ;
- input bas avec action chips ;
- panels lourds a la demande.

### Home minimale

Afficher uniquement :

- contexte actif ;
- prochaine action utile ;
- derniere reprise ;
- alerte importante ;
- modes autorises ;
- persona actif ;
- entree clavier/micro.

Ne pas afficher :

- logs ;
- debug ;
- providers ;
- diagnostics bruts ;
- catalogue complet ;
- outils D08/D09/D10/D12 au repos.

### Orchestration

Premiere vague sans nouveau backend :

- `GET /context/current` ;
- `GET /validation-inbox` ;
- `GET /jobs` ;
- actions disponibles ;
- loadout utilisateur ;
- personas ;
- ressources validees.

`GET /experience/orientation` reste le prochain branchement naturel, mais n'est pas obligatoire pour
le premier reset visuel si la Home peut deja etre alimentee par `CurrentContext`.

## 7. Methode de build par blocs

1. Bloc 0 : CDC reset + matrice + preuve Git.
2. Bloc 1 : coque neuve sans backend.
3. Bloc 2 : Home minimale.
4. Bloc 3 : orchestration backend existante.
5. Bloc 4 : action chips + input bas.
6. Bloc 5 : premiere scene Learn ou Teaching, seulement apres validation de la Home.

Chaque bloc doit etre testable seul et ne doit pas activer de provider, migration, suppression,
publication ou generation.

## 8. Anti-patterns

- afficher une fonction parce qu'elle existe ;
- transformer Home en dashboard technique ;
- mettre tous les modes et outils en vrac ;
- confondre job en cours et validation humaine ;
- presenter un asset candidat comme canon ;
- simuler micro/voix comme si c'etait live ;
- exposer admin/ops comme experience normale ;
- coder Learn/Teaching complet avant la coque.

## 9. Criteres d'acceptation Bloc 1 + 2

- l'app demarre ;
- login et contexte restent fonctionnels ;
- Home visible et lisible ;
- modes autorises accessibles ;
- panels existants toujours ouvrables ;
- persona actif visible sans donner de droit ;
- Validation Inbox et Task Monitor resumes separes ;
- action chips proches de l'entree basse ;
- aucun debordement horizontal a 390 px ;
- `npm run lint` et `npm run build:frontend` verts avant publication.

## 10. Regles de securite

- pas de commit/push sans validation MALEX ;
- pas de suppression de panels dans cette vague ;
- pas de backend nouveau ;
- pas de migration ;
- pas de provider voix/image ;
- pas de publication/export ;
- si une donnee manque, afficher un etat vide honnete.
