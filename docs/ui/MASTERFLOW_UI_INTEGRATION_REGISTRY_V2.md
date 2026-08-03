# MasterFlow UI Integration Registry V2

Statut : registre UI opérable actif sous `MASTERFLOW_UI_CDC_CANON_V2.md`
Owner : MALEX
Revue système : Vincent
Date : 2026-08-02
Base Git vérifiée : `main` / `29f08287db1893b2a535c13dbf684e0185546057`
Baseline historique : `MASTERFLOW_UI_INTEGRATION_REGISTRY_V1.md` / commit `fcfa68e`
Périmètre : classement et audit page par page. Aucun code runtime ni asset dans ce fichier.

## 1. Décision

Le CDC Canon V2 reste le canon UI de cadrage validé. Le registre V1 est conservé comme photographie
historique du 2026-07-04. Ce registre V2 devient la vue opérationnelle : il confronte ce canon au
frontend réellement présent dans `main` après les PR #221 à #224.

Une route, un bouton ou un composant présent dans Git ne suffit pas à déclarer une page utilisable.
Les statuts distinguent désormais rendu, données, action et publication.

## 2. Couches de vérité

| Couche | Source | Lecture autorisée |
|---|---|---|
| Canon UI | `MASTERFLOW_UI_CDC_CANON_V2.md` | promesse produit et garde-fous validés |
| Registre actif | ce fichier | état page par page réconcilié avec `main` |
| Git publié | `origin/main` au SHA vérifié | code et documents présents sur GitHub |
| Runtime historique | `App.tsx` | raccords existants à réutiliser, pas expérience active automatique |
| Prototype utilisé | `/ui-reset` et `current-ui-demo.tsx` | shell visible après connexion, partiellement raccordé |
| Component Lab | `/ui-lab` et `/ui-lab/vincent` | composants partagés, sans promesse runtime |
| Source historique | registre V1, CDC actif long, branche `codex/masterbuild-v2` | provenance, jamais queue active |
| Quarantaine | `_QUARANTINE_MASTERFLOW_2026-08-02` | récupération contrôlée, jamais canon automatique |
| Live partagé | non prouvé | aucune conclusion de déploiement depuis localhost ou Git seul |

## 3. Taxonomie UI V2

| Statut | Sens |
|---|---|
| `connected_verified` | rendu, données et comportement vérifiés ensemble |
| `connected_partial` | certaines données réelles alimentent la surface, comportement incomplet |
| `prototype_rendered` | composant visible et testable, sans contrat runtime complet |
| `prototype_non_rendered` | mode visible ou sélectionnable, mais aucune page n'est rendue dans `/ui-reset` |
| `legacy_runtime` | surface fonctionnelle encore présente dans `App.tsx`, hors expérience active après connexion |
| `lab` | composant isolé dans `/ui-lab`, sans publication produit implicite |
| `future_hidden` | capacité connue et volontairement non exposée |
| `future_exposed_drift` | capacité future affichée comme disponible : écart canon ↔ interface |
| `unavailable_honest` | surface indisponible explicitement expliquée |
| `misleading_control` | contrôle présenté comme pilotable alors qu'il ne déclenche aucune action réelle |

## 4. Matrice des surfaces dans `main`

| Surface | Ce qui existe réellement | Données / comportement | Statut V2 | Écart principal | Prochaine décision |
|---|---|---|---|---|---|
| Connexion `/` | formulaire réel puis redirection vers `/ui-reset` | auth réelle | `connected_partial` | accès direct à `/ui-reset` sans session sans CTA de connexion | ajouter un retour de connexion explicite lors d'une future tranche UI |
| Shell / navigation | rail, system bar, mobile bottom nav, profil et modes | contexte, rôle, loadout et surfaces d'actions | `connected_partial` | présence d'un mode ne garantit pas sa page | auditer chaque destination avant de la dire utilisable |
| Home | accueil, Room, utilisateur, six accès, Dock | `CurrentContext`, jobs, inbox et actions `live` | `connected_partial` | aucune dernière reprise, chantier, attention utile ou prochaine action | contractualiser Home avant toute retouche |
| MasterBuild | console simplifiée visible au GodMode | rôle GodMode ; retours transformés en propositions locales | `connected_partial` | absent du CDC/registre V1 car ajouté après la baseline | conserver comme surface système privée et l'auditer séparément |
| Component Lab | espaces MALEX et Vincent | état local séparé, composants partagés | `lab` | aucune promotion automatique vers prototype/runtime | garder comme banc de test commun |
| Project | bouton et mode dans le shell ; ancienne surface dans `App.tsx` | aucune page rendue dans `/ui-reset` | `prototype_non_rendered` + `legacy_runtime` | la connexion envoie vers une coque vide après sélection | auditer puis réutiliser le runtime existant dans le shell validé |
| Teaching | bouton et mode dans le shell ; ancienne surface connectée dans `App.tsx` | aucune page rendue dans `/ui-reset` | `prototype_non_rendered` + `legacy_runtime` | feature registry trop optimiste si l'on parle de l'expérience active | auditer après Project sans reconstruire les contrats existants |
| Learn | bouton et mode dans le shell ; fondations historiques | aucune page rendue dans `/ui-reset` | `prototype_non_rendered` + `legacy_runtime` | différence Learn/Teaching non visible | cadrer le Job-to-be-Done avant promotion |
| MasterStory | bouton et mode dans le shell | aucune page rendue dans `/ui-reset` | `prototype_non_rendered` | backend/anciens panneaux ne sont pas remontés dans le shell | auditer lecture, atelier et gates canon/spoilers |
| DA Studio | bouton et mode dans le shell | aucune page rendue dans `/ui-reset` | `prototype_non_rendered` | aucun état candidat/canon/provider dans la page active | garder candidate-only avant cadrage P3 |
| Inventory | bouton et ancien runtime riche | aucune page rendue dans `/ui-reset` | `prototype_non_rendered` + `legacy_runtime` | la fondation connectée existe mais n'est pas remontée | réutiliser le runtime, pas refaire un catalogue technique |
| Companions | mode déclaré `available` dans le registre prototype | rendu de page absent | `future_exposed_drift` | le canon et MASTERBUILD le classent futur | masquer ou contractualiser après décision MALEX |
| Personnage / Skilltree | page personnage et galaxies prototype | fixtures/profils locaux, pas identité/permission runtime complète | `prototype_rendered` | risque profil prototype = compte/persona | écrire un contrat de promotion séparé |
| Queue / Task Monitor | compteur et panneau lecture seule | `/jobs` réel | `connected_partial` | pas de détail de tâche utile | garder distinct de Validation Inbox |
| Notifications / Validation Inbox | compteur et panneau lecture seule | `/validation-inbox` réel | `connected_partial` | aucune décision depuis le nouveau shell | réutiliser le lifecycle existant plus tard |
| Bibliothèque d'actions | labels issus de `available_actions` | sélectionner ferme le panneau sans action | `misleading_control` | actions réelles affichées sans exécution, route ou préflight visible | rendre non pilotable explicitement avant tout raccord |
| Command Dock / chat | input, suggestions, historique et micro | envoyer efface le texte ; micro et historique simulés | `prototype_rendered` | apparence fonctionnelle sans conversation réelle | désigner comme prototype tant que WS/actions ne sont pas raccordés |

## 5. Réconciliation Home

### Promotion runtime du one shot 2026-08-02

La branche `codex/ui-runtime-consolidation-one-shot` résout les écarts transverses identifiés dans
la matrice sans déclarer MasterStory ou DA Studio terminés :

| Surface | Décision implémentée | Statut candidat au merge |
|---|---|---|
| Routes `/`, `/ui-reset`, `/current-ui` | un seul orchestrateur et un seul shell runtime | `connected_verified` |
| Home | reprise, attention, une action principale de navigation et trois raccourcis maximum | `connected_verified` |
| Project / Teaching / Learn / Inventory | composants runtime existants remontés dans le shell | `connected_verified` |
| MasterStory / DA Studio | page indisponible explicite, aucune simulation | `unavailable_honest` |
| MasterBuild | console privée, visible au GodMode seulement | `connected_partial` |
| Command Dock | chat/historique WS réels, micro/transcription désactivés | `connected_verified` |
| Actions | cycle backend réel et résultat visible | `connected_partial` |
| Companions | vue read-only dans Inventory, absente du menu principal | `connected_verified` |

Cette promotion ne vaut vérité publiée qu'après merge de la PR et ne prouve aucun déploiement.

### Consolidation Project — PROJECT-001 / PR #227

L'état vide Project est désormais une entrée utile pour GodMode et professeur : création via le
contrat backend existant, rafraîchissement de la liste et ouverture immédiate du projet créé. Project
reste absent pour l'étudiant sans affectation. Cette consolidation ne crée ni endpoint, ni rôle, ni
permission et ne transforme pas Project en back-office. La validation Git ne vaut pas déploiement.

### Consolidation Teaching — TEACHING-001 / PR #228

L'état vide Teaching propose désormais une création de classe réelle aux professeurs et au GodMode,
puis l'ajout des étudiants et la préparation du premier sujet. L'atelier avancé reste fermé par
défaut. Teaching demeure absent pour l'étudiant et l'isolation des classes privées reste inchangée.
Cette consolidation ne crée ni endpoint, ni rôle, ni permission et ne vaut pas déploiement.

### Valeur visible aujourd'hui

- identité de l'utilisateur ;
- Room active ;
- modes autorisés dérivés du contexte ;
- signaux Queue et Validation Inbox ;
- accès GodMode à MasterBuild.

### Valeur canon encore absente

- dernière reprise utile ;
- objet ou chantier actif ;
- prochaine action principale ;
- décisions et alertes importantes ;
- variante métier GodMode, professeur ou étudiant ;
- état déconnecté avec action de reconnexion ;
- distinction visible entre contrôle pilotable, prototype et indisponible.

### Contrat recommandé avant construction

```txt
contexte actif
-> dernière reprise
-> une action principale réellement pilotable
-> attention utile
-> trois raccourcis maximum vers des pages rendues
```

Les autres modes restent dans la navigation. Une action sans handler ou lifecycle réel est marquée
prototype/indisponible, jamais présentée comme action accomplissable.

## 6. Capacités et contradictions à arbitrer

| Sujet | Canon / registre | `main` actuel | Risque | Recommandation |
|---|---|---|---|---|
| Companions | futur hors P1/P2 | exposé comme disponible | promesse produit sans page ni contrat UI | masquer à terme jusqu'au contrat, sans changement dans ce Round documentaire |
| Modes métier | doivent mener à une surface utile | six destinations sans rendu dans `/ui-reset` | navigation trompeuse | auditer puis remonter les composants runtime existants page par page |
| Home | point de reprise | catalogue de six modes | surcharge et absence de prochaine action | valider le contrat Home V1 |
| Actions Dock | lifecycle, permission et préflight | labels réels, clics inertes | confusion action réelle / décor | afficher statut et préflight avant tout handler |
| Chat / micro | conversation réelle ou indisponibilité honnête | simulation visuelle | promesse de capacité inexistante | marquer prototype ou raccorder dans un Round distinct |
| MasterBuild | non décrit dans la baseline juillet | présent pour GodMode | surface système non cadrée dans le canon V2 | ajouter son contrat lors de l'audit GodMode |

## 7. Sources restaurées et sources encore manquantes

| Source | Situation au 2026-08-02 | Décision |
|---|---|---|
| `MASTERFLOW_UI_CDC_CANON_V2.md` | restauré depuis le commit Git `fcfa68e`, contenu canon validé | actif comme canon de cadrage |
| `MASTERFLOW_UI_INTEGRATION_REGISTRY_V1.md` | restauré avec bannière historique | provenance uniquement |
| `MASTERFLOW_UI_INTEGRATION_REGISTRY_V2.md` | créé depuis le `main` vérifié | registre opérationnel actif |
| `MASTERFLOW_UI_CDC_ACTIVE.md` | présent dans `main`, long historique de décisions | provenance/détail, pas plan actif unique |
| `MASTERFLOW_UI_SURFACE_SHELL_DOCK_V1.md` | présent sur l'ancienne branche, absent de `main` | vérifier contre les contrats MASTERBUILD avant récupération |
| Docs Lab/profils/raccourcis cités par le CDC V2 | présents seulement dans la quarantaine locale | candidats documentaires à inventorier séparément |

La restauration du canon et du registre ne promeut aucun asset, aucune Factory et aucun document
support absent. Toute récupération supplémentaire exige comparaison et décision explicites.

## 8. Queue UI active

### À faire maintenant

| Tâche | Statut | Validation |
|---|---|---|
| Valider le contrat Home V1 à partir de l'audit courant | `a_decider` | MALEX |
| Aligner les références MASTERBUILD sur ce registre V2 | `documentation` | inclus dans la réconciliation locale |

### À mettre en queue

| Ordre | Page / sujet | But |
|---|---|---|
| 1 | Home | obtenir un point de reprise utile et honnête |
| 2 | Project | remonter la première verticale métier existante dans le shell actif |
| 3 | Teaching | reprendre les composants et données déjà connectés |
| 4 | Learn | distinguer apprentissage, aide et Teaching |
| 5 | Inventory | réexposer la fondation réelle sans catalogue technique |
| 6 | MasterStory / DA Studio | cadrer candidats, canon et permissions avant édition |
| 7 | GodMode / MasterBuild | cadrer contrôle global, retours et permissions privées |

### À demander à Vincent

- confirmer le contrat stable à consommer pour la prochaine action Home, notamment
  `/api/v1/experience/orientation` ;
- confirmer le chemin frontend attendu entre suggestion, préflight, validation et exécution ;
- confirmer que la remontée des anciennes pages dans le nouveau shell ne modifie aucun contrat backend.

### À décider plus tard

- promotion de Companions hors statut futur ;
- contrat runtime du personnage/skilltree ;
- chat WS et micro/transcription ;
- récupération des documents Lab et profils restés uniquement en quarantaine.

## 9. Règle de mise à jour

Pour chaque page auditée :

```txt
objectif utilisateur
-> valeur visible en dix secondes
-> source des données
-> permission/loadout
-> action principale et préflight
-> états vide/partiel/verrouillé/futur/erreur
-> desktop/mobile/accessibilité
-> écart canon ↔ main
-> décision MALEX
```

Le statut du registre est mis à jour seulement avec une preuve dans `main` ou un rapport d'audit
local explicitement non publié. Une présence en Git ne vaut ni capacité utilisable ni déploiement.
