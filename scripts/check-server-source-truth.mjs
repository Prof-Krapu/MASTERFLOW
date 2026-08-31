import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const configPath = process.env.MASTERFLOW_SERVER_CONFIG
  ?? path.resolve('.masterflow-server.local.json');
let localConfig = {};
try {
  localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw new Error(`server_preflight_failed: invalid_local_config ${configPath}`);
  }
}

const serverAlias = process.env.MASTERFLOW_SERVER_ALIAS ?? localConfig.serverAlias;
const serverRoot = process.env.MASTERFLOW_SERVER_ROOT ?? localConfig.serverRoot;
const dockerCli = process.env.MASTERFLOW_SERVER_DOCKER_CLI ?? localConfig.dockerCli;
if (!serverAlias || !serverRoot || !dockerCli) {
  throw new Error(
    'server_preflight_failed: configure .masterflow-server.local.json from .masterflow-server.example.json',
  );
}
const currentRelease = `${serverRoot}/releases/preview/current`;
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
if (!/^\/[A-Za-z0-9 ._/-]+$/.test(dockerCli)) {
  throw new Error('server_preflight_failed: invalid_docker_cli');
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
