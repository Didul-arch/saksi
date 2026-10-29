import { describe, expect, it } from 'vitest';
import { reviewMessages } from '../../src/core/prompts';
import { applyRewrite, enforceLimits, groundingProblems, limitsFor, styleIssues, trim } from '../../src/core/style';
import { parseFinding } from '../../src/core/validate';
import { GO_CALLER, GO_FILE, asFinding, rawFinding, snapshotOf } from './helpers';

const snap = () => snapshotOf({ 'payment.go': GO_FILE, 'caller.go': GO_CALLER }, { 'payment.go': [3, 5] });
const finding = (overrides = {}) => asFinding(parseFinding(rawFinding(overrides), snap()));

describe('grounding (anti-ngarang)', () => {
  it('rejects an observation that names code which does not exist', () => {
    expect(parseFinding(rawFinding({ observation: '`setPaymentNumber` memanggil `validateCard()`.' }), snap())).toBeNull();
    expect(parseFinding(rawFinding({ observation: '`setPaymentNumber` memanggil `charge()`.' }), snap())).not.toBeNull();
  });

  it('allows new names in the suggestion, since it proposes a change', () => {
    expect(parseFinding(rawFinding({ suggestion: 'Ganti nama jadi `SetPaymentNumber`.' }), snap())).not.toBeNull();
  });

  it('rejects mentions of files outside the review', () => {
    expect(parseFinding(rawFinding({ inference: 'Dipakai di billing/invoice.go.' }), snap())).toBeNull();
    expect(groundingProblems({ ...finding(), inference: 'Dipakai di billing/invoice.go.' }, snap())).toEqual(['menyebut file billing/invoice.go yang tidak ada dalam review']);
    expect(groundingProblems({ ...finding(), inference: 'Dipanggil dari caller.go.' }, snap())).toEqual([]);
  });
});

describe('style rules', () => {
  it('flags filler, overstatement, invented test results and long text', () => {
    const f = finding({
      title: 'Potensi masalah pada fungsi yang mungkin perlu diperhatikan oleh developer',
      inference: 'Hal ini pasti menyebabkan tes gagal.',
    });
    const problems = styleIssues(f, 'terse').map(i => `${i.field}: ${i.problem}`);
    expect(problems).toEqual(expect.arrayContaining([
      'title: berisi frasa pengisi',
      'title: judul lebih dari 9 kata',
      'inference: berisi frasa pengisi',
      'inference: terlalu yakin untuk temuan yang belum terkonfirmasi',
      'inference: mengklaim hasil tes/build yang tidak pernah dijalankan',
    ]));
    expect(styleIssues(finding(), 'terse')).toEqual([]);
  });

  it('always enforces limits, cutting at a sentence or word boundary', () => {
    expect(trim('Satu dua tiga. Empat lima enam tujuh.', 20)).toBe('Satu dua tiga.');
    expect(trim('alpha beta gamma delta', 15)).toBe('alpha beta…');
    const long = enforceLimits(finding({ observation: 'kata '.repeat(100) }), 'terse');
    expect(long.observation.length).toBeLessThanOrEqual(limitsFor('terse').observation);
  });
});

describe('applyRewrite', () => {
  const wordy = () => finding({ title: 'Hal ini perlu diperhatikan pada fungsi pembayaran', missingContext: 'Belum ada pemanggil dari billing.' });

  it('accepts a grounded rewrite that fixes the style and keeps location/certainty', () => {
    const f = wordy();
    const out = applyRewrite(f, { title: '`setPaymentNumber` tak bisa dipanggil billing', missingContext: 'Pemanggil billing belum ada.', certainty: 'confirmed', location: null }, snap(), 'terse');
    expect(out.title).toBe('`setPaymentNumber` tak bisa dipanggil billing');
    expect(out.certainty).toBe(f.certainty);
    expect(out.location).toEqual(f.location);
  });

  it('refuses rewrites that invent code or drop stated uncertainty', () => {
    const f = wordy();
    expect(applyRewrite(f, { title: 'Ringkas', observation: '`chargeCard` dipanggil.' }, snap(), 'terse')).toBe(f);
    expect(applyRewrite(f, { title: 'Ringkas', missingContext: '' }, snap(), 'terse')).toBe(f);
  });
});

describe('prompt', () => {
  it('states the terse rules, limits and an example in the system prompt', () => {
    const system = reviewMessages(snap(), { intent: '', rules: [], remembered: [], preferences: { style: 'terse', language: 'id', showOptional: true } })[0]!.content;
    expect(system).toContain('Style: TERSE');
    expect(system).toContain('title ≤ 70');
    expect(system).toContain('root cause');
    expect(system).toContain('`setPaymentNumber` tak bisa dipanggil dari billing');
  });
});
