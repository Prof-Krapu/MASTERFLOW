# SPEC — Taxonomie statuts canon/runtime

Statut : `FOUNDATION SPEC / 2026-06-13`

## Objectif

Normaliser les statuts entre Drive canon, Git runtime, UI et audits.

## Statuts canon

```text
idea
canon_spec
contract_ready
implementation_ready
validated_canon
deprecated
out_of_scope
blocked
```

## Statuts runtime

```text
absent
shell
partial
live
disabled
deprecated
out_of_scope
blocked
```

## Statuts UI

```text
hidden
locked
visible_readonly
visible_actionable
admin_only
```

## Mapping obligatoire

```text
canon_spec + absent -> documente seulement
contract_ready + shell -> preparable
implementation_ready + partial -> test pilote
validated_canon + live -> disponible
out_of_scope -> masque
blocked -> visible admin/godmode seulement si utile
```

## Regle critique

Un statut canonique ne prouve jamais une implementation. Une implementation Git doit citer :

- schema ;
- endpoint/event ;
- permission ;
- test ;
- recette.

