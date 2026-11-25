import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Formatting is Prettier's job (`bun run format`); turn off rules that would fight it.
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  globalIgnores([".next/**", ".open-next/**", ".wrangler/**", "out/**", "build/**", "dist/**", "next-env.d.ts"]),
]);
