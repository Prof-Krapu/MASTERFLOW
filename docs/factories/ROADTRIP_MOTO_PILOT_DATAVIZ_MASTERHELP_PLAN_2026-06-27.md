# Roadtrip Moto — Pilote Dataviz + MasterHelp

Date : 2026-06-27  
Statut : plan de patch Factory, non appliqué au dossier Factory dans cette vague Git  
Factory active : `/Users/malex/Desktop/FACTORIES/ROADTRIP_MOTO/CURRENT/ROADTRIP_MOTO_COPILOT_V1`

## État actuel

Roadtrip Moto V1.3 est le meilleur pilote actuel pour :

- source truth critique ;
- GPX integrity ;
- Dataviz portable ;
- visual roadbook ;
- checkpoints manuels ;
- extraction MasterFlow backflow.

Limite : le pack est statically tested, mais `PLATFORM_PILOT_PENDING`.

## Patch recommandé

### 1. Renforcer le boot

Au boot, la Factory doit identifier :

- nouveau voyage ou reprise ;
- présence GPX ou absence GPX ;
- niveau de risque ;
- support attendu : préparation, route à l'arrêt, export, audit ;
- profil utilisateur : novice, standard, expert ;
- besoin MasterHelp générique ou Roadtrip spécifique.

### 2. Ajouter lecture MasterHelp

La Factory doit savoir dire :

```txt
Ce besoin est Roadtrip spécifique.
Ce besoin est Situation Companion générique.
Ce signal peut devenir primitive MasterFlow.
```

### 3. Ajouter extraction Dataviz renforcée

Commandes :

- `AUDIT DATAVIZ`
- `EXTRACTION DATAVIZ`
- `PRÉPARER CANDIDAT MASTERFLOW`
- `EXPORT MASTERFLOW INBOX`

La sortie doit séparer :

```yaml
roadtrip_product_candidates: []
masterhelp_primitive_candidates: []
dataviz_portable_candidates: []
gpx_or_geo_specific_items: []
rejected_or_local_only: []
```

### 4. Verrouiller cartographie/GPX

- LLM peut expliquer, annoter et comparer.
- LLM ne redessine jamais une géométrie comme vérité.
- Un export GPX transformé doit rester `candidate` sans comparaison roundtrip.
- Une carte image n'est pas une preuve géographique.

### 5. Ajouter feedback terrain

```yaml
situation_feedback:
  context:
  decision_supported:
  information_missing:
  source_failed:
  view_helpful:
  safety_impact:
  reusable_for_masterhelp:
```

## Critère de réussite

La Factory Roadtrip doit produire :

1. un voyage utile ;
2. un roadbook/export sûr ;
3. une extraction Dataviz exploitable ;
4. une extraction MasterHelp qui ne dépend pas du GPS ;
5. aucun faux signal de sécurité.

## Go opérationnel

Cette vague Git ne modifie pas le dossier Factory actif, car il vit hors repo et doit conserver la règle :

```txt
une seule version active
archive avant remplacement
ZIP actif identique au dossier actif
```

La prochaine action sûre est un arbitrage Codex. Une extraction mécanique peut ensuite être
déléguée à Big Pickle uniquement via `.opencode/INBOX.md`, ou un patch Factory dédié peut être
lancé avec archivage.
