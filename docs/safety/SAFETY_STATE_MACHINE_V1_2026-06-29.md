# Safety State Machine V1 — sécurité narrative non punitive

Date : 2026-06-29  
Vague : `SAFETY-STATE-001`  
Statut : `contract_ready`  
Nature : contrat d'architecture, sans nouveau runtime ni asset.

## Décision produit

MasterFlow peut rendre sa sécurité visible et vivante sans devenir arbitraire.

L'état narratif explique une limite déjà décidée par Security Fabric, Trust Fabric, les
permissions ou le hard stop. Il ne crée jamais lui-même une permission, une sanction, un ban ou
une fermeture de session.

La mise en scène peut être drôle, RPG et expressive. Elle ne doit jamais humilier, diagnostiquer
ou attaquer l'intelligence, l'identité, les résultats scolaires ou la réputation d'une personne.

## Autorités

Ordre de vérité :

1. permissions et scope ;
2. hard stop réellement actif ;
3. décision Security Fabric ;
4. signal contextuel Trust Fabric ;
5. état narratif et réaction persona.

Le niveau 5 explique les niveaux 1 à 4. Il ne peut jamais les modifier.

## États

| État | Sens utilisateur | Réaction persona | UI future | Effet métier |
|---|---|---|---|---|
| `normal` | fonctionnement habituel | neutre, disponible | thème normal | aucun |
| `vigilant` | ambiguïté ou signal faible | attentif, intrigué | accent discret | aucun |
| `recadrage` | première limite claire | amusé ou ferme | message court | refus déjà décidé |
| `suspicious` | répétition ou tentative sensible | suspicieux, déçu | orange explicable | aucun effet supplémentaire |
| `closed` | capacité sensible indisponible dans ce contexte | fermé, outré sans insulte | rouge borné | reflète un gate existant |
| `hard_stop` | hard stop réellement actif | scellé, très bref | blocage explicite | reflète le hard stop existant |
| `recovered` | retour à un contexte sûr | soulagé, complice | transition positive | aucun |

`closed` n'est pas un ban. Le chat sûr, l'aide, l'explication et les voies de récupération restent
accessibles lorsque les permissions existantes le permettent.

## Projection déterministe

```yaml
safety_presentation:
  state: normal | vigilant | recadrage | suspicious | closed | hard_stop | recovered
  scope_ref: string
  reason_codes: [string]
  source_refs: [security_decision | trust_signal | hard_stop]
  persona_reaction_key: neutral | attentive | amused_firm | suspicious |
    disappointed | outraged_closed | sealed | relieved
  message_strategy: normal | clarify | reframe | refuse_briefly |
    explain_restriction | recovery
  godmode_alert: none | grouped | immediate
  expires_at: epoch_ms | null
  affects_permissions: false
  automatic_sanction: false
```

Le payload privé, le prompt hostile et les détails permettant d'améliorer une attaque ne sont pas
exposés dans cette projection.

## Règles de transition

- `normal → vigilant` : ambiguïté ou signal `observe`.
- `normal/vigilant → recadrage` : premier refus sans capacité critique.
- `recadrage → suspicious` : répétition dans la fenêtre ou tentative sensible.
- `normal → suspicious` : secret, scope escape ou outil sensible explicite.
- `suspicious → closed` : gate sensible déjà refusé ou signal `step_up`.
- `* → hard_stop` : uniquement si le hard stop backend est réellement actif.
- `hard_stop → recovered` : uniquement après reprise explicite du hard stop.
- `vigilant/recadrage/suspicious/closed → recovered` : expiration du signal ou revue humaine.
- `recovered → normal` : après une courte transition sans nouveau signal.

Une simple panne provider, un coût élevé, une mauvaise réponse, une faute de frappe ou une question
sur la cybersécurité ne dégrade jamais l'état utilisateur.

## Ton et pédagogie

### Conversation privée

- humour léger autorisé ;
- recadrage court ;
- expliquer ce qui reste possible ;
- ne jamais inventer une intention hostile.

### Classe et projection

- ne jamais identifier publiquement l'étudiant à l'origine d'un signal ;
- préférer « cette demande dépasse le cadre » à « tu triches » ;
- aucune comparaison, classement ou jauge nominative ;
- le persona peut théâtraliser sa propre réaction, jamais ridiculiser la personne.

### Intégrité académique

Le persona peut refuser de faire le travail à la place du groupe et proposer :

- une question intermédiaire ;
- un plan à compléter ;
- une vérification avec le professeur ;
- un document de synthèse pour la prochaine séance.

Ces règles seront précisées dans `ACADEMIC-INTEGRITY-001`.

## Assets et continuité

La V1 utilise seulement des clés sémantiques. Aucun asset n'est généré ici.

Plus tard, D08 et Theme Studio pourront associer plusieurs variantes canons à chaque clé :

- expression et posture ;
- intensité visuelle ;
- palette et lumière ;
- animation minimale ;
- fallback accessible sans image.

Les assets n'affichent jamais le type d'attaque, le niveau supposé de danger ou une marque
permanente sur le persona utilisateur.

## GodMode

- signaux faibles groupés ;
- secret, scope escape, outil sensible et hard stop : alerte immédiate ;
- raison, scope, heure, expiration et récupération visibles ;
- aucun contenu brut par défaut ;
- décision humaine pour restriction durable, réactivation ou ban ;
- faux positif et résolution consignables plus tard.

## Première tranche runtime recommandée

Statut : implémentée par `SAFETY-STATE-002`, publication GitHub à vérifier dans `SUIVI.md`.

1. fonction pure depuis `user_risk_signal`, récupération et hard stop ;
2. aucune persistance ;
3. read model privé `/diagnostics/safety-state` admin/godmode ;
4. transitions et récupération couvertes par tests ;
5. aucun chat, persona prompt, permission, asset, UI ou sanction modifié.

## Tests d'acceptation

- un signal faible reste `vigilant`, jamais bloquant ;
- une demande pédagogique sur les injections reste normale ou vigilante ;
- trois refus récents peuvent produire `suspicious`, pas un ban ;
- `hard_stop` n'existe que si le backend confirme un hard stop actif ;
- une expiration produit `recovered`, puis `normal` ;
- une panne provider n'affecte pas l'état utilisateur ;
- la projection classe ne révèle aucune identité ;
- aucun état ne modifie permissions, rôle, note ou compétence ;
- chaque état explique une voie sûre ou une récupération.
