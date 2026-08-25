// Logs backend structures : une ligne JSON par evenement, exploitable par
// journalctl (les services tournent sous systemd user). info -> stdout,
// warn/error -> stderr.

type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, tag: string, msg: string, extra?: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, tag, msg, ...extra });
  const stream = level === 'info' ? process.stdout : process.stderr;
  stream.write(line + '\n');
}

// Une erreur passee telle quelle a JSON.stringify perd message et stack
// (proprietes non enumerables) : toujours la serialiser explicitement.
export function serializeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, ...(err.stack ? { stack: err.stack } : {}) };
  }
  return { message: String(err) };
}

export const log = {
  info: (tag: string, msg: string, extra?: Record<string, unknown>) => write('info', tag, msg, extra),
  warn: (tag: string, msg: string, extra?: Record<string, unknown>) => write('warn', tag, msg, extra),
  error: (tag: string, msg: string, extra?: Record<string, unknown>) => write('error', tag, msg, extra),
};
