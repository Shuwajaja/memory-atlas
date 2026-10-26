import { describe, expect, it } from 'vitest';
import { dayCounts, sparklinePoints } from '../../src/features/overview/series';

describe('day series', () => {
  it('counts only days that are present and keeps a single day flat', () => {
    expect(dayCounts([null, undefined, ''])).toEqual([]);
    expect(sparklinePoints([])).toBeNull();
    const one = dayCounts(['2026-05-01T10:00:00.000Z', '2026-05-01T11:00:00.000Z']);
    expect(one).toEqual([{ day: '2026-05-01', count: 2 }]);
    expect(sparklinePoints(one, 54, 20)).toBe('0,1 54,1');
    const two = dayCounts(['2026-05-02T00:00:00.000Z', '2026-05-01T00:00:00.000Z']);
    expect(two.map((point) => point.day)).toEqual(['2026-05-01', '2026-05-02']);
    expect(two.map((point) => point.count)).toEqual([1, 1]);
  });
});
