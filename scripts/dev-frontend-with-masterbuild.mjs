import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forwardedArgs = process.argv.slice(2);
const children = [];
let stopping = false;

async function masterbuildIsReady() {
  try {
    const response = await fetch('http://127.0.0.1:8010/health', {signal: AbortSignal.timeout(600)});
    if (!response.ok) return false;
    const body = await response.json();
    return body?.ok === true && body?.service === 'masterbuild';
  } catch {
    return false;
  }
}

function start(command, args, cwd = repoRoot) {
  const child = spawn(command, args, {cwd, stdio: 'inherit'});
  children.push(child);
  child.on('exit', (code) => {
    if (stopping || code === 0) return;
    stop('SIGTERM');
    process.exitCode = code ?? 1;
  });
  return child;
}

function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

if (await masterbuildIsReady()) {
  console.log('MASTERBUILD · service 8010 déjà disponible, réutilisation.');
} else {
  console.log('MASTERBUILD · démarrage automatique du service embarqué sur 8010.');
  start(process.execPath, ['apps/masterbuild/service/server.mjs']);
}

start('npm', ['run', 'dev', '--workspace', '@masterflow/frontend', '--', ...forwardedArgs]);

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
