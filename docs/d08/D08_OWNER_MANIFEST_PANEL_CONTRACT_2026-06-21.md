# D08 R3.2 — Surface owner de manifest visuel

## Intention

Donner au owner une surface utilisable pour préparer une référence puis un manifest D08 privé, et
voir pourquoi l'exécution reste interdite.

## Ce qui change

- panneau owner pour créer des références privées déclarées ;
- préparation d'un manifest visuel privé avec références sélectionnées ;
- affichage de l'état et des blocages Action Ready ;
- aucun bouton, action ou appel de génération.

## Invariants

- la référence reste privée et sa provenance est affichée dans le runtime ;
- le manifest ne peut pas être pris pour un asset ni pour une autorisation provider ;
- les blocages D08 sont visibles : storage, lifecycle, review et provider restent absents.

## Succès

Le owner peut créer un cadrage structuré sans avoir l'impression qu'une image a été générée ou
autorisée. Le seul résultat possible est un manifest privé bloqué.
