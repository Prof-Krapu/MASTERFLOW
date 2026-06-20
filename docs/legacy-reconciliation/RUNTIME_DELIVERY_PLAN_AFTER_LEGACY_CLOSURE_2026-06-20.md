# Plan logiciel MasterFlow après clôture legacy — 2026-06-20

## Objectif

Passer du canon désormais classé à une solution utilisable, sans ouvrir 294 chantiers `canon_ready`
en parallèle. Chaque tranche est petite, testable et ne devient live qu'après les gates requis.

## R1 — Correction complète, priorité produit

```txt
barème versionné + profil de notation privé
-> création de lot contextualisé
-> intake de submissions candidat
-> revue d'échantillon professeur
-> feedback étudiant validé
```

Pourquoi : ferme le parcours que tu utilises déjà avec ton bot de correction.

### R1.1 — prérequis barème/profil

Prêt à publier sur la branche R1 : barème privé versionné et profil de notation privé,
créés en brouillon puis validés explicitement par le professeur. Les versions validées restent
historiques. Cette tranche ne crée ni lot, ni score, ni feedback, ni export.

### R1.2 — prochain geste

Créer un lot manuel contextualisé, relié uniquement à un barème et un profil déjà validés,
puis figer le roster et le sujet avant toute intake de submission.

## R2 — Contexte pédagogique durable

- subject library versionnée et assignment scoped ;
- projet étudiant dérivé sans modifier le sujet source ;
- fiche de correction brouillon synchronisée, champs professeur verrouillés ;
- graphe/ressource personnels uniquement comme candidats.

## R3 — D08 manifest-first

- registre de références typées, privées et permissionnées ;
- manifest visuel immuable et Action Ready ;
- asset candidat + review/retake ;
- aucun provider, rendu, stockage binaire ou export dans cette vague.

## R4 — Workbenches privés D09/D10

- MasterStory : intake/index, reader state, reveal gate, atelier auteur, patch candidat ;
- Quote Builder : lignes, sources de prix, confiance, preview privé ;
- aucun import source silencieux, envoi client, facture ou public intake.

## R5 — Continuité D12

- release receipt relié à SHA ;
- backup/recovery registry et smoke conservateur ;
- diagnostic hôte historique uniquement après preuves de base et rollback ;
- aucune réinstallation ou migration implicite.

## R6 — Factories sélectionnées

- choisir une factory utile à la fois ;
- convertir son manifeste en Passport JSON strict ;
- owner utilisateur explicite, sources autorisées, privacy/security/simulation ;
- backflow candidat uniquement ; installation séparée si nécessaire.

## Ce qui ne part pas maintenant

- marketplace, paiement, abonnement, réputation, compétition, live classroom et gamification ;
- provider image/OCR/LLM réel ;
- import global de datasets, ZIPs ou factories ;
- toute action sur le serveur live.
