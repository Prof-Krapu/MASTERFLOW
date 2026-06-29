# Voice Persona V1 — TTS contrôlé et contextuel

Date : 2026-06-29  
Vague : `VOICE-PERSONA-001`  
Statut : `contract_ready`  
Nature : audit et contrat, sans appel TTS ni provider.

## Verdict

Le TTS actuel est un PoC utile mais non prêt pour une utilisation MasterFlow robuste.

Le bouton frontend et le routeur Edge TTS existent. La voix sémantique du persona existe aussi,
mais elle décrit surtout son style d'écriture. Le lien technique persona → voix audio n'est ni
typé, ni autorisé par le contexte, ni borné.

## Écarts critiques

| Sujet | État actuel | Décision V1 |
|---|---|---|
| Authentification | route `/tts` sans `requireUser` | authentification obligatoire |
| Persona | `personaId` libre, sans Room/loadout | résoudre le porte-parole depuis la Room |
| Voix | valeur libre acceptée du client | whitelist serveur uniquement |
| Texte | aucune longueur maximale | maximum 1 200 caractères |
| Débit | aucune limite | limite courte par utilisateur |
| Réseau | Edge TTS appelé directement | timeout et échec explicite |
| Fichier temporaire | nettoyage surtout en fin de stream | nettoyage garanti sur succès/erreur/abort |
| Taille audio | non bornée | taille maximale et refus fail-closed |
| Audit | absent | métadonnées seulement, jamais le texte |
| Coût/privacy | non exposés | provider nommé, coût `unknown`, texte non conservé |

## Séparation des voix

- `voice_config` sémantique : registre, énergie, lexique, rythme, signatures.
- `tts_config` technique : identifiant whitelisté, langue, pitch, rate, volume.

Le style sémantique continue de piloter le texte. Le TTS ne réécrit jamais la réponse.
Une chimère conserve la voix audio du persona primaire, comme le porte-parole sémantique.

## Contrat de requête

```yaml
tts_request:
  text: string # 1..1200
  room_instance_id: string
  expected_persona_id: string | null
```

Le backend :

1. authentifie l'utilisateur ;
2. résout la Room accessible et son loadout ;
3. résout le porte-parole réel ;
4. refuse si `expected_persona_id` ne correspond pas ;
5. choisit une voix depuis la whitelist serveur ;
6. applique les bornes pitch/rate/volume ;
7. limite débit, timeout et taille ;
8. streame puis supprime toujours le fichier temporaire.

Le client ne choisit jamais directement une voix provider.

## Whitelist et fallback

La whitelist est une configuration serveur versionnée et testée. Chaque entrée porte :

- `voice_id` interne stable ;
- identifiant provider ;
- locale ;
- bornes pitch/rate/volume ;
- personas autorisés ;
- statut `active | disabled`.

Fallback :

1. voix active du persona primaire ;
2. voix française neutre MasterFlow ;
3. texte seul avec message discret.

Un échec audio ne bloque jamais le chat.

## Sécurité, privacy et coûts

- aucun secret, texte complet ou audio dans l'audit ;
- hash du texte, nombre de caractères, persona, Room, provider, durée et résultat seulement ;
- aucune conservation audio après réponse ;
- aucun clonage vocal ou imitation d'une personne réelle ;
- aucune voix ajoutée sans droits d'usage vérifiés ;
- provider payant interdit dans cette V1 ;
- statut Trust `runtime_health` dégradé en cas d'échecs répétés, jamais le signal utilisateur.

## Frontend

- bouton seulement sur une réponse assistant terminée ;
- un audio actif à la fois ;
- second clic = arrêt ;
- état chargement, lecture, erreur et fallback texte ;
- annulation si l'utilisateur change de Room ou de persona ;
- pas de lecture automatique par défaut ;
- préférence utilisateur future, explicite et accessible.

## Hors périmètre

- micro, STT et transcription live ;
- clonage vocal ;
- émotion vocale générative ;
- dialogue multi-personas audio ;
- cache audio persistant ;
- provider payant ;
- lecture automatique en classe.

## Première tranche runtime recommandée

Statut : implémentée par `VOICE-PERSONA-002`, publication GitHub à vérifier dans `SUIVI.md`.

1. schéma partagé strict et service TTS injectable ;
2. auth + Room + speaker réel partagé avec le chat ;
3. suppression de la voix libre côté client ;
4. whitelist serveur minimale, 1 200 caractères, quota, timeout, taille et cleanup ;
5. générateur mocké dans les tests, sans appel réseau ;
6. bouton frontend conservé avec le nouveau contrat.

## Tests d'acceptation

- anonyme = 401 ;
- persona hors loadout = refus ;
- voix libre envoyée par le client = ignorée ou body invalide ;
- texte trop long = 400/413 ;
- débit dépassé = 429 ;
- timeout/provider KO = erreur bornée, chat intact ;
- fichier temporaire supprimé sur succès, erreur et abort ;
- chimère = voix du primaire ;
- audit sans texte brut ni secret ;
- aucun test ne contacte Edge TTS.
