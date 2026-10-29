import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseHunks, parseNameStatus } from '../../src/core/git';
import { goCandidates } from '../../src/core/related';
import { addRelated, collect, isPartial, unchanged } from '../../src/core/snapshot';
import { GO_CALLER, GO_FILE, run, tempRepo, write } from './helpers';

describe('parseNameStatus / parseHunks', () => {
  it('parses added, modified, deleted and renamed entries', () => {
    const out = 'A\0new.go\0M\0mod.go\0D\0gone.go\0R087\0old.go\0renamed.go\0';
    expect(parseNameStatus(out)).toEqual([
      { status: 'added', path: 'new.go' },
      { status: 'modified', path: 'mod.go' },
      { status: 'deleted', path: 'gone.go' },
      { status: 'renamed', path: 'renamed.go', oldPath: 'old.go' },
    ]);
  });

  it('maps hunks to new-file lines', () => {
    expect(parseHunks('@@ -1,2 +3,4 @@\n@@ -10 +20 @@\n@@ -5,3 +7,0 @@')).toEqual([
      { start: 3, end: 6 }, { start: 20, end: 20 }, { start: 7, end: 7 },
    ]);
  });
});

describe('collect', () => {
  it('reviews saved changes since the last commit, including new files (UR-11)', async () => {
    const root = tempRepo({ 'payment.go': GO_FILE, 'keep.go': 'package payment\n' });
    write(root, { 'payment.go': GO_FILE.replace('charge()', 'charge(1)'), 'new.go': 'package payment\n\nfunc x() {}\n' });
    const snap = await collect(root, { scope: { kind: 'saved-since-commit' } });
    expect(snap.files.map(f => [f.path, f.role])).toEqual([['new.go', 'added'], ['payment.go', 'modified']]);
    expect(snap.files.find(f => f.path === 'payment.go')?.hunks).toEqual([{ start: 4, end: 4 }]);
    expect(isPartial(snap)).toBe(false);
  });

  it('includes deletions as context and detects renames (UR-14, UA-04)', async () => {
    const body = 'package payment\n\n' + Array.from({ length: 20 }, (_, i) => `// line ${i}`).join('\n') + '\n';
    const root = tempRepo({ 'old.go': body, 'gone.go': 'package payment\n\nfunc gone() {}\n' });
    run(root, 'mv', 'old.go', 'moved.go');
    write(root, { 'moved.go': body.replace('// line 5', '// line five') });
    fs.rmSync(path.join(root, 'gone.go'));
    const snap = await collect(root, { scope: { kind: 'saved-since-commit' } });
    expect(snap.deleted.map(d => d.path)).toEqual(['gone.go']);
    expect(snap.deleted[0]?.patch).toContain('-func gone() {}');
    const moved = snap.files.find(f => f.path === 'moved.go');
    expect(moved?.role).toBe('renamed');
    expect(moved?.oldPath).toBe('old.go');
    expect(moved?.hunks).toEqual([{ start: 8, end: 8 }]);
  });

  it('skips unsaved, excluded and sensitive-looking files and says why (UR-12, UR-15, UR-37)', async () => {
    const root = tempRepo({ 'a.go': 'package a\n' });
    write(root, { 'a.go': 'package a\n// edit\n', 'internal/private/x.go': 'package p\n', '.env': 'KEY=1', 'img.png': 'x' });
    const snap = await collect(root, { scope: { kind: 'saved-since-commit' }, dirty: new Set(['a.go']), excludes: ['internal/private'] });
    expect(snap.files).toEqual([]);
    const reasons = Object.fromEntries(snap.skipped.map(s => [s.path, s.reason]));
    expect(reasons['a.go']).toMatch(/belum disimpan/);
    expect(reasons['internal/private/x.go']).toMatch(/dikecualikan/);
    expect(reasons['.env']).toMatch(/sensitif/);
    expect(reasons['img.png']).toMatch(/belum didukung/);
    expect(isPartial(snap)).toBe(true);
  });

  it('supports a repository without commits', async () => {
    const root = tempRepo({ 'main.go': 'package main\n' }, false);
    const snap = await collect(root, { scope: { kind: 'saved-since-commit' } });
    expect(snap.base).toBeNull();
    expect(snap.files.map(f => f.role)).toEqual(['added']);
  });

  it('respects the changed-file limit and marks coverage partial', async () => {
    const root = tempRepo({ 'seed.go': 'package a\n' });
    write(root, { 'a.go': 'package a\n', 'b.go': 'package a\n', 'c.go': 'package a\n' });
    const snap = await collect(root, { scope: { kind: 'saved-since-commit' }, maxChangedFiles: 2 });
    expect(snap.files).toHaveLength(2);
    expect(snap.limitReached).toBe(true);
    expect(snap.skipped[0]?.reason).toMatch(/batas jumlah/);
  });

  it('reviews a selection or an unchanged chosen file in full (UR-13)', async () => {
    const root = tempRepo({ 'payment.go': GO_FILE });
    const selection = await collect(root, { scope: { kind: 'selection', path: 'payment.go', startLine: 3, endLine: 5 } });
    expect(selection.files[0]?.hunks).toEqual([{ start: 3, end: 5 }]);
    const files = await collect(root, { scope: { kind: 'files', paths: ['payment.go'] } });
    expect(files.files[0]?.role).toBe('selected');
    expect(files.files[0]?.hunks).toEqual([{ start: 1, end: 6 }]);
  });

  it('reviews staged changes only when the staged content matches disk', async () => {
    const root = tempRepo({ 'a.go': 'package a\n', 'b.go': 'package a\n' });
    write(root, { 'a.go': 'package a\n// staged\n', 'b.go': 'package a\n// staged\n' });
    run(root, 'add', 'a.go', 'b.go');
    write(root, { 'b.go': 'package a\n// staged\n// more\n' });
    const snap = await collect(root, { scope: { kind: 'staged' } });
    expect(snap.files.map(f => f.path)).toEqual(['a.go']);
    expect(snap.skipped[0]).toMatchObject({ path: 'b.go', reason: expect.stringMatching(/staged berbeda/) });
  });

  it('adds Go callers as context and detects later edits (UR-33)', async () => {
    const root = tempRepo({ 'payment.go': GO_FILE, 'caller.go': GO_CALLER, 'other.go': 'package payment\n' });
    write(root, { 'payment.go': GO_FILE.replace('charge()', 'charge(2)') });
    const snap = await collect(root, { scope: { kind: 'saved-since-commit' } });
    await addRelated(snap, await goCandidates(snap), {});
    expect(snap.files.map(f => [f.path, f.role])).toEqual([['payment.go', 'modified'], ['caller.go', 'context']]);
    expect(await unchanged(snap)).toBe(true);
    write(root, { 'caller.go': GO_CALLER + '// edit\n' });
    expect(await unchanged(snap)).toBe(false);
  });
});
