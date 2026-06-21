# Marathon — ordre d'exécution continu

Chaque vague : trace legacy/canon -> audit ciblé -> décision explicite -> canon/ledger -> tests si runtime -> commit -> push -> PR -> merge -> receipt.

Le gate `LEGACY_TO_RUNTIME_TRACE_GATE.md` est obligatoire avant chaque nouvelle vague produit.

1. Contrats D05/D06/D07 : sujets, assignments, correction, inventory, OCR.
2. Contrats D08 : références, DA, assets, review, manifests.
3. Contrats D09/D10 : récit, devis, public/event, export.
4. Contrats D11/D12 : factories, backflow, observabilité, continuité, recovery.
5. Engines : dédoublonnage par owner et décision de parité Git.
6. Datasets : source de vérité, permission, append-only, import candidat.
7. Personas et événements : scope, consentement, surfaces, aucune activation automatique.
8. Déploiement/audits historiques : déduplication, preuve live, backup/rollback gates.
9. Factories : passport par factory, owner, sources, capacités, backflow seulement.
10. Runtime : reprendre uniquement les tranches débloquées par les vagues 1 à 9.

Règle : une entrée non arbitrée reste `pending_semantic_review`; le marathon ne la promeut jamais par simple ancienneté.
