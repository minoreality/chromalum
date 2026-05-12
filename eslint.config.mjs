import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["coverage/", "dist/", "node_modules/", "playwright-report/", "test-results/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["*.config.{js,mjs,ts}", "eslint.config.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
      },
    },
  },
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Relax rules that conflict with intentional canvas/audio ref patterns in this codebase
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  prettierConfig,
);
