export type Observation = { timestamp: number; price: number };
export type ChartPoint = { timestamp: number; price: number | null };
export type Period = "7" | "30" | "all";

const DAY = 86_400_000;
const cents = (value: number) => Math.round(value * 100) / 100;

export function normalizeHistory(input: unknown): Observation[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item): Observation[] => {
    if (!item || typeof item.date !== "string" || typeof item.price !== "number") return [];
    const timestamp = Date.parse(item.date);
    const price = cents(item.price);
    return Number.isFinite(timestamp) && Number.isFinite(price) && price > 0
      ? [{ timestamp, price }] : [];
  }).sort((a, b) => a.timestamp - b.timestamp);
}

// Inputs are chronological observations returned by normalizeHistory.
export function summarize(points: Observation[]) {
  if (!points.length) return null;
  const prices = points.map(point => point.price).sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[middle] : cents((prices[middle - 1] + prices[middle]) / 2);
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  return {
    latest, low: prices[0], median,
    aboveLow: ((latest.price - prices[0]) / prices[0]) * 100,
    change: previous ? cents(latest.price - previous.price) : null,
  };
}

export function chartPoints(points: Observation[]): ChartPoint[] {
  return points.flatMap((point, index): ChartPoint[] => {
    const next = points[index + 1];
    // Stop at the last known observation across missed collection windows.
    return next && next.timestamp - point.timestamp > 36 * 3_600_000
      ? [point, { timestamp: point.timestamp + 1, price: null }]
      : [point];
  });
}

export function timeDomain(series: Observation[][], period: Period, now: number): [number, number] {
  const timestamps = series.flatMap(points => points.map(point => point.timestamp));
  if (!timestamps.length) return [now - (period === "all" ? 30 : Number(period)) * DAY, now];
  const last = Math.max(...timestamps);
  if (period !== "all") return [last - Number(period) * DAY, last];
  const first = Math.min(...timestamps);
  return first === last ? [first - DAY / 2, last + DAY / 2] : [first, last];
}
