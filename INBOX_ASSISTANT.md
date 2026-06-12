# INBOX_ASSISTANT — MasterFlow

Objectif : file de tâches **de code basiques** confiées par **Claude Code** / **Vincent** aux agents
assistants (GPT, DeepSeek… via opencode), pour soulager Claude quand il n'a plus de tokens.

Règles de lecture (mêmes principes que `INBOX_VINCENT.md` / `INBOX_MALEX.md`) :

- **lire `assistant.md` ET `CLAUDE.md` avant de prendre une tâche** ;
- traiter les entrées du haut vers le bas ;
- statuts : `open` (libre) · `claimed` (en cours, mets ton nom + branche) · `done` (fait, **attend relecture/merge**) · `blocked` (hors périmètre ou bloqué, explique) ;
- **une réponse IA ne vaut pas validation humaine** : `done` ≠ validé. Claude Code ou Vincent relisent et mergent la branche ;
- l'agent travaille sur une branche `assistant/*`, lance `npm test` + `npm run lint`, et **ne pousse jamais sur `main`** ;
- toute tâche qui dérive vers backend sensible, permissions, engines, endpoints, secrets ou périmètre → `blocked`, on laisse à Claude.

---

## Modèle de tâche (à copier par Claude/Vincent)

```markdown
## TASK-XXX — <titre court>
- statut : open
- de : <claude-code | vincent>
- créé : <AAAA-MM-JJ>
- priorité : <basse | normale | haute>
- fichiers : <chemins concernés>
- contexte : <ce qu'il faut savoir / quel invariant>
- tâche : <description précise et bornée>
- critères d'acceptation : <comment savoir que c'est bien fait>
- NE PAS : <garde-fous explicites — ex. ne pas toucher engines/auth/seeds>

### Réponse
> (vide — à remplir par l'agent assistant, voir assistant.md §5)
```

---

## TASK-000 — (EXEMPLE, ne pas traiter)

- statut : exemple
- de : claude-code
- créé : 2026-06-12
- priorité : basse
- fichiers : —
- contexte : illustre une tâche complète avec sa réponse signée.
- tâche : exemple illustratif uniquement.
- NE PAS : la traiter (c'est une démo).

### Réponse — deepseek-v3 via opencode — 2026-06-12
- statut → done
- branche : assistant/task-000-demo
- ce que j'ai fait : rien (tâche d'exemple), juste illustrer le format.
- fichiers modifiés : aucun
- checks : `npm run lint` → ok ; `npm test` → 13/13 vert
- doutes / limites : aucun
- à valider/merger par Claude/Vincent : non
— signé : deepseek-v3 via opencode

---

<!-- ↓ Nouvelles tâches 'open' à ajouter sous cette ligne ↓ -->


<!-- ─────────────── ARCHIVE (tâches relues/mergées par Claude ou Vincent) ─────────────── -->
