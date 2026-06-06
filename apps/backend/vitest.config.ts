import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    env: {MASTERFLOW_DB_PATH: ':memory:', NODE_ENV: 'test'},
    include: ['tests/**/*.test.ts'],
  },
});
