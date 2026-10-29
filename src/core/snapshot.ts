import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type Change, GitError, git, head, parseHunks, parseNameStatus } from './git';
import { MAX_FILE_BYTES, inside, skipReason } from './policy';
import type { ReviewScope } from './scope';
import { hash, lines } from './text';
import type { Hunk, Snapshot, SnapshotFile } from './types';

export interface CollectOptions {
  scope: ReviewScope;
  /** Repository-relative paths with unsaved editor changes. Never saved implicitly (UR-12). */
  dirty?: ReadonlySet<string>;
  excludes?: readonly string[];
  maxContextChars?: number;
  maxChangedFiles?: number;
  maxRelatedFiles?: number;
}

export const DEFAULT_LIMITS = { maxContextChars: 140_000, maxChangedFiles: 24, maxRelatedFiles: 8 };
const MAX_DELETED_PATCH = 20_000;

class SkipError extends Error {}

async function readRaw(root: string, file: string): Promise<string> {
  const absolute = path.resolve(root, file);
  const stat = await fs.lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new SkipError('symlink / bukan file biasa');
  if (stat.size > MAX_FILE_BYTES) throw new SkipError('file lebih dari 90 KB');
  const real = await fs.realpath(absolute);
  if (!inside(await fs.realpath(root), real)) throw new SkipError('di luar repository');
  const content = await fs.readFile(real, 'utf8');
  if (content.includes('\0') || content.includes('�')) throw new SkipError('biner / bukan UTF-8');
  return content;
}

export async function readSource(root: string, file: string, excludes: readonly string[] = []): Promise<{ content: string; hash: string }> {
  const reason = skipReason(file, excludes);
  if (reason) throw new SkipError(reason);
  const content = await readRaw(root, file);
  return { content, hash: hash(content) };
}

async function workingChanges(root: string, base: string | null, signal?: AbortSignal): Promise<Change[]> {
  const tracked = base
    ? parseNameStatus(await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z', '-M', base, '--'], signal))
    : (await git(root, ['ls-files', '-z'], signal)).split('\0').filter(Boolean).map(file => ({ status: 'added' as const, path: file }));
  const untracked = (await git(root, ['ls-files', '--others', '--exclude-standard', '-z'], signal)).split('\0').filter(Boolean);
  const seen = new Set(tracked.map(change => change.path));
  return [...tracked, ...untracked.filter(file => !seen.has(file)).map(file => ({ status: 'added' as const, path: file }))];
}

async function stagedChanges(root: string, base: string | null, signal?: AbortSignal): Promise<Change[]> {
  return parseNameStatus(await git(root, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--name-status', '-z', '-M', ...(base ? [base] : []), '--'], signal));
}

function wholeFile(content: string): Hunk[] {
  return [{ start: 1, end: Math.max(1, lines(content).length) }];
}

function skipMessage(error: unknown): string {
  if (error instanceof SkipError) return error.message;
  if (error instanceof GitError) return 'Git diff gagal';
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'tidak ditemukan';
  return 'tidak dapat dibaca';
}

/** Collects the files in the chosen scope into a fixed snapshot (diagram 05, steps 2–6). */
export async function collect(root: string, options: CollectOptions, signal?: AbortSignal): Promise<Snapshot> {
  const limits = { ...DEFAULT_LIMITS, ...definedOnly(options) };
  const excludes = options.excludes ?? [];
  const scope = options.scope;
  const base = await head(root, signal);
  const snapshot: Snapshot = {
    root, base, scope, files: [], deleted: [], skipped: [], totalChanged: 0, used: 0, notes: [], diagnostics: [], limitReached: false,
  };
  if (!base && scope.kind !== 'selection') snapshot.notes.push('Repository belum punya commit; semua file tracked dianggap baru.');

  type Entry = Change & { selected?: Hunk };
  let entries: Entry[];
  if (scope.kind === 'selection') {
    entries = [{ status: 'other', path: scope.path, selected: { start: scope.startLine, end: scope.endLine } }];
  } else if (scope.kind === 'staged') {
    entries = await stagedChanges(root, base, signal);
  } else {
    entries = await workingChanges(root, base, signal);
    if (scope.kind === 'files') {
      const wanted = new Set(scope.paths);
      const changed = entries.filter(entry => wanted.has(entry.path));
      const unchanged = scope.paths.filter(file => !changed.some(entry => entry.path === file));
      entries = [...changed, ...unchanged.map(file => ({ status: 'other' as const, path: file, selected: { start: 1, end: Number.MAX_SAFE_INTEGER } }))];
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  snapshot.totalChanged = entries.length;
  if (options.dirty?.size) {
    const dirtyInScope = entries.filter(entry => options.dirty?.has(entry.path)).length;
    if (dirtyInScope) snapshot.notes.push(`${dirtyInScope} file dalam cakupan belum disimpan dan dilewati.`);
  }

  const diffArgs = scope.kind === 'staged' ? ['diff', '--cached'] : ['diff'];
  const diff = (paths: string[]) => git(root, [...diffArgs, '--no-ext-diff', '--no-textconv', '--no-color', '-M', '--unified=0', ...(base ? [base] : []), '--', ...paths], signal);

  for (const entry of entries) {
    if (signal?.aborted) throw abortError();
    try {
      const reason = skipReason(entry.path, excludes);
      if (reason) throw new SkipError(reason);
      if (entry.status !== 'deleted' && options.dirty?.has(entry.path)) throw new SkipError('belum disimpan; simpan dulu agar ikut direview');
      if (snapshot.files.filter(f => f.changed).length + snapshot.deleted.length >= limits.maxChangedFiles) {
        snapshot.limitReached = true;
        throw new SkipError('batas jumlah file berubah tercapai');
      }

      if (entry.status === 'deleted') {
        let patch = base ? await diff([entry.path]) : '';
        if (patch.length > MAX_DELETED_PATCH) patch = patch.slice(0, MAX_DELETED_PATCH) + '\n[...dipotong]';
        if (!fitBudget(snapshot, patch.length, limits.maxContextChars)) throw new SkipError('batas ukuran konteks tercapai');
        snapshot.deleted.push({ path: entry.path, patch });
        continue;
      }

      const source = await readSource(root, entry.path, excludes);
      const file: SnapshotFile = { path: entry.path, ...source, role: 'modified', changed: true, hunks: [], patch: '' };

      if (entry.selected) {
        const total = lines(source.content).length;
        const start = Math.min(Math.max(1, entry.selected.start), total);
        const end = Math.min(Math.max(start, entry.selected.end), total);
        file.role = 'selected';
        file.hunks = [{ start, end }];
        file.patch = scope.kind === 'selection'
          ? `[Bagian terpilih: baris ${start}–${end}. Hanya bagian ini yang direview; sisa file adalah konteks.]`
          : '[File dipilih tanpa perubahan sejak commit terakhir; seluruh isi direview.]';
      } else if (entry.status === 'added' || !base) {
        file.role = 'added';
        file.hunks = wholeFile(source.content);
        file.patch = '[File baru; seluruh isi yang tersimpan adalah baru.]';
      } else {
        if (scope.kind === 'staged' && !(await stagedMatchesDisk(root, entry.path, signal))) {
          throw new SkipError('isi staged berbeda dengan file di disk; stage ulang agar sama');
        }
        file.role = entry.status === 'renamed' ? 'renamed' : 'modified';
        file.oldPath = entry.oldPath;
        file.patch = await diff(entry.oldPath ? [entry.oldPath, entry.path] : [entry.path]);
        file.hunks = parseHunks(file.patch);
        if (!file.hunks.length) {
          if (entry.status !== 'renamed') throw new SkipError('hanya perubahan mode/tipe file');
          file.changed = false;
          snapshot.notes.push(`${entry.path} di-rename dari ${entry.oldPath} tanpa perubahan isi; disertakan sebagai konteks.`);
        }
      }

      if (!fitBudget(snapshot, file.content.length + file.patch.length, limits.maxContextChars)) {
        throw new SkipError('batas ukuran konteks tercapai');
      }
      snapshot.files.push(file);
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (error instanceof Error && error.message.startsWith('batas')) snapshot.limitReached = true;
      snapshot.skipped.push({ path: entry.path, reason: skipMessage(error), changed: true });
    }
  }
  if (snapshot.deleted.length) {
    snapshot.notes.push(`${snapshot.deleted.length} file dihapus disertakan sebagai konteks penghapusan; temuan tidak dapat ditambatkan pada baris yang sudah tidak ada.`);
  }
  return snapshot;
}

function fitBudget(snapshot: Snapshot, cost: number, max: number): boolean {
  if (snapshot.used + cost > max) return false;
  snapshot.used += cost;
  return true;
}

async function stagedMatchesDisk(root: string, file: string, signal?: AbortSignal): Promise<boolean> {
  const index = (await git(root, ['ls-files', '-s', '--', file], signal)).split(/\s+/)[1];
  const disk = (await git(root, ['hash-object', '--', file], signal)).trim();
  return !!index && index === disk;
}

function definedOnly(options: CollectOptions): Partial<typeof DEFAULT_LIMITS> {
  const out: Partial<typeof DEFAULT_LIMITS> = {};
  for (const key of Object.keys(DEFAULT_LIMITS) as (keyof typeof DEFAULT_LIMITS)[]) {
    if (typeof options[key] === 'number') out[key] = options[key];
  }
  return out;
}

function abortError(): Error {
  const error = new Error('Review dibatalkan.');
  error.name = 'AbortError';
  return error;
}

/** Adds related files (callers, usages) as context, within limits and the same read policy (UR-14, UR-15). */
export async function addRelated(snapshot: Snapshot, candidates: Iterable<string>, options: Pick<CollectOptions, 'dirty' | 'excludes' | 'maxRelatedFiles' | 'maxContextChars'>): Promise<void> {
  const maxRelated = options.maxRelatedFiles ?? DEFAULT_LIMITS.maxRelatedFiles;
  const maxChars = options.maxContextChars ?? DEFAULT_LIMITS.maxContextChars;
  let count = snapshot.files.filter(f => f.role === 'context').length;
  for (const file of new Set(candidates)) {
    if (snapshot.files.some(f => f.path === file) || snapshot.skipped.some(s => s.path === file)) continue;
    if (count >= maxRelated) {
      snapshot.notes.push('Batas jumlah file konteks tercapai; sebagian pemanggil/penggunaan mungkin tidak ikut diperiksa.');
      break;
    }
    if (options.dirty?.has(file)) {
      snapshot.skipped.push({ path: file, reason: 'file terkait belum disimpan', changed: false });
      continue;
    }
    try {
      const source = await readSource(snapshot.root, file, options.excludes);
      if (!fitBudget(snapshot, source.content.length, maxChars)) {
        snapshot.notes.push('Batas ukuran konteks tercapai saat menambah file terkait.');
        break;
      }
      snapshot.files.push({ path: file, ...source, role: 'context', changed: false, hunks: [], patch: '' });
      count++;
    } catch (error) {
      snapshot.skipped.push({ path: file, reason: `file terkait: ${skipMessage(error)}`, changed: false });
    }
  }
}

/** True when HEAD and every snapshot file are still as reviewed (UR-33). */
export async function unchanged(snapshot: Snapshot): Promise<boolean> {
  if ((await head(snapshot.root)) !== snapshot.base) return false;
  for (const file of snapshot.files) {
    try {
      if (hash(await readRaw(snapshot.root, file.path)) !== file.hash) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export const isPartial = (snapshot: Snapshot): boolean => snapshot.limitReached || snapshot.skipped.some(s => s.changed);
