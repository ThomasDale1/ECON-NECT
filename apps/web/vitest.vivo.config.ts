// Config de las pruebas EN VIVO (S-A7 Paso 7): solo `*.vivo.test.ts`, nunca
// dentro de `npm run test` — dependen del sandbox real y del solver local
// levantado (`uv run uvicorn app.main:app --port 8000` en services/solver/).

import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './lib/conectores/server-only.pruebas.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.vivo.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
