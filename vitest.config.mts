import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["convex/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
