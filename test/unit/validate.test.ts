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

describe('honest explanations are not rejected (fmt.Fprintf case)', () => {
  const MAIN = 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Fprintf("hi!")\n}\n';
  const s = () => snapshotOf({ 'main.go': MAIN }, { 'main.go': [1, 7] });
  const at = { path: 'main.go', startLine: 6, endLine: 6, quote: 'fmt.Fprintf("hi!")' };
  const fprintf = (overrides: Record<string, unknown> = {}) => ({
    kind: 'issue',
    title: '`fmt.Fprintf` tanpa writer',
    observation: '`fmt.Fprintf("hi!")` hanya diberi satu argumen `string`.',
    concept: '`fmt.Fprintf` butuh `io.Writer` sebagai argumen pertama, misalnya `os.Stdout`.',
    inference: 'Kode ini akan gagal dikompilasi.',
    location: at,
    evidence: [at],
    ...overrides,
  });

  it('accepts library names, types and predictions', () => {
    const { findings, rejections } = validateFindings({ findings: [fprintf()] }, s());
    expect(rejections).toEqual([]);
    expect(findings).toHaveLength(1);
  });

  it('tolerates numeric-string lines, a missing endLine and copied "N|" prefixes', () => {
    const loose = { path: 'main.go', startLine: '6', quote: '6|\tfmt.Fprintf("hi!")' };
    expect(validateFindings({ findings: [fprintf({ location: loose, evidence: [loose] })] }, s()).findings).toHaveLength(1);
  });

  it('still rejects invented calls and reported test runs, and says why', () => {
    const { findings, rejections } = validateFindings({ findings: [
      fprintf({ observation: '`main` memanggil `printGreeting()`.' }),
      fprintf({ inference: 'Tes gagal di CI.' }),
      fprintf({ location: { ...at, quote: 'fmt.Println("hi!")' } }),
    ] }, s());
    expect(findings).toEqual([]);
    expect(rejections.map(r => r.reason)).toEqual([
      'pengamatan menyebut `printGreeting()` yang tidak ada di kode yang direview',
      'mengklaim hasil tes/build yang tidak pernah dijalankan',
      'lokasi: main.go:6: kutipan tidak cocok dengan kode di baris itu',
    ]);
  });
});
