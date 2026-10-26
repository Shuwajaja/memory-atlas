export interface DayCount {
  day: string;
  count: number;
}

export function dayCounts(instants: readonly (string | null | undefined)[]): DayCount[] {
  const buckets = new Map<string, number>();
  for (const instant of instants) {
    if (!instant || instant.length < 10) continue;
    const day = instant.slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([day, count]) => ({ day, count }));
}

export function sparklinePoints(series: readonly DayCount[], width = 54, height = 20): string | null {
  if (series.length === 0) return null;
  const max = Math.max(...series.map((point) => point.count));
  if (series.length === 1) {
    const y = height - (series[0]!.count / max) * (height - 2) - 1;
    return `0,${y} ${width},${y}`;
  }
  return series.map((point, index) => {
    const x = (index / (series.length - 1)) * width;
    const y = height - (point.count / max) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
}

export function sparklineLabel(title: string, series: readonly DayCount[]): string {
  if (series.length === 0) return `${title}: keine Zeitreihe`;
  if (series.length === 1) return `${title}: ein Tag ${series[0]!.day} mit ${series[0]!.count}`;
  return `${title}: ${series.map((point) => `${point.day} ${point.count}`).join(', ')}`;
}
