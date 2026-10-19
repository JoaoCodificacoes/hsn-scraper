import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeHistory, summarize, chartPoints, timeDomain } from "./history";

const day = 86_400_000;
const start = Date.parse("2026-07-01T08:00:00Z");

test("sorts valid observations and compares prices at cent precision", () => {
  const points = normalizeHistory([
    { date: "2026-07-02T08:00:00Z", price: 61.487701 },
    { date: "invalid", price: 50 },
    { date: "2026-07-01T08:00:00Z", price: 54.784201 },
    { date: "2026-07-01", price: -2 }, null,
  ]);
  assert.deepEqual(points, [{ timestamp: start, price: 54.78 }, { timestamp: start + day, price: 61.49 }]);
  assert.deepEqual(normalizeHistory(null), []);
});

test("latest price is the last observation, not the daily minimum", () => {
  const points = [{ timestamp: start, price: 15.66 }, { timestamp: start + 3600000, price: 26.06 }];
  const stats = summarize(points);
  assert.equal(stats?.latest.price, 26.06);
  assert.equal(stats?.low, 15.66);
  assert.equal(stats?.median, 20.86);
  assert.ok(Math.abs((stats?.aboveLow ?? 0) - 66.4112388) < 0.00001);
  assert.equal(stats?.change, 10.4);
});

test("empty and one-point histories do not invent a trend", () => {
  assert.equal(summarize([]), null);
  assert.equal(summarize([{ timestamp: start, price: 10 }])?.change, null);
});

test("retains intraday observations and breaks only gaps over 36 hours", () => {
  const points = [{ timestamp: start, price: 10 }, { timestamp: start + day, price: 11 }, { timestamp: start + 3 * day, price: 12 }];
  const result = chartPoints(points);
  assert.deepEqual(result.map(p => p.price), [10, 11, null, 12]);
  assert.ok(result[2].timestamp > points[1].timestamp && result[2].timestamp < points[2].timestamp);
  assert.deepEqual(chartPoints(points.slice(0, 2)), points.slice(0, 2));
});

test("recent periods end at the newest shared observation even when history is stale", () => {
  const points = [{ timestamp: start, price: 10 }, { timestamp: start + day, price: 11 }];
  const now = start + 100 * day;
  const latest = start + day;
  assert.deepEqual(timeDomain([points], "7", now), [latest - 7 * day, latest]);
  assert.deepEqual(timeDomain([points], "30", now), [latest - 30 * day, latest]);
  assert.deepEqual(timeDomain([points], "all", now), [start, start + day]);
  assert.deepEqual(timeDomain([[]], "all", now), [now - 30 * day, now]);
  const single = timeDomain([[points[0]]], "all", now);
  assert.ok(single[0] < start && single[1] > start);
});

test("both products share the latest endpoint without shifting an older series forward", () => {
  const older = [{ timestamp: start, price: 10 }];
  const newer = [{ timestamp: start + 20 * day, price: 20 }];
  const now = start + 100 * day;
  const domain = timeDomain([older, [], newer], "7", now);
  assert.deepEqual(domain, [start + 13 * day, start + 20 * day]);
  assert.equal(older.filter(point => point.timestamp >= domain[0] && point.timestamp <= domain[1]).length, 0);
  assert.deepEqual(timeDomain([[], []], "7", now), [now - 7 * day, now]);
  assert.deepEqual(timeDomain([[]], "30", now), [now - 30 * day, now]);
});
