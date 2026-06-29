# Trust Fabric V1 — confiance explicable et non morale

Date : 2026-06-29  
Vague : `TRUST-FABRIC-001`  
Statut : `contract_ready`  
Nature : contrat d'architecture, sans nouveau runtime.

## Décision produit

MasterFlow ne doit pas afficher une unique « jauge de confiance » qui mélangerait comportement
utilisateur, qualité d'une source, intégrité d'un fichier et disponibilité d'un provider.

Ces signaux répondent à des questions différentes. Ils restent séparés, sourcés, datés,
contextuels et réversibles. Aucun score ne remplace les permissions, la validation humaine ou les
preuves.

## État réel dans Git

| Dimension | Existant | Limite |
|---|---|---|
| Source | statuts RAG, provenance, scope, hash, révocation | vocabulaire encore spécifique au RAG |
| Fait / résultat | nombreux champs `confidence` et Validation Inbox | échelles hétérogènes, sens dépendant du domaine |
| Fichier / lien | hash et storage sur certaines briques | pas de passeport commun MIME, fraîcheur, redirects, contenu actif |
| Utilisateur | audit, permissions, événements sécurité | aucun signal contextuel commun ; c'est préférable à un score moral |
| Système / provider | coût, tokens, workflow, profils LLM, release SHA | pas de read model commun de santé/charge |

## Les quatre dimensions

### 1. `source_trust`

Question : « Puis-je utiliser cette source comme preuve dans ce scope et maintenant ? »

Signaux :

- provenance et auteur connus ou inconnus ;
- statut candidat, validé, révoqué ou archivé ;
- scope et droit d'accès ;
- hash et version ;
- fraîcheur ;
- contradiction connue ;
- validation humaine et date.

`source_verified` signifie que la provenance est vérifiée, pas que chaque phrase est vraie.
`canonical` signifie que MasterFlow traite cette représentation comme autoritative dans son
scope, pas comme vérité universelle.

### 2. `artifact_integrity`

Question : « Ce fichier ou ce lien est-il intact et sûr à ouvrir ou analyser ? »

Signaux :

- hash, taille et type MIME observé ;
- extension cohérente ou trompeuse ;
- scan de contenu actif ;
- chaîne de redirections et domaine final ;
- date de récupération et fraîcheur ;
- signature ou preuve d'origine lorsqu'elle existe ;
- résultat Security Fabric : clair, avertissement ou quarantaine.

Un fichier intègre peut contenir une information fausse. Une source fiable peut être servie par un
lien cassé. Ces dimensions ne sont jamais fusionnées.

### 3. `user_risk_signal`

Question : « Cette requête précise nécessite-t-elle une précaution supplémentaire ? »

Ce n'est pas une note sur la personne. Le signal est :

- lié à un événement, une capacité et un scope ;
- accompagné d'un code raison explicable ;
- limité dans le temps ;
- réversible après comportement normal, validation ou revue ;
- isolé des compétences, notes scolaires, persona et réputation sociale ;
- inutilisable seul pour bannir, humilier ou retirer un rôle.

États proposés : `clear | observe | step_up | restricted_scope | human_review`.

Ils peuvent demander une confirmation, réduire une capacité sensible ou appeler une revue
GodMode. Ils ne modifient jamais silencieusement les permissions et ne deviennent pas un score
global permanent.

### 4. `runtime_health`

Question : « Le système ou provider peut-il exécuter cette capacité proprement maintenant ? »

Signaux :

- `healthy | degraded | unavailable | unknown` ;
- latence et taux d'échec ;
- budget restant, coût estimé et tokens ;
- quota/rate limit ;
- provider et modèle réellement sélectionnés ;
- release SHA vérifié ou inconnu ;
- dernier succès, dernier échec et fenêtre de mesure.

Une indisponibilité provider ne diminue jamais la confiance dans l'utilisateur. Le fallback reste
déterminé par les profils validés et les règles de confidentialité.

## Enveloppe commune

Chaque lecture de confiance doit pouvoir être expliquée sans exposer de contenu brut :

```yaml
trust_signal:
  dimension: source_trust | artifact_integrity | user_risk_signal | runtime_health
  subject_ref: string
  scope_ref: string
  state: string
  reason_codes: [string]
  evidence_refs: [string]
  confidence: low | medium | high | verified
  observed_at: epoch_ms
  expires_at: epoch_ms | null
  reversible: true
  recommended_guard: none | warn | step_up | quarantine | human_review
```

Règles :

1. aucune moyenne globale entre dimensions ;
2. pas de couleur rouge sans code raison et action de récupération ;
3. absence de preuve = `unknown`, jamais `trusted` ni `hostile` ;
4. un signal expiré ne justifie plus une restriction ;
5. permissions et scopes sont recalculés indépendamment ;
6. les preuves brutes privées ne sont pas recopiées dans le read model ;
7. toute décision sensible reste traçable et contestable.

## Échelle et anti-spam

Pour supporter une montée en charge :

- agréger par dimension, sujet, scope, raison et fenêtre temporelle ;
- limiter la cardinalité et la taille des reason codes ;
- conserver compteurs et hashes plutôt que prompts ou fichiers bruts ;
- utiliser TTL et purge par politique ;
- séparer événements sécurité, observabilité et traces pédagogiques ;
- grouper les alertes faibles et réserver l'immédiat aux risques sensibles ;
- utiliser `429` pour les limites de débit et `503` pour une indisponibilité temporaire ;
- ne jamais augmenter automatiquement une sanction parce que le système est lui-même surchargé.

## Surfaces futures

- utilisateur : message simple, raison, durée et manière de revenir à la normale ;
- Teaching : signal pédagogique non humiliant, sans classement des étudiants ;
- GodMode : agrégats, preuves, faux positifs, répétitions et décision humaine ;
- source/fichier : badges séparés « provenance », « intégrité », « fraîcheur » ;
- provider : état, coût, latence et fallback, sans secret.

La Safety State Machine pourra traduire certains signaux en état narratif. Elle ne devra pas
réinterpréter leur sens ni créer une sanction.

## Première tranche runtime recommandée

`TRUST-FABRIC-002` :

1. créer un read model pur à partir des données existantes, sans table ;
2. exposer séparément `source_trust` et `runtime_health` ;
3. garder `artifact_integrity` à `unknown` lorsque les preuves manquent ;
4. exposer `user_risk_signal` uniquement depuis les événements Security Fabric du scope courant ;
5. ne créer ni score composite, permission, sanction, rétention nouvelle ou UI rouge.

## Tests d'acceptation

- une source vérifiée n'est jamais présentée comme vérité absolue ;
- un fichier sain n'est pas automatiquement considéré comme fiable ;
- un événement hostile n'altère ni rôle, ni note, ni compétence ;
- un signal utilisateur expire ou peut être rétabli ;
- deux scopes d'un même utilisateur restent indépendants ;
- une panne provider ne dégrade que `runtime_health` ;
- absence de SHA/provider/preuve produit `unknown` ;
- les raisons sont visibles sans payload brut ;
- aucune dimension ne peut activer seule un ban ou une action sensible.

## Références de conception

- NIST, [SP 800-207 — Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final)
- NIST, [SP 1800-35 — Implementing a Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/1800/35/final)
- OWASP, [REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- Google Cloud, [Account Defender : scores et reason codes](https://docs.cloud.google.com/recaptcha/docs/account-defender)

MasterFlow reprend surtout l'absence de confiance implicite, la décision contextuelle, les reason
codes et l'évaluation des faux positifs. Il rejette l'usage d'un score de risque opaque comme
autorité générale sur l'utilisateur.
