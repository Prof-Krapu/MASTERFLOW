# Design Preflight — LEARN-001

## Intention

Rendre Learn utile comme espace d'aide personnel, distinct de Teaching, depuis le runtime unique
publié. Learn aide l'utilisateur à comprendre, pratiquer et demander de l'aide ; Teaching reste la
surface professeur pour gérer classes, sujets et corrections.

## Surface, rôles et première valeur

- surface : `Learn` dans le shell runtime commun ;
- rôles : étudiant, professeur et GodMode, chacun sur son propre contexte personnel ;
- valeur visible en dix secondes : besoin actuel, sources validées disponibles et action
  `Demander de l'aide` ;
- action principale : préparer une demande dans le vrai chat sans l'envoyer automatiquement ;
- action secondaire : inspecter les limites de l'aide pédagogique.

## Données et permissions

- profil : `GET /api/v1/learning-mirror/profiles/:userId`, lecture de son propre profil ;
- cadre d'aide : `POST /api/v1/pedagogical-assistance/classify`, lecture seule ;
- sources : registre Resource Truth déjà filtré sur les ressources validées ;
- chat : WebSocket runtime existant ;
- progression : non affichée tant que la source primaire n'est pas arbitrée entre profil
  d'apprentissage, compétences et résumé de progression.

Le bug constaté venait de middlewares `teacher` montés à la racine de l'API : ils interceptaient les
routes étudiantes suivantes. La correction scope chaque gate à son propre préfixe sans modifier les
permissions métier de ce domaine.

## États

- chargement : profil d'aide en cours de lecture ;
- vide : aucun profil validé, aide neutre et choix laissé à l'utilisateur ;
- partiel : profil brouillon visible mais non appliqué comme vérité ;
- erreur : message naturel, sans code technique brut ;
- progression : indisponibilité explicite, aucune valeur inventée ;
- session expirée : gérée par l'orchestrateur commun.

## Responsive et accessibilité

- une action principale et une action secondaire ;
- labels, régions et messages `status`/`alert` explicites ;
- actions empilées sous 720 px ;
- contrôle réel à 390 px sans débordement horizontal ;
- aucun autoplay, autofocus, envoi automatique ou gamification de rétention.

## Exclusions

Aucun asset, nouvelle permission métier, migration, provider, coût ou déploiement. Aucun résumé de
progression n'est promu avant arbitrage de sa source de vérité.

## Preuves locales

- backend complet : `703/703` ;
- régression routeurs racine + Learning Mirror : `8/8` ;
- lint backend et frontend ;
- build frontend ;
- MASTERBUILD : `12/12`, lint et build ;
- smoke étudiant, professeur et GodMode ;
- étudiant : profil vide lisible et aide sans `forbidden` ;
- chat ouvert avec brouillon non envoyé ;
- `clientWidth = scrollWidth = 390` ;
- aucune erreur console.
