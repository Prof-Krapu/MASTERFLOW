/**
 * Configuration runtime du TUI, surchargée par variables d'environnement.
 * `MASTERFLOW_TUI_API` (défaut http://localhost:8000/api/v1) et `MASTERFLOW_TUI_WS`
 * (déduit de l'API si absent). Aucun secret ici : le JWT vit en mémoire de session.
 */
export interface TuiConfig {
  apiBase: string;
  wsBase: string;
  defaultUsername: string;
}

export function loadConfig(): TuiConfig {
  const apiBase = process.env.MASTERFLOW_TUI_API ?? 'http://localhost:8000/api/v1';
  const wsBase = process.env.MASTERFLOW_TUI_WS ?? deriveWsBase(apiBase);
  const defaultUsername = process.env.MASTERFLOW_TUI_USER ?? 'vincent';
  return {apiBase, wsBase, defaultUsername};
}

/** Déduit l'origine WS (ws/wss + host) depuis l'URL de base de l'API. */
function deriveWsBase(apiBase: string): string {
  try {
    const url = new URL(apiBase);
    const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${url.host}`;
  } catch {
    return 'ws://localhost:8000';
  }
}
