/**
 * En-tête sobre pour les pages non connectées (login, register) — titre CORRECTORS.
 * Le header de la Landing reste inline car il porte aussi les actions admin/déconnexion.
 */
export function BrandHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
        <div className="text-xl font-bold tracking-tight text-foreground">CORRECTORS</div>
        <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          beta
        </span>
      </div>
    </header>
  );
}
