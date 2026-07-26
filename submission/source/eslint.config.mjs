import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    "dist/**",
    "submission/**",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
