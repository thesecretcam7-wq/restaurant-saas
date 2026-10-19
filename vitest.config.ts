import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    globals: true,
    include: ['lib/**/*.test.ts', 'lib/**/*.spec.ts'],
  },
})
