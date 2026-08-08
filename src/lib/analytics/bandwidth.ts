export type BandwidthEvent = { created_at: string; egressBytes: number };
export type BandwidthSeries = Array<{ date: string; egressBytes: number }>;

export function estimateEgressBytes(input: {
  plays: number;
  sizeBytes: number;
  watchedSeconds: number;
  durationSeconds: number;
}): number {
  const fraction = input.durationSeconds > 0 ? Math.min(1, input.watchedSeconds / input.durationSeconds) : 1;
  return input.plays * input.sizeBytes * fraction;
}

export function summarizeBandwidthByDay(events: BandwidthEvent[]): BandwidthSeries {
  const byDay = new Map<string, number>();
  for (const event of events) {
    const day = event.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + event.egressBytes);
  }
  return [...byDay.entries()]
    .map(([date, egressBytes]) => ({ date, egressBytes }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function bandwidthCostCents(egressBytes: number, centsPerGb: number): number {
  return Math.ceil((egressBytes / 1024 ** 3) * centsPerGb);
}

export function trendPercentage(series: BandwidthSeries): number | null {
  if (series.length < 14) return null;
  const sorted = [...series].sort((a, b) => (a.date < b.date ? -1 : 1));
  const window = sorted.slice(-14);
  const previous = window.slice(0, 7).reduce((total, item) => total + item.egressBytes, 0);
  const current = window.slice(7).reduce((total, item) => total + item.egressBytes, 0);
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}