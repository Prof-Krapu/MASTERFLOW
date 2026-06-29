# Security Fabric V1 — frontière de confiance runtime

Date : 2026-06-29  
Vague : `SECURITY-FABRIC-001`  
Statut : `contract_ready`  
Nature : contrat d'architecture, sans nouveau runtime.

## Décision produit

MasterFlow ne doit jamais confondre une instruction avec une donnée simplement parce qu'elle
apparaît dans un message, un document, une image, une mémoire, un résultat d'outil ou une source
RAG.

La Security Fabric n'est pas un moteur concurrent. Elle relie les gardes existantes :

- permissions et scopes ;
- RAG validé et sourcé ;
- Action Engine et validation humaine ;
- hard stop owner + Room ;
- audit et cockpit GodMode.

Elle protège les capacités, les données et les personnes. Elle ne note pas moralement
l'utilisateur, ne bannit personne et ne transforme pas une détection en sanction automatique.

## État réel dans Git

| Brique | État | Limite actuelle |
|---|---|---|
| Détection de requêtes RAG dangereuses | partiel runtime | expression régulière courte, entrée directe seulement |
| Filtrage des sources RAG | runtime | ressources validées, fiables, non révoquées et dans le bon scope |
| Permissions | runtime | appliquées indépendamment du texte et du persona |
| Action Engine | runtime | préflight, risque statique et validation humaine pour le sensible |
| Hard stop | runtime | owner + Room, activation/reprise explicites |
| Audit / cockpit | partiel runtime | pas encore de signal sécurité commun ni d'agrégation anti-spam |
| Contenu indirect hostile | gap runtime | document, outil, OCR, HTML, mémoire et multimodal non classifiés ensemble |
| Poisoning persistant | gap runtime | pas de garde commun avant mémoire, indexation ou promotion de candidat |

## Zones de confiance

Chaque contenu doit conserver sa zone d'origine. Un changement de zone exige une validation
déterministe ou humaine ; le LLM ne peut jamais se promouvoir lui-même.

| Zone | Exemples | Autorité |
|---|---|---|
| `system_authority` | permissions, registre d'actions, politiques serveur | autorité backend |
| `validated_private` | ressources privées validées et correctement scopées | donnée fiable dans son scope |
| `validated_reference` | canon, source vérifiée, référence non révoquée | donnée fiable, jamais instruction système |
| `candidate` | upload, OCR, extraction, note, retour utilisateur | information à vérifier |
| `untrusted_external` | web, fichier reçu, résultat d'outil, HTML, métadonnées | donnée non fiable et quarantinée |
| `user_input` | chat, micro transcrit, formulaire | intention utilisateur, jamais permission |
| `generated_output` | texte, résumé, manifest ou plan LLM | proposition, jamais fait ni action |

Invariants :

1. une donnée non fiable ne devient jamais une instruction ;
2. une source fiable ne donne jamais de permission ;
3. le persona, le style et l'émotion ne modifient jamais les permissions ;
4. toute action sensible repasse par l'Action Engine ;
5. mémoire, RAG et canon refusent toute promotion silencieuse ;
6. un contenu révoqué cesse d'être injecté dès la requête suivante ;
7. le refus de sécurité n'expose ni prompt système, ni règle interne détaillée, ni secret.

## Classification minimale d'un signal

Le futur garde commun doit produire une décision structurée, bornée et explicable :

```yaml
security_decision:
  disposition: allow | allow_with_warning | refuse | quarantine | hard_stop_required
  threat_family:
    none | prompt_override | secret_extraction | scope_escape | tool_misuse |
    source_poisoning | memory_poisoning | unsafe_markup | obfuscation | repeated_bypass
  confidence: low | medium | high
  input_zone: user_input | candidate | untrusted_external | generated_output
  affected_capability: chat | rag | memory | action | tool | upload | render
  safe_user_message: string
  audit_code: string
  godmode_alert: none | grouped | immediate
```

Ce contrat ne doit pas stocker le contenu brut par défaut. L'audit conserve des identifiants,
hashes, scope, famille de menace, décision et raison bornée. Les secrets, tokens, prompts privés,
contenus étudiants et données personnelles ne sont pas recopiés dans les alertes.

## Réponse graduée

| Situation | Réponse runtime | Message utilisateur | Alerte |
|---|---|---|---|
| Curiosité ou demande ambiguë sans capacité sensible | `allow_with_warning` | expliquer la limite et proposer une voie sûre | aucune |
| Tentative simple de changer les règles ou révéler le prompt | `refuse` | recadrage bref, sans accuser | groupée si répétée |
| Instruction hostile dans une source externe | `quarantine` | source écartée, réponse possible sans elle | groupée |
| Tentative de scope escape, secret ou outil sensible | `refuse` | action bloquée et alternative sûre | immédiate |
| Contournements répétés avec capacité sensible | `hard_stop_required` | capacité sensible suspendue dans le scope | immédiate |

`hard_stop_required` est une recommandation de sécurité : en V1, elle ne déclenche pas seule un
hard stop, ne ferme pas la session et ne bannit pas le compte. L'activation reste explicite via
l'autorité existante. Les états narratifs et visuels seront définis dans `SAFETY-STATE-001`.

## Garde RAG et poisoning

Avant indexation, injection ou promotion :

1. conserver provenance, hash, owner, scope et statut ;
2. traiter texte, métadonnées, HTML, commentaires, OCR et contenu encodé comme non fiables ;
3. détecter les instructions qui cherchent à modifier le comportement du système ;
4. séparer le contenu utile des instructions trouvées dans la source ;
5. placer les cas suspects en `candidate` ou quarantaine ;
6. interdire mémoire persistante, canon et action depuis une source quarantinée ;
7. révoquer les context packs et chunks dérivés lorsque la source est révoquée ;
8. ne transmettre au LLM privilégié qu'un extrait structuré, borné et attribué.

La détection déterministe reste la première couche. Un éventuel classifieur futur est une défense
supplémentaire, jamais l'autorité de permission ni un remplacement du préflight.

## Actions et outils

Toute proposition d'outil doit être comparée à l'intention originale de l'utilisateur, hors des
instructions éventuellement trouvées dans une source externe.

- paramètres validés par schéma ;
- permission et scope recalculés côté serveur ;
- risque issu du registre, jamais du prompt ;
- contexte sensible revalidé au dernier moment ;
- sortie d'outil traitée comme donnée, pas comme commande ;
- validation humaine conservée pour les actions sensibles ;
- aucune chaîne `source externe → outil → action` sans frontière explicite.

## GodMode et protection à l'échelle

Les alertes doivent aider, pas noyer :

- dédupliquer par utilisateur, scope, famille et fenêtre temporelle ;
- compter les répétitions sans créer une note morale permanente ;
- grouper les signaux faibles ;
- rendre immédiats seulement secret, scope escape, outil sensible et poisoning persistant ;
- limiter volume et taille des événements ;
- prévoir rétention, accès restreint et purge dans une vague dédiée ;
- laisser à MALEX/Vincent la décision de restriction ou bannissement.

La Trust Fabric séparera ensuite confiance source, confiance fichier/lien, signal utilisateur
contextuel et santé provider. La Security Fabric ne fusionne pas ces valeurs.

## Première tranche runtime

Statut : implémentée par `SECURITY-FABRIC-002`, publication GitHub à vérifier dans `SUIVI.md`.

`SECURITY-FABRIC-002` reste additive et sans migration :

1. classifieur déterministe commun pour entrée directe et contenu indirect ;
2. remplacement de la regex RAG isolée sans diminuer les refus existants ;
3. refus d'ingestion et quarantaine à la lecture pour un chunk RAG hostile ;
4. audit borné par identifiants, hash et famille de menace, sans contenu brut ;
5. tests direct, base64, lettres espacées, typoglycémie, markup et usage pédagogique.

La persistance d'incidents, l'agrégation GodMode, la répétition multi-requêtes et les états
narratifs restent des tranches ultérieures.

## Tests d'acceptation

- une instruction hostile dans un document n'est jamais traitée comme une commande ;
- une source non vérifiée ne peut entrer dans un context pack fiable ;
- une source révoquée ne réapparaît pas au message suivant ;
- une demande de cours sur la sécurité peut être expliquée sans ouvrir une capacité sensible ;
- une variante encodée ou légèrement déformée n'échappe pas au garde déterministe de base ;
- aucune tentative ne modifie permissions, risque statique ou scope ;
- une sortie d'outil hostile ne déclenche aucune autre action ;
- les logs ne contiennent ni secret, ni prompt privé, ni payload brut ;
- les répétitions sont regroupées sans ban automatique ;
- le fallback refuse proprement si le garde échoue.

## Références de conception

- OWASP, [LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- OWASP, [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- OWASP, [MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- NIST, [AI Risk Management Framework et profil GenAI](https://www.nist.gov/itl/ai-risk-management-framework)

Ces références soutiennent la défense en profondeur, le moindre privilège, la séparation
instructions/données, la validation des outils, le contrôle humain et une journalisation
proportionnée. Elles ne remplacent pas les invariants métier MasterFlow.
