import { describe, expect, it } from 'vitest';
import { describeScope } from '../../src/core/scope';

describe('describeScope', () => {
  it('describes the default scope without Git jargon', () => {
    expect(describeScope({ kind: 'saved-since-commit' })).toBe('perubahan tersimpan sejak commit terakhir, termasuk file baru');
  });

  it('describes a selection with its line range', () => {
    expect(describeScope({ kind: 'selection', path: 'payment.go', startLine: 3, endLine: 5 })).toBe('payment.go baris 3–5');
  });
});
