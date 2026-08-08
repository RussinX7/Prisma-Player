import { describe, expect, it } from "vitest";
import {
  bandwidthCostCents,
  estimateEgressBytes,
  summarizeBandwidthByDay,
  trendPercentage,
} from "@/lib/analytics/bandwidth";

describe("estimateEgressBytes", () => {
  it("computes plays x size x watched fraction", () => {
    expect(estimateEgressBytes({ plays: 10, sizeBytes: 1000, watchedSeconds: 5, durationSeconds: 10 })).toBe(5000);
  });

  it("clamps fraction at 1 when watched exceeds duration", () => {
    expect(estimateEgressBytes({ plays: 10, sizeBytes: 1000, watchedSeconds: 20, durationSeconds: 10 })).toBe(10000);
  });

  it("falls back to full fraction when duration is 0", () => {
    expect(estimateEgressBytes({ plays: 10, sizeBytes: 1000, watchedSeconds: 3, durationSeconds: 0 })).toBe(10000);
  });

  it("returns 0 when there are no plays", () => {
    expect(estimateEgressBytes({ plays: 0, sizeBytes: 1000, watchedSeconds: 5, durationSeconds: 10 })).toBe(0);
  });
});

describe("summarizeBandwidthByDay", () => {
  it("groups events by ISO date and sums egress", () => {
    const result = summarizeBandwidthByDay([
      { created_at: "2026-08-01T10:00:00.000Z", egressBytes: 100 },
      { created_at: "2026-08-01T15:30:00.000Z", egressBytes: 50 },
      { created_at: "2026-08-02T09:00:00.000Z", egressBytes: 75 },
    ]);
    expect(result).toEqual([
      { date: "2026-08-01", egressBytes: 150 },
      { date: "2026-08-02", egressBytes: 75 },
    ]);
  });

  it("returns an empty series for no events", () => {
    expect(summarizeBandwidthByDay([])).toEqual([]);
  });
});

describe("bandwidthCostCents", () => {
  it("rounds up 1 GB to the configured per-GB cost", () => {
    expect(bandwidthCostCents(1024 ** 3, 15)).toBe(15);
  });

  it("ceils fractional GB costs", () => {
    expect(bandwidthCostCents(1.5 * 1024 ** 3, 15)).toBe(23);
  });

  it("returns 0 for zero bytes", () => {
    expect(bandwidthCostCents(0, 15)).toBe(0);
  });
});

describe("trendPercentage", () => {
  it("returns null for a series shorter than 14 days", () => {
    expect(trendPercentage([{ date: "2026-08-01", egressBytes: 100 }])).toBeNull();
  });

  it("returns null when the previous window has no egress", () => {
    const flat = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      egressBytes: i < 7 ? 0 : 100,
    }));
    expect(trendPercentage(flat)).toBeNull();
  });

  it("reports a positive trend across the last 7 days", () => {
    const flat = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      egressBytes: i < 7 ? 100 : 200,
    }));
    expect(trendPercentage(flat)).toBe(100);
  });

  it("reports a negative trend across the last 7 days", () => {
    const flat = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      egressBytes: i < 7 ? 200 : 100,
    }));
    expect(trendPercentage(flat)).toBe(-50);
  });
});