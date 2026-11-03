import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "captures"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
]);
