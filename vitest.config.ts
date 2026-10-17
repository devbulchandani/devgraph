import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@devgraph/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@devgraph/graph": path.resolve(__dirname, "packages/graph/src/index.ts"),
      "@devgraph/code-indexer": path.resolve(__dirname, "packages/code-indexer/src/index.ts"),
      "@devgraph/conflict-engine": path.resolve(__dirname, "packages/conflict-engine/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
