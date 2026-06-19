import {afterEach, describe, expect, it, vi} from 'vitest';

const names = ['NODE_ENV', 'JWT_SECRET', 'GODMODE_USERNAME', 'GODMODE_PASSWORD'] as const;
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

function restoreEnv(): void {
  for (const name of names) {
    const value = original[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

async function loadProductionEnv(): Promise<typeof import('../src/lib/env.ts')> {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'a'.repeat(32);
  process.env.GODMODE_USERNAME = 'owner';
  process.env.GODMODE_PASSWORD = 'a-strong-owner-password';
  vi.resetModules();
  return import('../src/lib/env.ts');
}

afterEach(() => {
  restoreEnv();
  vi.resetModules();
});

describe('production environment', () => {
  it('accepts concrete production secrets', async () => {
    const {env} = await loadProductionEnv();

    expect(env.isProd).toBe(true);
    expect(env.godmode.username).toBe('owner');
  });

  it('rejects a JWT placeholder or an undersized secret', async () => {
    await loadProductionEnv();
    process.env.JWT_SECRET = 'too-short';
    vi.resetModules();

    await expect(import('../src/lib/env.ts')).rejects.toThrow('JWT_SECRET requis en production');
  });

  it('rejects an owner password left as an example value', async () => {
    await loadProductionEnv();
    process.env.GODMODE_PASSWORD = 'REPLACE_WITH_A_STRONG_PRIVATE_PASSWORD';
    vi.resetModules();

    await expect(import('../src/lib/env.ts')).rejects.toThrow('GODMODE_PASSWORD requis en production');
  });
});
