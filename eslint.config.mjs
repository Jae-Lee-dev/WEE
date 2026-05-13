// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import boundaries from "eslint-plugin-boundaries";
import storybook from "eslint-plugin-storybook";

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
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "storybook-static/**",
  ]),
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "app-adapter", pattern: "app/**" },
        { type: "pages", pattern: "src/pages/*/**", capture: ["slice"] },
        { type: "widgets", pattern: "src/widgets/*/**", capture: ["slice"] },
        { type: "features", pattern: "src/features/*/**", capture: ["slice"] },
        { type: "entities", pattern: "src/entities/*/**", capture: ["slice"] },
        { type: "shared", pattern: "src/shared/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: { type: "shared" },
              disallow: {
                to: {
                  type: [
                    "entities",
                    "features",
                    "widgets",
                    "pages",
                    "app",
                    "app-adapter",
                  ],
                },
              },
            },
            {
              from: { type: "entities" },
              disallow: {
                to: { type: ["features", "widgets", "pages", "app", "app-adapter"] },
              },
            },
            {
              from: { type: "features" },
              disallow: { to: { type: ["widgets", "pages", "app", "app-adapter"] } },
            },
            {
              from: { type: "widgets" },
              disallow: { to: { type: ["pages", "app", "app-adapter"] } },
            },
            {
              from: { type: "pages" },
              disallow: { to: { type: ["app", "app-adapter"] } },
            },
          ],
        },
      ],
    },
  },
  ...storybook.configs["flat/recommended"],
]);

export default eslintConfig;
