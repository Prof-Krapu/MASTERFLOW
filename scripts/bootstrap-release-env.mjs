#!/usr/bin/env node

import {randomBytes} from 'node:crypto';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function secret(bytes = 24) {
  return randomBytes(bytes).toString('base64url');
}

const channel = argument('--channel', 'preview');
if (!['preview', 'stable'].includes(channel)) throw new Error(`Canal invalide : ${channel}`);

const releaseSha = argument('--release-sha');
if (!releaseSha || !/^[a-f0-9]{40}$/.test(releaseSha)) {
  throw new Error('--release-sha doit contenir le SHA Git complet à 40 caractères.');
}

const outputPath = resolve(argument('--output', 'deploy/.env'));
const credentialsPath = resolve(argument('--credentials-out', `deploy/${channel}-bootstrap-credentials.txt`));
if (existsSync(outputPath) || existsSync(credentialsPath)) {
  throw new Error('Bootstrap refusé : un fichier cible existe déjà.');
}

const seedProfile = channel === 'stable' ? 'production' : 'preview';
const godmodePassword = secret();
const malexPassword = secret();
const envFile = `# Généré localement sur l'hôte de release. Ne jamais committer.\nMASTERFLOW_BIND=127.0.0.1\nMASTERFLOW_HTTP_PORT=8080\nMASTERFLOW_RELEASE_CHANNEL=${channel}\nMASTERFLOW_SEED_PROFILE=${seedProfile}\nMASTERFLOW_RELEASE_SHA=${releaseSha}\nJWT_SECRET=${secret(32)}\nJWT_EXPIRES_IN=30d\nGODMODE_USERNAME=vincent\nGODMODE_PASSWORD=${godmodePassword}\nMALEX_USERNAME=malex\nMALEX_PASSWORD=${malexPassword}\nLLM_PROVIDER=mock\nLLM_API_KEY=\nLLM_BASE_URL=\nLLM_MODEL=\nLLM_EGRESS_ALLOWLIST=\n`;
const credentials = `MasterFlow ${channel}\nRelease: ${releaseSha}\n\nCompte Vincent\nIdentifiant: vincent\nMot de passe: ${godmodePassword}\n\nCompte MALEX\nIdentifiant: malex\nMot de passe: ${malexPassword}\n`;

mkdirSync(dirname(outputPath), {recursive: true});
mkdirSync(dirname(credentialsPath), {recursive: true});
writeFileSync(outputPath, envFile, {mode: 0o600, flag: 'wx'});
writeFileSync(credentialsPath, credentials, {mode: 0o600, flag: 'wx'});
console.log(JSON.stringify({channel, env_path: outputPath, credentials_path: credentialsPath}));
