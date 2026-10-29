import { describe, expect, it } from 'vitest';
import { reviewMessages } from '../../src/core/prompts';
import { collect } from '../../src/core/snapshot';
import { enforceLimits, groundingProblems, LIMITS, trim } from '../../src/core/style';
import { parseFinding } from '../../src/core/validate';
import { GO_CALLER, GO_FILE, asFinding, rawFinding, snapshotOf, tempRepo, write } from './helpers';

const snap = () => snapshotOf({ 'payment.go': GO_FILE, 'caller.go': GO_CALLER }, { 'payment.go': [3, 5] });
const finding = (overrides = {}) => asFinding(parseFinding(rawFinding(overrides), snap()));

describe('grounding (UR-53, UA-27)', () => {
  it('rejects an observation that names code which does not exist', () => {
    expect(parseFinding(rawFinding({ observation: '`setPaymentNumber` memanggil `validateCard()`.' }), snap())).toBeNull();
    expect(parseFinding(rawFinding({ observation: '`setPaymentNumber` memanggil `charge()`.' }), snap())).not.toBeNull();
  });

  it('allows new names in the suggestion, since it proposes a change', () => {
    expect(parseFinding(rawFinding({ suggestion: 'Ganti nama jadi `SetPaymentNumber`.' }), snap())).not.toBeNull();
  });

  it('rejects mentions of files outside the review', () => {
    expect(parseFinding(rawFinding({ inference: 'Dipakai di billing/invoice.go.' }), snap())).toBeNull();
    expect(groundingProblems({ ...finding(), inference: 'Dipanggil dari caller.go.' }, snap())).toEqual([]);
  });

  it('rejects claims of test or build results that were never run', () => {
    expect(parseFinding(rawFinding({ inference: 'Tes pembayaran gagal karena ini.' }), snap())).toBeNull();
  });
});

describe('concept (UR-56)', () => {
  it('keeps the concept separate from observation and inference', () => {
    const f = finding({ concept: 'Di Go, huruf kecil = unexported.' });
    expect(f.concept).toBe('Di Go, huruf kecil = unexported.');
    expect(f.observation).toBe('Deklarasi memakai nama lowercase.');
  });
});

describe('length limits (K4)', () => {
  it('leaves text up to twice the limit untouched and cuts beyond that', () => {
    const near = 'x'.repeat(LIMITS.observation + 50);
    expect(trim(near, LIMITS.observation)).toBe(near);
    expect(trim('Satu dua tiga. Empat lima enam tujuh delapan sembilan sepuluh.', 20)).toBe('Satu dua tiga.');
    const long = enforceLimits(finding({ observation: 'kata '.repeat(100) }));
    expect(long.observation.length).toBeLessThanOrEqual(LIMITS.observation);
  });
});

describe('project context (UR-55, UA-29)', () => {
  it('sends README.md as project context when present', async () => {
    const root = tempRepo({ 'README.md': '# Toko\nAplikasi kasir untuk UMKM.\n', 'a.go': 'package a\n' });
    write(root, { 'a.go': 'package a\n// edit\n' });
    const s = await collect(root, { scope: { kind: 'saved-since-commit' } });
    expect(s.project).toEqual({ path: 'README.md', text: '# Toko\nAplikasi kasir untuk UMKM.\n' });
    const payload = JSON.parse(reviewMessages(s, { intent: '', rules: [], remembered: [], preferences: { language: 'id', showOptional: true } })[1]!.content);
    expect(payload.snapshot.project.text).toContain('kasir');
  });

  it('says so when the project purpose is unknown, without blocking', async () => {
    const root = tempRepo({ 'a.go': 'package a\n' });
    write(root, { 'a.go': 'package a\n// edit\n' });
    const s = await collect(root, { scope: { kind: 'saved-since-commit' } });
    expect(s.project).toBeUndefined();
    expect(s.files).toHaveLength(1);
    expect(s.notes.join(' ')).toMatch(/Tujuan proyek tidak diketahui/);
  });
});

describe('prompt (UR-51, UR-52, UR-54)', () => {
  it('asks for root cause, a concept, minimal suggestions and direct chat answers', () => {
    const system = reviewMessages(snap(), { intent: '', rules: [], remembered: [], preferences: { language: 'id', showOptional: true } })[0]!.content;
    expect(system).toContain('root cause in at most 8 words');
    expect(system).toContain('"concept" = the language rule');
    expect(system).toContain('smallest change that fixes this finding (YAGNI)');
    expect(system).toContain('first sentence answers the question');
    expect(system).toContain('title ≤ 70');
  });
});
