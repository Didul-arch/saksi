import { execFile } from 'node:child_process';
import type { Hunk } from './types';

export class GitError extends Error {
  constructor(message: string, readonly args: string[], readonly code: number | string | undefined) {
    super(message);
  }
}

export function git(root: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile('git', ['--no-pager', ...args], {
      cwd: root, encoding: 'utf8', timeout: 20_000, maxBuffer: 8 * 1024 * 1024, signal,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_LITERAL_PATHSPECS: '1' },
      windowsHide: true,
    }, (error, stdout) => {
      if (!error) return resolve(stdout);
      if (error.name === 'AbortError') return reject(error);
      reject(new GitError(error.message, args, (error as NodeJS.ErrnoException).code));
    });
    child.stdin?.end();
  });
}

export async function head(root: string, signal?: AbortSignal): Promise<string | null> {
  try {
    return (await git(root, ['rev-parse', '--verify', 'HEAD'], signal)).trim();
  } catch (error) {
    if (!(error instanceof GitError)) throw error;
    return null;
  }
}

export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'other';

export interface Change {
  status: ChangeStatus;
  path: string;
  oldPath?: string;
}

/** Parses `git diff --name-status -z` output. */
export function parseNameStatus(output: string): Change[] {
  const tokens = output.split('\0');
  const changes: Change[] = [];
  for (let i = 0; i < tokens.length;) {
    const code = tokens[i++];
    if (!code) continue;
    const letter = code[0];
    if (letter === 'R' || letter === 'C') {
      const oldPath = tokens[i++];
      const newPath = tokens[i++];
      if (!oldPath || !newPath) break;
      changes.push(letter === 'R' ? { status: 'renamed', path: newPath, oldPath } : { status: 'added', path: newPath });
      continue;
    }
    const file = tokens[i++];
    if (!file) break;
    const status: ChangeStatus = letter === 'A' ? 'added' : letter === 'M' ? 'modified' : letter === 'D' ? 'deleted' : 'other';
    changes.push({ status, path: file });
  }
  return changes;
}

/** New-file line ranges touched by a unified diff. Pure deletions anchor on the preceding line. */
export function parseHunks(patch: string): Hunk[] {
  const hunks: Hunk[] = [];
  for (const match of patch.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Math.max(1, Number(match[1]));
    const count = match[2] === undefined ? 1 : Number(match[2]);
    hunks.push({ start, end: start + Math.max(1, count) - 1 });
  }
  return hunks;
}

export const touches = (hunks: readonly Hunk[], start: number, end = start): boolean =>
  hunks.some(h => start <= h.end && end >= h.start);
