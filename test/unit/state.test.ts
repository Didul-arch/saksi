import { describe, expect, it } from 'vitest';
import { applyRemembered, forget, isOpen, remember } from '../../src/core/feedback';
import { describeScope } from '../../src/core/scope';
import { scanText } from '../../src/core/sensitive';
import { markStale } from '../../src/core/staleness';
import { canTransition, finalPhase } from '../../src/core/status';
import { toMarkdown } from '../../src/core/summary';
import { parseFinding } from '../../src/core/validate';
import { GO_CALLER, GO_FILE, asFinding, rawFinding, snapshotOf } from './helpers';

const snap = () => snapshotOf({ 'payment.go': GO_FILE, 'caller.go': GO_CALLER, 'other.go': 'package payment\n' }, { 'payment.go': [3, 5] });
const finding = (overrides = {}) => asFinding(parseFinding(rawFinding(overrides), snap()));

describe('describeScope', () => {
  it('describes scopes without Git jargon (UR-11)', () => {
    expect(describeScope({ kind: 'saved-since-commit' })).toBe('perubahan tersimpan sejak commit terakhir, termasuk file baru');
    expect(describeScope({ kind: 'selection', path: 'payment.go', startLine: 3, endLine: 5 })).toBe('payment.go baris 3–5');
  });
});

describe('status', () => {
  it('never reports a partial or unvalidated run as clean (UR-31, UR-32)', () => {
    expect(finalPhase({ visibleFindings: 0, rejected: 2, partial: false })).toBe('unvalidated');
    expect(finalPhase({ visibleFindings: 0, rejected: 0, partial: true })).toBe('done-partial');
    expect(finalPhase({ visibleFindings: 1, rejected: 0, partial: false })).toBe('done-findings');
    expect(finalPhase({ visibleFindings: 0, rejected: 0, partial: false })).toBe('done-clean');
  });

  it('follows diagram 08', () => {
    expect(canTransition('done-findings', 'stale')).toBe(true);
    expect(canTransition('failed', 'done-clean')).toBe(false);
    expect(canTransition('no-changes', 'idle')).toBe(true);
  });
});

describe('markStale', () => {
  it('marks only findings that rely on the edited file (UR-33, UR-34)', () => {
    const local = finding();
    const crossFile = finding({ title: 'Lain', evidence: [{ path: 'caller.go', startLine: 4, endLine: 4, quote: 'setPaymentNumber()' }] });
    const s = snap();
    const same = markStale([local, crossFile], s, 'caller.go', 'h-caller.go');
    expect(same.newlyStale).toBe(0);
    const edited = markStale([local, crossFile], s, 'caller.go', 'different');
    expect(edited.findings.map(f => f.stale)).toEqual([false, true]);
    expect(markStale([local], s, 'other.go', null).newlyStale).toBe(0);
  });
});

describe('feedback', () => {
  it('remembers, applies, and forgets per code condition (UR-41, UR-42)', () => {
    const f = finding();
    let list = remember([], f, 'wrong', 'pemanggil sepackage', new Date('2026-10-29T00:00:00Z'));
    list = remember(list, f, 'intentional', 'sengaja internal');
    expect(list).toHaveLength(1);
    const [applied] = applyRemembered([f], list);
    expect(applied?.feedback).toEqual({ kind: 'intentional', reason: 'sengaja internal', remembered: true });
    expect(isOpen(applied!)).toBe(false);
    expect(forget(list, f.fingerprint)).toEqual([]);
  });
});

describe('sensitive scan', () => {
  it('reports line and kind but never the value (UR-38)', () => {
    const hits = scanText('a.go', 'x\nkey := "AKIAABCDEFGHIJKLMNOP"\n-----BEGIN RSA PRIVATE KEY-----');
    expect(hits).toEqual([{ path: 'a.go', line: 2, kind: 'AWS access key' }, { path: 'a.go', line: 3, kind: 'private key' }]);
    expect(JSON.stringify(hits)).not.toContain('AKIA');
  });
});

describe('summary', () => {
  it('keeps certainty, evidence and the no-guarantee notice (UR-45)', () => {
    const md = toMarkdown('done-findings', [finding()], snap());
    expect(md).toContain('Dugaan masalah · Dampak besar');
    expect(md).toContain('`payment.go:3` deklarasi');
    expect(md).toContain('bukan jaminan bebas bug');
  });
});
