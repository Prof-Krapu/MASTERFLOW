# Receipt — runtime local isolé

SHA testé : `2432e87598d8e381d2d991425a1d51a798dc79e7`.

Configuration : SQLite temporaire dans `/private/tmp`, provider `mock`, secrets éphémères,
backend `127.0.0.1:8000`, frontend `127.0.0.1:5174`.

Résultats `smoke:public` :

- backend health `200` ;
- frontend `200` ;
- login godmode `200` ;
- contexte Home Room `200` ;
- personas `200` ;
- ressources `200` ;
- WebSocket ping/pong OK.

Les processus ont été arrêtés après la recette. Ceci prouve le runtime local en mode mock, pas le
package Docker ni le live historique. Aucun provider, serveur externe ou base existante n'a été touché.
