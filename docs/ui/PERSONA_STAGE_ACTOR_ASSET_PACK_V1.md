# Persona Stage Actor Asset Pack V1

Statut : contrat de génération candidat
Owner : MALEX
Surface : Component Lab / futur onboarding / futur tunnel

Brief opérable associé : `docs/ui/PERSONA_STAGE_GENERATION_BRIEF_V1.md`

## Intention

Créer un pack d'assets de personnage d'interface pour le persona lead. Le personnage n'est pas un
avatar rond : c'est un acteur UI en plan américain/bassin, ancré en bas gauche ou bas droite.

Le comportement est commun à tous les personas. Le style, l'acting et les détails restent propres à
chaque persona.

## États V1

| État | Usage | Acting attendu |
|---|---|---|
| `neutral` | repos | disponible, calme |
| `listening` | micro / écoute | attentif au user |
| `thinking` | réflexion / génération | concentré, retenu |
| `positive` | validation | accord contrôlé |
| `negative` | refus doux | non clair, pas humiliant |
| `doubt` | incertitude | besoin de précision |
| `warning` | sensible / verrouillé | alerte sans agressivité |
| `explaining` | mode tunnel | prise de parole longue |

`success` et `troll` sont réservés à une V2.

## Exports attendus

Chaque persona doit produire un export gauche et droite pour chaque état :

```text
stage-actor/
  neutral-left.png
  neutral-right.png
  listening-left.png
  listening-right.png
  thinking-left.png
  thinking-right.png
  positive-left.png
  positive-right.png
  negative-left.png
  negative-right.png
  doubt-left.png
  doubt-right.png
  warning-left.png
  warning-right.png
  explaining-left.png
  explaining-right.png
```

Les variantes gauche/droite doivent être des assets validés. Le miroir CSS n'est acceptable que
comme placeholder dans le Lab.

## Contraintes visuelles

- Format transparent.
- Personnage cadré plan américain/bassin.
- Pieds non prioritaires, silhouette haute lisible.
- Zone de sécurité autour de la tête, des mains et accessoires.
- Même hauteur relative entre états.
- Même ancrage bas entre états.
- Pas de bulle intégrée dans l'image.
- Pas de décor intégré.
- Pas de texte dans l'image.

## Contraintes persona

MasterFlex :

- sec, graphiste, troll contrôlé ;
- posture compacte, lourde, pas mascotte cute ;
- acting lisible par yeux, casquette, épaules.

ProfKrapu :

- analytique, science-pulp, troll professoral ;
- posture professeur / démonstration ;
- jamais savant fou générique.

## Process de validation

1. Valider le composant Lab avec placeholders.
2. Lire le brief opérable et verrouiller la DA / le lore / les negative locks.
3. Générer d'abord le neutre d'un seul persona en candidat.
4. Valider gabarit, DA, costume, silhouette et ancrage.
5. Générer le persona complet en candidat.
6. Produire une planche contact : 8 états x 2 directions.
7. Vérifier cohérence de cadrage, alpha, posture et acting.
8. Corriger le pack complet si une dérive touche le gabarit.
9. Intégrer seulement après GO MALEX explicite.

## Interdits

- Remplacer les portraits ou canons actifs sans GO.
- Panacher plusieurs générations incohérentes.
- Utiliser une planche expression comme morphologie.
- Faire du photoréalisme.
- Changer le costume ou l'identité pour exprimer un état.
- Laisser un halo de fond ou un chroma mal nettoyé.
