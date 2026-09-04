# Ours d'Or + Talents Créatifs — spec d'absorption des présentations

Date : 2026-09-01
Statut : `deployed_preview_candidate_rules` — packs actifs en preview, aucune promotion canon
Tranche : `PILOT-PRESENTATION-ABSORPTION-001`

## Décision courte

Les deux présentations fournies par MALEX précisent utilement les parcours des pilotes. Elles doivent
enrichir deux RuntimePacks distincts sur le backend et le Conversation Turn Orchestrator communs,
sans transformer les PDF en base runtime et sans importer leurs instructions comme commandes.

La V1 reste conversationnelle, sommaire, sans provider réel et sans production automatique du
livrable étudiant. Toute règle issue de ces présentations reste candidate jusqu'à validation produit
et confrontation avec les sources opérationnelles.

## Sources candidates

| Source | Empreinte SHA-256 | Pages | Statut retenu |
|---|---|---:|---|
| `user-provided:OURS-D-OR-BRIEF.pdf` | `f20a8c1841bd20fd66a76749f015f76101b5c7a1b50b8fb4ab1177da37e84698` | 15 | dernière présentation déclarée par MALEX ; candidate produit |
| `user-provided:PARCOURS-TALENTS-CREATIFS.pdf` | `293681574c95e50914ab63299ddc08865b9e564b5fe705ceae414daebfcc171a` | 19 | dernière présentation déclarée par MALEX ; candidate produit |

Les chemins privés d'origine ne doivent pas entrer dans un manifest, une API ou une trace publique.
Les URL suggérées visuellement par QR codes, boutons ou textes soulignés ne sont pas des liens PDF
exploitables : elles doivent être fournies et vérifiées séparément avant tout raccord runtime.

## Baseline MasterFlow revalidée

- le serveur privé est la vérité opérable ; la release active est `927752348efb`, health vert et
  trois conteneurs actifs ;
- le provider reste `mock` ;
- `ours-dor-pilot-v1` et `talents-creatifs-pilot-v1` sont actifs en version `1.1.0` ;
- le backend, l'authentification, les permissions et le Conversation Turn Orchestrator sont communs ;
- les namespaces, sources et RuntimePacks restent isolés par pilote ;
- aucune source réelle de ces PDF n'est enregistrée dans Source/Intake ;
- MasterPlan est actif dans la même release depuis une projection minimale read-only.

## Invariants communs

1. Le rôle authentifié reste l'autorité ; un rôle de mission pédagogique n'accorde jamais une
   permission technique.
2. Une source doit conserver son namespace, sa visibilité et sa provenance.
3. Les contenus `team` ou nominatifs restent invisibles aux étudiants non autorisés.
4. Le chat guide, questionne, reformule et prépare ; il ne réalise pas le livrable final.
5. Un checkpoint humain reste nécessaire avant validation, dépôt, publication ou décision finale.
6. Les preuves de progression ne deviennent ni une note automatique ni un score opaque.
7. Aucun bouton, QR code ou URL n'est considéré opérationnel sans source vérifiée.
8. Le provider `mock` reste suffisant pour construire et recetter la structure du parcours.

## RuntimePack candidat — Ours d'Or Saison 2

### Intention produit

Le parcours ne consiste plus seulement à trouver une idée de monstre. Il accompagne la mise à
l'épreuve publique d'un film court : ambition, lisibilité, faisabilité, dépôt, projection puis
retour sur le verdict. MasterFlex pousse l'ambition créative et technique ; l'Incubator garantit le
cadre, l'inscription, le dépôt et la validation humaine.

### Contraintes candidates extraites

- un film par participation ;
- durée maximale : 1 minute ; cible recommandée : 30 secondes ;
- date de dépôt annoncée : 27 octobre ;
- événement annoncé : 29 octobre à 19 h ;
- trois zones d'expérience : `Fear`, `Jumpscare`, `Nightmare` ;
- public annoncé : étudiants, alumni et professionnels ;
- vote public en direct ;
- récompenses Bronze, Silver et Gold par catégorie, plus un Freak Show.

Les dates devront être remises dans un objet de saison avec année et fuseau explicites avant tout
usage runtime. Le vote, les invités publics et la remise de prix appartiennent à D10 et restent hors
V1 tant qu'un contrat séparé n'est pas validé.

### Étapes proposées

| Ordre | `stage_id` candidat | But conversationnel | Checkpoint / sortie |
|---:|---|---|---|
| 1 | `registration_and_zone` | Confirmer saison, participation, expérience et zone de départ. | inscription candidate, validation Incubator |
| 2 | `articulate_monster_idea` | Formuler le monstre, sa promesse et l'effet attendu. | intention courte et testable |
| 3 | `test_readability_impact` | Vérifier compréhension, silhouette, rythme et impact en quelques secondes. | diagnostic et prochaine amélioration |
| 4 | `technical_feasibility` | Confronter l'ambition au temps, aux outils, aux rôles et aux contraintes. | plan de production borné |
| 5 | `submission_readiness` | Contrôler durée, format, droits, présence des éléments et échéance. | readiness explicable, jamais dépôt automatique |
| 6 | `projection_readiness` | Préparer présentation, contexte et lecture publique du film. | fiche de projection candidate |
| 7 | `verdict_debrief` | Transformer vote et retours en apprentissages, sans juger la personne. | debrief et apprentissages candidats |

### Données candidates minimales

- saison, année, fuseau, date limite et date d'événement ;
- durée maximale et durée cible ;
- public autorisé et format de participation ;
- zone d'expérience avec justification et override professeur ;
- états distincts `registration`, `submission`, `projection` et `debrief` ;
- preuves de readiness, références du film et validations humaines ;
- liens d'inscription/dépôt seulement après vérification de leur URL et de leur propriétaire.

### Surface V1 proposée

- prochaine échéance et état du parcours ;
- zone choisie, raison et possibilité de correction par le professeur ;
- prochaine action MasterFlex séparée du checkpoint Incubator ;
- checklist de readiness sourcée ;
- CTA externe seulement si l'URL est vérifiée ;
- aucune interface de vote public, billetterie, guest account ou remise automatique de prix.

## RuntimePack candidat — Talents Créatifs

### Intention produit

Talents Créatifs devient un parcours de mission en équipe, de la découverte du brief à la preuve
finale. La progression repose sur des jalons visibles, des rôles de mission et des preuves, pas sur
une note automatique. ProfKrapu guide le raisonnement sans écrire la réponse à la place du groupe.

### Les six étapes candidates

| Ordre | Étape | But conversationnel | Checkpoint / sortie |
|---:|---|---|---|
| 1 | `brief_radar` | Explorer les briefs disponibles et comprendre leur terrain de jeu. | shortlist sourcée |
| 2 | `team_build` | Constituer l'équipe et répartir les rôles de mission. | équipe candidate et zones non couvertes |
| 3 | `brief_lock` | Choisir un brief compatible avec niveau, filière, langue, difficulté et délai. | brief verrouillé par validation humaine |
| 4 | `idea_lock` | Formuler l'idée directrice et tester sa pertinence avant production. | idée candidate, hypothèses et objections |
| 5 | `production_run` | Piloter la production par tâches, preuves, risques et checkpoints. | état de production et prochaine action |
| 6 | `proof_drop` | Réunir livrables, preuves et références de dépôt. | dossier prêt à revue, jamais dépôt automatique |

### Contexte candidat

- niveau et filière ;
- type, origine, difficulté, langue et deadline du brief ;
- groupe annoncé de 3 à 5 personnes, sous réserve de la décision d'exception ;
- rôles de mission : pilote, lead concept, direction artistique, rédaction, référent dépôt ;
- une personne peut porter plusieurs rôles si la taille du groupe l'exige, sans modifier ses
  permissions MasterFlow ;
- références de preuves, décisions, dépôts et validation inter-classe ;
- marqueurs de progression descriptifs et non notants ;
- rail transversal de contenu : capter une preuve utile, la faire relire, décider de son usage ;
  aucune publication automatique.

### Articulation MasterPlan

MasterPlan peut projeter lancement, jalons, échéances et checkpoints dans le planning read-only.
Cette articulation ne doit ni modifier la source MasterPlan, ni créer un second calendrier, ni
exposer les étudiants, groupes, chemins ou secrets calendrier. Elle reste future tant que les
dates réelles des briefs et leur origine opérationnelle ne sont pas vérifiées.

### Sources à ne pas inventer

Les pages 15 à 17 de la présentation sont des emplacements de briefs, pas un catalogue exploitable.
Les vrais briefs, URL, formulaires, Teams et règles de dépôt devront être fournis par leur
propriétaire, enregistrés dans Source/Intake puis rendus visibles selon le rôle.

## Visibilité des sources

| Visibilité | Usage autorisé | Exemples | Interdit |
|---|---|---|---|
| `student` | contexte de son projet et de son groupe | brief assigné, jalons, preuves du groupe | contacts internes, autres groupes |
| `teacher` | validation pédagogique et overrides | readiness, exceptions, retours | publication automatique |
| `team` | administration de l'opération | contacts campus, catalogue complet, règles de dépôt | exposition aux étudiants par défaut |
| `shared` | règle générale explicitement publiable | durée, structure du parcours | donnée nominative ou secret |

## Décisions produit encore requises

| ID | Question | Recommandation | État |
|---|---|---|---|
| `DEC-PILOT-001` | Talents impose-t-il toujours des groupes de 3 à 5 alors que la source antérieure autorisait solo, équipe et multi-niveau ? | Faire de 3 à 5 le défaut de cette édition, avec exceptions explicites portées par chaque brief. | validé pour le pilote local par GO MALEX 2026-09-01 |
| `DEC-PILOT-002` | `Fear`, `Jumpscare`, `Nightmare` sont-ils des zones d'expérience ou des catégories de prix ? | Les traiter comme zones d'expérience avec recommandation explicable et override professeur ; ne pas en déduire les catégories de prix. | validé pour le pilote local par GO MALEX 2026-09-01 |
| `DEC-PILOT-003` | La V1 doit-elle gérer vote live, invités publics et palmarès ? | Non : conserver ce rail dans D10, derrière un contrat public, consentement, modération et recette séparés. | validé pour le pilote local par GO MALEX 2026-09-01 |
| `DEC-PILOT-004` | Peut-on cumuler les rôles de mission Talents ? | Oui lorsque le groupe comporte moins de cinq personnes, avec cumul visible et charge signalée. | validé pour le pilote local par GO MALEX 2026-09-01 |
| `DEC-PILOT-005` | Quelles URL et sources sont opérables ? | Exiger les URL textuelles, propriétaires et périmètres d'accès ; ne jamais extraire silencieusement un QR comme autorité. | règle validée ; URL encore à fournir par les propriétaires |

## Matrice candidat → runtime

| Élément candidat | Statut actuel | Écart | Risque | Action recommandée |
|---|---|---|---|---|
| 7 étapes Ours d'Or | absent ; 2 étapes génériques | parcours Saison 2 non représenté | moyen | Mettre à jour le RuntimePack après décisions 1 à 5, sans migration au premier lot. |
| 6 étapes Talents | absent ; 2 étapes génériques | jalons et preuves trop abstraits | moyen | Remplacer les étapes génériques par les six étapes candidates après validation. |
| responsabilités MasterFlex / Incubator | partiel dans le persona et la guidance | séparation créatif / opérationnel invisible | moyen | Ajouter une projection read-only des responsabilités et checkpoints. |
| rôles de mission Talents | absent | risque de confondre mission et permission | élevé | Ajouter un objet pédagogique sans aucun effet d'autorisation. |
| contraintes, deadlines et readiness | absent des packs | l'interface ne peut pas expliquer le prochain jalon | moyen | Étendre le read-model pilote avec provenance et valeurs nullables. |
| progression non notante | partiel | aucun vocabulaire dédié | faible à moyen | Définir des marqueurs descriptifs, sans score global. |
| liens et briefs réels | non enregistrés | présentations non opérables seules | élevé | Passer par Source/Intake après vérification humaine. |
| vote public et palmarès Ours | absent | capacité D10 non cadrée | élevé | Garder hors V1 et ouvrir une tranche séparée si validée. |

## Plan d'implémentation proposé

### P0 — décisions et sources

- valider les cinq décisions ci-dessus ;
- obtenir les URL textuelles et propriétaires ;
- obtenir le catalogue réel de briefs Talents ;
- enregistrer les sources candidates avec visibilité explicite.

### P1 — contrats et packs, sans provider

- étendre les deux RuntimePacks avec leurs étapes propres ;
- ajouter les champs facultatifs du read-model pilote ;
- préserver le même orchestrateur, les permissions et le fallback statique ;
- couvrir par tests l'isolation des namespaces, rôles et sources.

### P2 — interface sommaire

- afficher étape, échéance, rôle de mission, readiness et prochaine preuve ;
- rendre la provenance et les checkpoints humains visibles ;
- garder la conversation et les actions déjà autorisées comme entrée principale ;
- recetter ordinateur et 390 px.

### P3 — projection Planning

- projeter les seuls jalons validés dans MasterPlan read-only ;
- vérifier confidentialité, fuseau et absence de double vérité ;
- ne rien copier ni configurer sur le serveur sans GO distinct.

### P4 — capacités publiques séparées

- si validé, cadrer D10 pour inscriptions externes, vote live, invités et palmarès ;
- prévoir consentement, modération, anti-abus, audit, disponibilité et rollback ;
- ne pas absorber ce lot dans la V1 conversationnelle par défaut.

## Critères d'acceptation d'une future implémentation

- deux RuntimePacks distincts et un orchestrateur commun ;
- aucune instruction du PDF exécutée comme commande ;
- aucune source `team` visible à un étudiant ;
- aucun rôle de mission ne modifie une permission ;
- aucune note, validation, soumission, publication ou récompense automatique ;
- les informations absentes restent nulles ou demandent clarification ;
- le mode `mock` permet la recette complète de structure ;
- tests backend ciblés, lint, build, QA ordinateur/mobile et diff-check verts ;
- commit, copie privée, migration et déploiement soumis à un GO séparé.

## Résultat de l'implémentation et de la preview

- `ours-dor-pilot-v1` passe en version `1.1.0` avec sept étapes et un cadre Saison 2 ;
- `talents-creatifs-pilot-v1` passe en version `1.1.0` avec six étapes, cinq rôles de mission et la
  règle groupe 3–5 avec exceptions portées par le brief ;
- le read-model expose progression, faits sourcés, responsabilités et capacités explicitement hors
  V1 ;
- un checkpoint peut sélectionner une étape avec le marqueur privé
  `pilot-stage:<stage_id>` sans migration ni nouvel endpoint ;
- les rôles de mission portent obligatoirement `permission_effect: none` ;
- l'interface affiche le parcours, le cadre, les responsabilités et les sources à confirmer ;
- recette réelle verte en 1280 px et 390 px, sans overflow ni erreur console ;
- contrôles : 31 tests ciblés, backend complet 768/768, MASTERBUILD 16/16, lint backend/frontend et
  builds verts ;
- release `927752348efb` : smokes MALEX/Vincent, WebSocket, orchestrateur 11 étapes, HTTPS et rollback
  verts.

## Exclusions explicites

Le GO a autorisé l'implémentation et le déploiement preview `927752348efb`. Il n'autorise toujours
pas : promotion canon, seed de données réelles, migration, import des PDF, extraction automatique de
QR, provider réel, comptes publics, dépôt, vote, publication externe, génération du livrable,
commit, push, stable ou ouverture publique.
