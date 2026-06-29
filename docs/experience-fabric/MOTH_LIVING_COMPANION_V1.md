# Experience Fabric — MOTH Living Companion V1

Statut : V1 locale, compagnon contextuel assigné.

## Intention

Réutiliser le contrat `LivingCompanion` pour MOTH sans créer un bot parallèle.

MOTH est un garde-fou CDC :

- il questionne les raccourcis et les zones floues ;
- il oriente le groupe vers la prochaine question déclarée ;
- il signale contradictions et besoins d'arbitrage ;
- il ne tranche pas et ne produit pas le travail à la place du groupe.

## Activation

MOTH n'est jamais détecté ou injecté implicitement.

Le créateur d'un guide CDC doit déclarer :

```json
{
  "ui_manifest": {
    "companion_type": "moth",
    "companion_name": "MOTH"
  }
}
```

Sa présence reste limitée à la session, au projet ou à la room réellement associés au Guided
Runtime. L'assignation n'accorde aucun droit.

## Comportement

- présence : `assigned_context_only` ;
- interaction : `full_page_guided` ;
- exécution : `guide_only` ;
- identité initiale validée par le créateur ;
- évolution future gérée par le moteur après validation, pas par les utilisateurs.

## Hors périmètre

- aucune apparition globale ;
- aucune substitution au persona personnel ;
- aucune génération ou évolution visuelle ;
- aucun provider, export, publication ou écriture canon ;
- aucun dialogue LLM autonome dans cette tranche.
