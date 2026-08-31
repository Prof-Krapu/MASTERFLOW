import {spawnSync} from 'node:child_process';
import path from 'node:path';

const serverAlias = process.env.MASTERFLOW_SERVER_ALIAS ?? 'malex-graphics';
const serverRoot = process.env.MASTERFLOW_SERVER_ROOT
  ?? '/Users/alexcoulot/Playground/MASTERFLOW_SERVER';
const currentRelease = `${serverRoot}/releases/preview/current`;
const dockerCli = '/Applications/Docker.app/Contents/Resources/bin/docker';
const sshOptions = [
  '-o', 'BatchMode=yes',
  '-o', 'StrictHostKeyChecking=yes',
  '-o', 'ConnectTimeout=10',
];

if (!/^[A-Za-z0-9._-]+$/.test(serverAlias)) {
  throw new Error('server_preflight_failed: invalid_server_alias');
}
if (!/^\/[A-Za-z0-9._/-]+$/.test(serverRoot)) {
  throw new Error('server_preflight_failed: invalid_server_root');
}

function remote(command) {
  const result = spawnSync('ssh', [...sshOptions, serverAlias, command], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
    throw new Error(`server_preflight_failed: ${detail}`);
  }
  return result.stdout.trim();
}

const activeReleasePath = remote(`readlink ${currentRelease}`);
const health = JSON.parse(remote('curl -fsS http://127.0.0.1:8080/health'));
const containerLines = remote(
  `${dockerCli} ps --filter name=masterflow-preview --format '{{.Names}}|{{.Status}}'`,
).split('\n').filter(Boolean);
const containers = containerLines.map((line) => {
  const [name, ...statusParts] = line.split('|');
  return {name, status: statusParts.join('|')};
});

if (health.ok !== true) throw new Error('server_preflight_failed: health_not_ok');
if (containers.length !== 3) {
  throw new Error(`server_preflight_failed: expected_3_preview_containers_got_${containers.length}`);
}

console.log(JSON.stringify({
  authority: 'server_operable',
  server_alias: serverAlias,
  server_root: serverRoot,
  active_release_path: activeReleasePath,
  active_release_id: path.basename(activeReleasePath),
  health,
  containers,
  checked_at: new Date().toISOString(),
}, null, 2));
