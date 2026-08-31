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
    // dist/test-run: salida efímera de `npm test` (scripts/run-tests.mjs
    // la borra y recompila en cada ejecución), ya en .gitignore — nunca
    // código fuente real, no debe lintarse.
    "dist/**",
  ]),
]);

export default eslintConfig;
