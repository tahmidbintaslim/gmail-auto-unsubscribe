import { defineConfig } from "vitest/config";

export default defineConfig({
  // TSX in ext/ is Preact; harmless for the v1 .js tests.
  oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
  test: {
    include: ["test/**/*.test.js", "ext/**/*.test.{ts,tsx}"],
  },
});
