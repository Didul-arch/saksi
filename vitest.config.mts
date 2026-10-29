import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// src/core must not import 'vscode'; extension wiring tests use a mocked 'vscode' module.
export default defineConfig({
  resolve: { alias: { vscode: fileURLToPath(new URL('./test/mock/vscode.ts', import.meta.url)) } },
  test: { include: ['test/unit/**/*.test.ts'] },
});
