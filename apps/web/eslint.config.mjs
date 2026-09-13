import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sondas de investigación contra el sandbox: se escriben para verificar un
    // supuesto contra la API y se borran. No son código de producto y no deben
    // poder romper el gate de lint que bloquea los merges (AGENTS.md §4.4).
    "scripts/_*.ts",
  ]),
]);

export default eslintConfig;
