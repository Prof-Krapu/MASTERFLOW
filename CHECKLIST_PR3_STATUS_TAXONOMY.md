# CHECKLIST — PR-3 Status Taxonomy

Statut : `IMPLEMENTATION CHECKLIST / 2026-06-13`

## Scope autorise

- enums partages ;
- mapping canon/runtime/UI ;
- helpers de validation ;
- tests de mapping ;
- compat legacy.

## Enums attendus

### Canon

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

### Runtime

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

### UI

```text
hidden
locked
visible_readonly
visible_actionable
admin_only
```

## Helpers attendus

```text
deriveUiStatus(capability, user)
assertLiveCapabilityHasEvidence(capability)
normalizeLegacyCanonStatus(status)
```

## Mapping legacy

Les anciens statuts du Drive ou des seeds ne doivent pas casser le runtime. Ils doivent etre
normalises ou marques `blocked`/`canon_spec` par defaut prudent.

## Tests obligatoires

- statut inconnu -> fallback prudent ;
- `live` sans evidence refuse ;
- `out_of_scope` -> hidden ;
- `blocked` -> admin_only ou hidden ;
- `shell` -> locked/readonly ;
- helper stable pour student/admin/godmode.

## Definition de done

```text
schemas shared
helpers testes
compat legacy
aucune activation involontaire
SUIVI mis a jour
```

