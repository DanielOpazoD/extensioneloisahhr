import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    restoreMocks: true,
  },
});
