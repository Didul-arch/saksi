import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Finding, Snapshot } from '../../src/core/types';

export function tempRepo(files: Record<string, string> = {}, commit = true): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saksi-test-'));
  run(root, 'init', '-q', '-b', 'main');
  run(root, 'config', 'user.email', 'test@example.com');
  run(root, 'config', 'user.name', 'Test');
  write(root, files);
  if (commit && Object.keys(files).length) {
    run(root, 'add', '-A');
    run(root, 'commit', '-q', '-m', 'init');
  }
  return root;
}

export function write(root: string, files: Record<string, string>): void {
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
}

export function run(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

export function snapshotOf(files: Record<string, string>, changed: Record<string, [number, number]> = {}): Snapshot {
  return {
    root: '/repo', base: null, scope: { kind: 'saved-since-commit' }, deleted: [], skipped: [], totalChanged: 0, used: 0, notes: [], diagnostics: [], limitReached: false,
    files: Object.entries(files).map(([file, content]) => {
      const range = changed[file];
      return { path: file, content, hash: 'h-' + file, role: range ? 'modified' : 'context', changed: !!range, hunks: range ? [{ start: range[0], end: range[1] }] : [], patch: '' };
    }),
  };
}

export const GO_FILE = 'package payment\n\nfunc setPaymentNumber() {\n\tcharge()\n}\n';
export const GO_CALLER = 'package payment\n\nfunc run() {\n\tsetPaymentNumber()\n}\n';

export function rawFinding(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'issue',
    title: 'Fungsi perlu diekspor?',
    observation: 'Deklarasi memakai nama lowercase.',
    inference: 'Package lain tidak dapat memanggilnya.',
    impact: 'high',
    location: { path: 'payment.go', startLine: 3, endLine: 3, quote: 'func setPaymentNumber() {' },
    evidence: [{ path: 'payment.go', startLine: 3, endLine: 3, quote: 'func setPaymentNumber() {', reason: 'deklarasi' }],
    ...overrides,
  };
}

export function asFinding(f: Finding | null): Finding {
  if (!f) throw new Error('expected finding');
  return f;
}
