import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import { mergeConfig, type UserConfig } from "vite";

const storybookDir = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  viteFinal: async (config) =>
    mergeConfig(
      config,
      {
        resolve: {
          alias: {
            "@/app": resolve(storybookDir, "../src/app"),
            "@/pages": resolve(storybookDir, "../src/pages"),
            "@/widgets": resolve(storybookDir, "../src/widgets"),
            "@/features": resolve(storybookDir, "../src/features"),
            "@/entities": resolve(storybookDir, "../src/entities"),
            "@/shared": resolve(storybookDir, "../src/shared"),
            "@": resolve(storybookDir, "../src"),
          },
        },
      } satisfies UserConfig,
    ),
};
export default config;
