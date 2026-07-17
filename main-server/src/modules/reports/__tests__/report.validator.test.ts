import { describe, expect, it } from 'vitest';
import { normalizeUserId, validateReportId, validateRunId } from '../validators/report.validator';

describe('report UUID validation', () => {
  it('accepts UUIDs stored by PostgreSQL, including deterministic seed IDs', () => {
    expect(() => validateReportId('50000001-0000-0000-0000-000000000001')).not.toThrow();
    expect(() => validateRunId('45000001-0000-0000-0000-000000000001')).not.toThrow();
    expect(normalizeUserId('40000001-0000-0000-0000-000000000001')).toBe(
      '40000001-0000-0000-0000-000000000001'
    );
  });

  it('continues to reject malformed identifiers', () => {
    expect(() => validateReportId('not-a-uuid')).toThrow('Report id must be a UUID');
    expect(() => validateRunId('45000001-0000-0000-0000')).toThrow('Production run id must be a UUID');
    expect(normalizeUserId('not-a-uuid')).toBeNull();
  });
});
