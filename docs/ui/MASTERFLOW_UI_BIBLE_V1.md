# Bible UI MasterFlow V1

Statut : `canon_operatoire`
Version : `1.0.0`
Décision MALEX : GO du 2026-08-04
Registre machine-readable : `docs/masterbuild/MASTERBUILD_UI_CONFORMANCE.json`

## 1. Rôle de cette Bible

Cette Bible est le contrat obligatoire de toute page produit et de tout composant partagé public
de MasterFlow. Elle ne remplace ni les permissions runtime, ni les contrats backend. Elle empêche
qu'une nouvelle composition visuelle contredise le métier déjà validé, la charte ou les preuves
d'accessibilité.

Une surface modifiée ne peut passer du Lab au Prototype, puis au runtime, que si son entrée de
conformité est complète et que `npm run masterbuild:ui-gate -- --surface <id>` réussit.

## 2. Hiérarchie de vérité

En cas de contradiction, utiliser cet ordre :

1. canon actif représenté dans Git ;
2. décision explicite de MALEX ;
3. comportement publié, vérifié et validé ;
4. archive ou Factory, comme source candidate uniquement ;
5. référence externe, comme principe à traduire et non comme canon automatique.

Un prototype n'est pas un runtime. Un candidat n'est pas du canon. Une interface visible n'est
pas une preuve qu'une capacité existe. Une référence externe ne justifie ni nouvel asset, ni
dépendance, ni changement d'identité.

## 3. Promesse d'interface

MasterFlow montre d'abord une situation compréhensible et la prochaine action utile. Il ne montre
pas un catalogue d'outils, un dashboard géant ou l'état interne du système.

Chaque page répond dans les dix premières secondes à trois questions :

- où suis-je et dans quel contexte ;
- qu'est-ce qui est utile maintenant ;
- quelle est la prochaine action réelle que je peux effectuer.

La structure de référence est : contexte calme, bloc `Maintenant`, contenu métier, informations
secondaires, actions contextuelles, conversation. Une seule action est principale. Trois actions
guidées maximum sont visibles. La palette complète, ouverte volontairement, en expose cinq maximum
avant recherche ou approfondissement.

## 4. Identité et tokens

Les couleurs de marque de référence sont :

| Rôle | Valeur de référence | Usage |
|---|---:|---|
| Action MasterFlow | `#f15d32` | action principale, accent et focus adapté |
| Persona utilisateur | `#3979e8` | présence, contribution ou contexte utilisateur |
| Support / compagnon | `#8b62c9` | aide, accompagnement et support |

Ces valeurs sont des ancres, pas des couleurs à copier partout. Les variantes clair et sombre
doivent atteindre le contraste requis. Le vert est réservé au succès. Il n'est jamais l'accent
générique de marque.

Le code produit utilise des tokens sémantiques :

- `background`, `surface`, `surface-raised` ;
- `text`, `text-muted`, `border` ;
- `action`, `persona`, `support` ;
- `success`, `attention`, `danger`, `focus`.

Aucune couleur ne peut être codée en dur hors de la définition de palette ou d'une exception
documentée dans le registre de conformité. Clair, sombre et préférence système doivent former
trois scénarios vérifiés, pas trois feuilles de style concurrentes.

## 5. Anatomie obligatoire d'une surface

Toute page produit déclare :

- `surface_id`, rôle et room ;
- Jobs-to-be-Done ;
- valeur visible en moins de dix secondes ;
- action principale et choix secondaires ;
- source réelle des données ;
- permissions et preflight ;
- états supportés ;
- composants partagés utilisés ;
- scénarios Lab et Prototype ;
- variantes desktop, 390 px, clair, sombre et système ;
- risques de surcharge ou de manipulation ;
- preuves MALEX et, pour contrats/permissions, Vincent.

Un composant partagé public déclare au minimum `component_id`, responsabilité, règles applicables,
états, clavier, thèmes, responsive et scénarios Lab. Un détail interne non réutilisable reste couvert
par l'identifiant de sa surface parente.

## 6. États obligatoires

Les pages actives distinguent sans ambiguïté :

1. `loading` — attente réelle et libellée ;
2. `empty` — aucune donnée, avec prochaine action si elle existe ;
3. `partial` — données incomplètes, limites explicites ;
4. `ready` — situation utilisable ;
5. `error` — problème humainement formulé et récupération possible ;
6. `forbidden` — permission absente, sans fuite de donnée ;
7. `read_only` — visible mais non modifiable ;
8. `future` — annoncé sans action fictive ;
9. `session_expired` — reconnexion et reprise possibles.

`canon`, `candidate`, `future` et `unavailable` utilisent du texte, une forme ou une icône en plus
de la couleur. Une enum technique, un identifiant brut ou un statut comme `connected` n'est jamais
présenté à l'utilisateur. L'état sain reste silencieux. Une dégradation utile peut dire :
`Connexion au chat…` ou `Chat indisponible — Réessayer`, avec une zone `aria-live` adaptée.

## 7. Actions, permissions et honnêteté

- Une action visible correspond à une capacité et une permission réelles.
- Une action indisponible est masquée ou explicitement désactivée avec une raison utile.
- Une suggestion n'exécute jamais une action sensible.
- Permission, preflight, Validation Inbox, exécution et Task Monitor restent distincts.
- Micro et transcription restent explicitement indisponibles tant qu'ils ne sont pas raccordés.
- Aucun jalon, pourcentage, deadline ou progression n'est inventé faute de source runtime.

## 8. Clavier, focus et mouvement

Toutes les fonctions sont utilisables au clavier avec un focus visible et jamais masqué par un Dock,
un overlay ou une zone fixe.

Contrat du Dock :

- `K` ouvre ou ferme le clavier hors saisie texte ;
- `Enter` envoie ;
- `Shift+Enter` ajoute une ligne ;
- le clavier reste ouvert après envoi ;
- `Esc` ferme d'abord l'élément le plus local, puis remonte la pile d'overlays ;
- aucune action essentielle n'existe uniquement via raccourci.

Toute entrée et sortie d'overlay conserve la continuité spatiale. `prefers-reduced-motion` retire les
transitions non nécessaires et ne bloque jamais la compréhension.

## 9. Responsive

Desktop est puissant mais hiérarchisé. Les trois actions guidées vivent dans le rail droit et ne sont
pas dupliquées dans le Dock.

À 390 px, MasterFlow devient conversationnel : une colonne, contenu avant détails, feuilles plein
écran pour navigation et actions, trois actions maximum, aucun rail intérieur concurrent et aucun
scroll horizontal. Les zones fixes ménagent le contenu, le clavier logiciel et le focus.

Les cibles principales mesurent au moins 44 × 44 px. Les autres respectent au minimum le critère
WCAG 2.2 de 24 × 24 px ou l'espacement équivalent. La page doit rester utilisable en reflow et zoom.

## 10. Formulaires et erreurs

Chaque champ possède un libellé persistant. Une erreur est associée au champ, formulée en langage
humain et reprise dans un résumé focalisable lorsque plusieurs erreurs existent. Le résumé pointe
vers les champs concernés. Les placeholder et tooltip ne remplacent jamais un libellé.

## 11. Comportement éthique

MasterFlow utilise les Jobs-to-be-Done, la valeur rapide, la réduction du choix, le feedback clair
et la progression réelle. Il refuse : urgence artificielle, fausse rareté, faux chargement, streak
de rétention, récompense aléatoire, verrou arbitraire et notification destinée seulement à ramener
l'utilisateur.

Toute gamification doit améliorer compréhension, maîtrise ou progression prouvée. La valeur est
montrée avant toute demande d'information lourde.

## 12. Pages métier déjà validées

Home, Project, Teaching et Learn conservent leur métier et leurs permissions publiés. Leur validation
historique ne vaut pas conformité visuelle automatique à cette Bible : elles passent à
`audit_required` jusqu'à nouvelle preuve thèmes, clavier, états, responsive et composition.

Inventory et les quatre modifications locales en cours sont exclus du chantier de fondations. Ils
restent candidats séparés et ne sont ni déplacés, ni supprimés, ni absorbés par ce Round.

## 13. Direction Project V2

Project sera un hub de contexte vivant : contexte calme, bloc `Maintenant`, éventuel checkpoint
`À reprendre`, ressources validées, synthèse d'équipe et trois actions contextuelles. Il ne devient
pas un faux gestionnaire de tâches. Tâches, jalons, livrables, échéances et pourcentages restent des
gaps tant qu'une source runtime fiable ne les fournit.

Cette direction ne passe au runtime qu'après :

`Project Lab → Prototype assemblé → validation MALEX → smoke permissions Vincent → runtime`.

## 14. Gate de promotion

Le registre machine-readable porte la preuve. Une promotion échoue si :

- la surface ou le composant n'a pas d'identifiant ;
- une règle référencée est inconnue ;
- un état requis manque ;
- aucun scénario Lab n'est déclaré ;
- une preuve obligatoire est absente ;
- une raison de blocage subsiste ;
- la validation MALEX manque ;
- la validation Vincent manque quand contrats ou permissions sont concernés.

Un retour humain crée un `candidate_finding` lié à une surface, un composant et des règles. Il ne
modifie jamais automatiquement la Bible, le code, les permissions ou le canon.

## 15. Références externes traduites

| Source | Adopté | Adapté | Refusé |
|---|---|---|---|
| [MUI theming](https://mui.com/material-ui/customization/theming/) | tokens, thème cohérent, personnalisation | implémentation dans les composants MasterFlow | adoption de MUI ou apparence Google |
| [Atlassian Foundations](https://atlassian.design/foundations) | fondations partagées et tokens sémantiques | vocabulaire MasterFlow | système parallèle au canon |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | contraste, reflow, focus non masqué, cibles | cibles principales renforcées à 44 px | conformité déclarative sans preuve |
| [WAI Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) | ordre de focus et interactions prévisibles | pile `Esc` MasterFlow | raccourci comme seul accès |
| [WAI Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages) | messages utiles annoncés sans voler le focus | silence des états sains | bruit technique permanent |
| [Growth.Design JTBD](https://growth.design/case-studies/headspace-user-onboarding) | valeur rapide et intention utilisateur | activation MasterFlow par action utile | rétention forcée |
| [Growth.Design feedback](https://growth.design/case-studies/been-onboarding) | feedback et progression honnêtes | progression uniquement sourcée | gamification casino |
| [GOV.UK Error Summary](https://design-system.service.gov.uk/components/error-summary/) | résumé et liens vers les champs | style visuel MasterFlow | erreur globale sans champ associé |

Ces références sont des `reference_external`. Elles n'apportent aucun asset et ne deviennent jamais
du canon sans traduction explicite dans une règle `DES-*`.
