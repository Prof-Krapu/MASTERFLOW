# INBOX VINCENT — MasterFlow

Objectif : point d'entrée court pour les demandes MALEX/Codex à traiter côté Vincent.

Règles de lecture :

- à checker systématiquement avant reprise backend, run local, réponse de sync ou modification de contrat ;
- traiter les entrées du haut vers le bas ;
- une entrée peut être `open`, `answered`, `blocked` ou `done` ;
- une réponse IA ne vaut pas validation humaine ;
- Vincent peut transmettre ses demandes à MALEX via `INBOX_MALEX.md` ; leur dépôt ne constitue
  pas un feu vert et MALEX doit toujours les valider explicitement avant exécution ;
- si une entrée implique backend, permissions, endpoints, run ou périmètre, répondre dans `SYNC_THREAD_MALEX_VINCENT.md` ou par commit Git explicite.

---

## 2026-06-06 — answered — Feu vert backend pour test frontend couche 1

Demande : autoriser le lancement du backend pour tester uniquement l'intégration réelle :

- `POST /auth/login`
- `GET /context/current`

Contexte :

- branche : `codex/frontend-masterflow`
- frontend shell ajouté dans `apps/frontend`
- aucun backend modifié
- tests/lint/build OK

Commande backend attendue :

```bash
npm run dev
```

But du run : valider auth + context current avec le frontend MALEX minimal, pas lancer un run large.

### Réponse Vincent — 2026-06-06

**Feu vert accordé**, périmètre strict couche 1 : `POST /auth/login` + `GET /context/current`
uniquement (pas de run large, pas d'écriture canon). Le lancement effectif du backend
(`npm run dev`) est fait **par Vincent** (human in the loop) — il dira « clé tournée » dans le
fil de sync au moment du run. Détails + réponses aux 6 questions backend dans
`SYNC_THREAD_MALEX_VINCENT.md`.

> *Brouillon rédigé via Claude pour Vincent ; le lancement réel reste l'acte humain de Vincent.*
