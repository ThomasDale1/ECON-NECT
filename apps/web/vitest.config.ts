import path from 'node:path'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // `server-only` lanza un error a propósito fuera del bundler de Next.js
      // (protege que un componente de cliente jale una credencial). Vitest no
      // pasa por ese bundler, así que se sustituye por un stub vacío solo
      // para pruebas (lib/conectores/server-only.pruebas.ts).
      'server-only': path.resolve(__dirname, './lib/conectores/server-only.pruebas.ts'),
    },
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
    // Las pruebas en vivo (S-A7 Paso 7) corren contra el sandbox y el solver
    // local — nunca en `npm run test`, para que las ventanas de merge
    // (AGENTS.md §4.4) no dependan de que ambos estén arriba.
    exclude: [...configDefaults.exclude, '**/*.vivo.test.ts'],
  },
})
