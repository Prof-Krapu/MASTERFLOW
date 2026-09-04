import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearStoredRuntimeAuthToken,
  readRuntimeAuthPersistence,
  readRuntimeAuthToken,
  runtimeAuthStorageKey,
  storeRuntimeAuthToken,
} from '../src/runtime-auth-storage.ts';

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function installWindow() {
  const localStorage = fakeStorage();
  const sessionStorage = fakeStorage();
  globalThis.window = {localStorage, sessionStorage};
  return {localStorage, sessionStorage};
}

test('une session standard reste limitée à la session navigateur', () => {
  const {localStorage, sessionStorage} = installWindow();
  storeRuntimeAuthToken('session-token');

  assert.equal(sessionStorage.getItem(runtimeAuthStorageKey), 'session-token');
  assert.equal(localStorage.getItem(runtimeAuthStorageKey), null);
  assert.equal(readRuntimeAuthToken(), 'session-token');
  assert.equal(readRuntimeAuthPersistence(), 'session');
});

test('se souvenir de moi conserve le jeton dans le stockage persistant', () => {
  const {localStorage, sessionStorage} = installWindow();
  storeRuntimeAuthToken('persistent-token', 'persistent');

  assert.equal(localStorage.getItem(runtimeAuthStorageKey), 'persistent-token');
  assert.equal(sessionStorage.getItem(runtimeAuthStorageKey), null);
  assert.equal(readRuntimeAuthToken(), 'persistent-token');
  assert.equal(readRuntimeAuthPersistence(), 'persistent');
});

test('la déconnexion efface les deux formes de session', () => {
  const {localStorage, sessionStorage} = installWindow();
  localStorage.setItem(runtimeAuthStorageKey, 'old-persistent-token');
  sessionStorage.setItem(runtimeAuthStorageKey, 'old-session-token');

  clearStoredRuntimeAuthToken();

  assert.equal(localStorage.getItem(runtimeAuthStorageKey), null);
  assert.equal(sessionStorage.getItem(runtimeAuthStorageKey), null);
  assert.equal(readRuntimeAuthToken(), null);
  assert.equal(readRuntimeAuthPersistence(), null);
});
