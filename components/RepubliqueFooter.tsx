/**
 * Pied de page — crédit suite CORRECTORS.
 * Repris du pattern de footer des sous-apps (cf. Homepage.tsx) pour cohérence visuelle.
 */
export function RepubliqueFooter() {
  return (
    <footer className="border-t-4 border-primary bg-[#F6F6F6] px-6 py-6 dark:bg-[#1B1B35]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground">
          Suite <strong className="text-foreground">CORRECTORS</strong> · propulsée par vos API LLM
        </div>
      </div>
    </footer>
  );
}
