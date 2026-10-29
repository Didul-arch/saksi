import { describe, expect, it } from 'vitest';
import { applyVerdict, refine } from '../../src/core/refine';
import type { PromptContext } from '../../src/core/prompts';
import { parseFinding } from '../../src/core/validate';
import { GO_CALLER, GO_FILE, asFinding, rawFinding, snapshotOf } from './helpers';

const ctx: PromptContext = { intent: '', rules: [], remembered: [], preferences: { style: 'concise', language: 'id', showOptional: true } };
const snap = () => snapshotOf({ 'payment.go': GO_FILE, 'caller.go': GO_CALLER }, { 'payment.go': [3, 5] });
const finding = () => asFinding(parseFinding(rawFinding(), snap()));

describe('applyVerdict', () => {
  it('drops a refuted suspicion (UA-06, UA-10)', () => {
    const applied = applyVerdict(finding(), { outcome: 'drop', reason: 'Pemanggil ada di package yang sama.' }, snap(), 1);
    expect(applied?.finding).toBeNull();
    expect(applied?.revision).toMatchObject({ outcome: 'dropped', reason: 'Pemanggil ada di package yang sama.' });
  });

  it('turns an unsupported claim into a question and keeps the id', () => {
    const original = finding();
    const applied = applyVerdict(original, { outcome: 'to-question', reason: 'Tujuan belum jelas.', finding: rawFinding({ title: 'Perlu diekspor?' }) }, snap(), 1);
    expect(applied?.finding).toMatchObject({ id: original.id, certainty: 'question', title: 'Perlu diekspor?', unrefined: false });
  });

  it('keeps the old finding when the update fails validation', () => {
    const applied = applyVerdict(finding(), { outcome: 'narrow', reason: 'x', finding: rawFinding({ evidence: [] }) }, snap(), 1);
    expect(applied?.finding?.title).toBe('Fungsi perlu diekspor?');
    expect(applied?.revision.outcome).toBe('kept');
  });

  it('does not let the model dismiss a confirmed finding', () => {
    const confirmed = { ...finding(), certainty: 'confirmed' as const, confirmation: { source: 'gopls', message: 'x', line: 3 } };
    expect(applyVerdict(confirmed, { outcome: 'drop', reason: 'r' }, snap(), 1)?.finding).not.toBeNull();
  });

  it('ignores unknown outcomes', () => {
    expect(applyVerdict(finding(), { outcome: 'approve' }, snap(), 1)).toBeNull();
  });
});

describe('refine', () => {
  it('stops when a round brings no new information', async () => {
    let calls = 0;
    const f = finding();
    const result = await refine([f], snap(), {
      maxRounds: 3, ctx, addFiles: async () => 0,
      ask: async () => { calls++; return { verdicts: [{ id: f.id, outcome: 'keep', reason: 'tetap didukung' }] }; },
    });
    expect(calls).toBe(1);
    expect(result).toMatchObject({ stopReason: 'no-new-info', rounds: 1, limitHit: false });
    expect(result.findings[0]?.unrefined).toBe(false);
  });

  it('fetches requested context and continues, up to the depth limit (UR-22, UR-25)', async () => {
    const f = finding();
    const requested: string[][] = [];
    const result = await refine([f], snap(), {
      maxRounds: 2, ctx,
      addFiles: async paths => { requested.push(paths); return 1; },
      ask: async () => ({ verdicts: [{ id: f.id, outcome: 'keep', reason: 'r' }], requestFiles: ['billing/use.go', 42] }),
    });
    expect(requested).toEqual([['billing/use.go'], ['billing/use.go']]);
    expect(result).toMatchObject({ stopReason: 'max-rounds', rounds: 2, limitHit: true });
  });

  it('keeps findings visible but unrefined when the model skips them or fails (UR-21)', async () => {
    const f = finding();
    const skipped = await refine([f], snap(), { maxRounds: 1, ctx, addFiles: async () => 0, ask: async () => ({ verdicts: [] }) });
    expect(skipped.findings[0]?.unrefined).toBe(true);
    const failed = await refine([f], snap(), { maxRounds: 1, ctx, addFiles: async () => 0, ask: async () => { throw new Error('HTTP 500'); } });
    expect(failed).toMatchObject({ stopReason: 'error', error: 'HTTP 500' });
    expect(failed.findings).toHaveLength(1);
  });

  it('reports cancellation without losing interim findings', async () => {
    const controller = new AbortController();
    const result = await refine([finding()], snap(), {
      maxRounds: 1, ctx, addFiles: async () => 0, signal: controller.signal,
      ask: async () => { controller.abort(); throw Object.assign(new Error('aborted'), { name: 'AbortError' }); },
    });
    expect(result.stopReason).toBe('cancelled');
    expect(result.findings).toHaveLength(1);
  });
});
