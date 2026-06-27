import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    env: {MASTERFLOW_DB_PATH: ':memory:', NODE_ENV: 'test'},
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/db/seed.ts', 'src/db/schema.ts', 'src/lib/uuid.ts'],
    },
  },
});
