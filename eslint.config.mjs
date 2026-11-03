import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The plugin's recommended set as errors; eslint-config-next turns on only
    // six of its rules, as warnings.
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Safari drops list semantics under `list-style: none`, so the site
      // restores them on purpose with role="list" / role="listitem".
      "jsx-a11y/no-redundant-roles": [
        "error",
        { nav: ["navigation"], ul: ["list"], ol: ["list"], li: ["listitem"] },
      ],
      // eMAG 3.1 asks for access keys 1–4 on the skip bar.
      "jsx-a11y/no-access-key": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The glossary animations: vanilla canvas code kept as the package wrote it.
    "lib/cenas/fonte/**",
    "lib/cenas/gerado/**",
  ]),
]);

export default eslintConfig;
