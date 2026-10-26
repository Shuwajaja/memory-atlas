import { describe, expect, it } from 'vitest';
import { messageWindowRelation, sixCalendarMonths } from '../../src/domain/date-window';

describe('six calendar months', () => {
  it('uses Europe/Berlin local midnights on 26 October 2026, including the DST change', () => {
    const window = sixCalendarMonths(new Date('2026-10-26T12:00:00Z'), 'Europe/Berlin');
    expect(window.startInclusive).toBe('2026-04-25T22:00:00.000Z');
    expect(window.endExclusive).toBe('2026-10-26T23:00:00.000Z');
    expect(messageWindowRelation('2026-04-25T22:00:00Z', window)).toBe('inside');
    expect(messageWindowRelation('2026-04-25T21:59:59Z', window)).toBe('before');
    expect(messageWindowRelation('2026-10-26T22:59:59Z', window)).toBe('inside');
    expect(messageWindowRelation('2026-10-26T23:00:00Z', window)).toBe('after');
    expect(messageWindowRelation(null, window)).toBe('unknown');
  });

  it('clamps month ends and keeps 29 February in a leap year', () => {
    const leap = sixCalendarMonths(new Date('2024-08-31T12:00:00Z'), 'Europe/Berlin');
    expect(leap.startInclusive.startsWith('2024-02-28T23:00:00')).toBe(true);
    const common = sixCalendarMonths(new Date('2025-08-31T12:00:00Z'), 'Europe/Berlin');
    expect(common.startInclusive.startsWith('2025-02-27T23:00:00')).toBe(true);
    const march = sixCalendarMonths(new Date('2026-03-31T12:00:00Z'), 'Europe/Berlin');
    expect(march.startInclusive.startsWith('2025-09-29T22:00:00')).toBe(true);
  });
});
