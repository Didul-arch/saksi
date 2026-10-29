import { defineConfig } from 'vitest/config';

// Unit tests cover src/core only; it must not import 'vscode'.
export default defineConfig({
  test: { include: ['test/unit/**/*.test.ts'] },
});
