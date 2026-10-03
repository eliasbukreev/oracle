import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "app");

export default defineConfig({
  resolve: {
    alias: {
      "~": appDir,
      "@": appDir,
    },
  },
  test: {
    environment: "node",
    include: ["app/services/**/*.test.ts"],
  },
});
