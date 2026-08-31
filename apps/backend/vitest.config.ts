import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    env: {MASTERFLOW_DB_PATH: ':memory:', NODE_ENV: 'test'},
    include: ['tests/**/*.test.ts'],
    // Les suites partagent volontairement le singleton SQLite en mémoire du backend.
    // Leur initialisation seedée doit donc rester séquentielle dans un même worker.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/db/seed.ts', 'src/db/schema.ts', 'src/lib/uuid.ts'],
    },
  },
});
