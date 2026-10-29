import { describe, expect, it } from 'vitest';
import { parseFinding, validateFindings } from '../../src/core/validate';
import { GO_CALLER, GO_FILE, asFinding, rawFinding, snapshotOf } from './helpers';

const snap = () => snapshotOf({ 'payment.go': GO_FILE, 'caller.go': GO_CALLER }, { 'payment.go': [3, 5] });

describe('validateFindings', () => {
  it('accepts an anchored finding as a suspicion, never as confirmed by the model alone (UR-19)', () => {
    const { findings, rejected } = validateFindings({ findings: [rawFinding({ kind: 'issue', certainty: 'confirmed' })] }, snap());
    expect(rejected).toBe(0);
    expect(findings[0]?.certainty).toBe('suspected');
    expect(findings[0]?.impact).toBe('high');
  });

  it('rejects wrong quotes, invented files and locations outside changed lines (UR-17)', () => {
    const bad = [
      rawFinding({ location: { path: 'payment.go', startLine: 3, endLine: 3, quote: 'func SetPaymentNumber() {' } }),
      rawFinding({ evidence: [{ path: 'billing.go', startLine: 1, endLine: 1, quote: 'package billing' }] }),
      rawFinding({ location: { path: 'caller.go', startLine: 4, endLine: 4, quote: 'setPaymentNumber()' } }),
      rawFinding({ location: { path: 'payment.go', startLine: 1, endLine: 1, quote: 'package payment' } }),
      rawFinding({ evidence: [] }),
      rawFinding({ kind: 'verified' }),
    ];
    const { findings, rejected } = validateFindings({ findings: bad }, snap());
    expect(findings).toEqual([]);
    expect(rejected).toBe(bad.length);
  });

  it('accepts cross-file evidence from context files (UR-17, UA-08)', () => {
    const finding = asFinding(parseFinding(rawFinding({
      evidence: [{ path: 'caller.go', startLine: 4, endLine: 4, quote: '  setPaymentNumber()  ', reason: 'pemanggil' }],
    }), snap()));
    expect(finding.evidence[0]).toMatchObject({ path: 'caller.go', quote: '\tsetPaymentNumber()' });
  });

  it('labels as confirmed only with a matching language-provider error (section 8.2)', () => {
    const s = snap();
    s.diagnostics = [
      { id: 0, path: 'payment.go', line: 4, endLine: 4, severity: 'error', source: 'gopls', message: 'undefined: charge' },
      { id: 1, path: 'payment.go', line: 4, endLine: 4, severity: 'warning', source: 'gopls', message: 'unused' },
    ];
    const at = { path: 'payment.go', startLine: 4, endLine: 4, quote: 'charge()' };
    const confirmed = asFinding(parseFinding(rawFinding({ diagnostic: 0, location: at }), s));
    expect(confirmed.certainty).toBe('confirmed');
    expect(confirmed.confirmation).toMatchObject({ source: 'gopls', line: 4 });
    expect(asFinding(parseFinding(rawFinding({ diagnostic: 1, location: at }), s)).certainty).toBe('suspected');
    expect(asFinding(parseFinding(rawFinding({ diagnostic: 0 }), s)).certainty).toBe('suspected');
  });

  it('merges duplicates and keeps a stable fingerprint for the same code', () => {
    const { findings } = validateFindings({ findings: [rawFinding(), rawFinding()] }, snap());
    expect(findings).toHaveLength(1);
    const other = asFinding(parseFinding(rawFinding({ title: 'Judul lain' }), snap()));
    expect(other.fingerprint).toBe(findings[0]?.fingerprint);
  });

  it('throws on a malformed reply instead of treating it as clean', () => {
    expect(() => validateFindings({ result: [] }, snap())).toThrow(/findings/);
  });
});
