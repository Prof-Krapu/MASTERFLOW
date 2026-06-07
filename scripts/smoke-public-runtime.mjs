#!/usr/bin/env node

const backendBase = process.env.MASTERFLOW_BACKEND_BASE ?? 'https://profkrapu-ms-7971.tail8d8b1f.ts.net:8443';
const stackBase = process.env.MASTERFLOW_STACK_BASE ?? 'https://profkrapu-ms-7971.tail8d8b1f.ts.net:10000';
const username = process.env.MASTERFLOW_USERNAME;
const password = process.env.MASTERFLOW_PASSWORD;

const results = [];

function record(name, ok, detail = '') {
  results.push({name, ok, detail});
  const status = ok ? 'OK' : 'FAIL';
  console.log(`${status} ${name}${detail ? ` - ${detail}` : ''}`);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`invalid_json status=${response.status}`);
  }
}

async function checkHealth() {
  const response = await fetch(`${backendBase}/health`);
  const json = await readJson(response);
  record('backend health', response.ok && json.ok === true, `status=${response.status}`);
}

async function checkFrontend() {
  const response = await fetch(`${stackBase}/`, {method: 'HEAD'});
  record('frontend stack', response.ok, `status=${response.status}`);
}

async function login() {
  if (!username || !password) {
    record('auth login', true, 'skipped: env MASTERFLOW_USERNAME/PASSWORD missing');
    return null;
  }

  const response = await fetch(`${stackBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username, password}),
  });
  const json = await readJson(response);
  const token = typeof json.token === 'string' ? json.token : '';
  const role = json.user?.role ?? 'unknown';
  record('auth login', response.ok && token.length > 0, `status=${response.status} role=${role}`);
  return token || null;
}

async function authedJson(path, token) {
  const response = await fetch(`${stackBase}${path}`, {
    headers: {Authorization: `Bearer ${token}`},
  });
  return {response, json: await readJson(response)};
}

async function checkAuthedRest(token) {
  if (!token) return null;

  const context = await authedJson('/api/v1/context/current', token);
  const roomInstanceId = context.json.room_instance?.id ?? '';
  record(
    'context current',
    context.response.ok && roomInstanceId.length > 0,
    `status=${context.response.status} room=${context.json.room?.name ?? 'unknown'}`,
  );

  const personas = await authedJson('/api/v1/personas', token);
  record(
    'personas',
    personas.response.ok && Array.isArray(personas.json),
    `status=${personas.response.status} count=${Array.isArray(personas.json) ? personas.json.length : -1}`,
  );

  const resources = await authedJson('/api/v1/resources', token);
  record(
    'resources',
    resources.response.ok && Array.isArray(resources.json.results),
    `status=${resources.response.status} count=${Array.isArray(resources.json.results) ? resources.json.results.length : -1}`,
  );

  return roomInstanceId || null;
}

async function checkWs(token, roomInstanceId) {
  if (!token || !roomInstanceId) return;
  if (typeof WebSocket === 'undefined') {
    record('websocket ping', false, 'global WebSocket unavailable in this Node runtime');
    return;
  }

  const url = `${stackBase.replace(/^http/, 'ws')}/ws/${encodeURIComponent(roomInstanceId)}?token=${encodeURIComponent(token)}`;
  await new Promise((resolve) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      record('websocket ping', false, 'timeout');
      try {
        ws.close();
      } catch {
        // no-op
      }
      resolve();
    }, 10000);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({type: 'ping'}));
    });
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        clearTimeout(timer);
        record('websocket ping', true, 'pong');
        ws.close();
        resolve();
      }
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      record('websocket ping', false, 'socket error');
      resolve();
    });
  });
}

async function main() {
  try {
    await checkHealth();
    await checkFrontend();
    const token = await login();
    const roomInstanceId = await checkAuthedRest(token);
    await checkWs(token, roomInstanceId);
  } catch (error) {
    record('smoke runtime', false, error instanceof Error ? error.message : String(error));
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

await main();
