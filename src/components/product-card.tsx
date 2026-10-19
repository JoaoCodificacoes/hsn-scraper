"use client";

import { ArrowDownRight, ArrowUpRight, ArrowRight, FlaskConical, Package, Minus, Clock3 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Product } from "@/lib/config";
import { chartPoints, summarize, type Observation } from "@/lib/history";
import type { Copy } from "@/lib/i18n";

type Props = { product: Product; index: number; points: Observation[]; domain: [number, number]; t: Copy; now: number };

export function ProductCard({ product, index, points, domain, t, now }: Props) {
  const stats = summarize(points);
  const visible = points.filter(point => point.timestamp >= domain[0] && point.timestamp <= domain[1]);
  const rangeStats = summarize(visible);
  const data = chartPoints(visible);
  const protein = product.id === "evowhey";
  const name = protein ? t.evowheyName : t.creatineName;
  const color = protein ? "#b9ec86" : "#b9adff";
  const money = (price: number) => new Intl.NumberFormat(t.locale, { style: "currency", currency: "EUR" }).format(price);
  const date = (timestamp: number, full = false) => new Intl.DateTimeFormat(t.locale, full ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : { day: "numeric", month: "short" }).format(timestamp);
  const stale = stats && now - stats.latest.timestamp > 48 * 3_600_000;
  const change = stats?.change;
  const ChangeIcon = change == null || change === 0 ? Minus : change < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <article className={`product-card ${protein ? "protein-card" : "creatine-card"}`} aria-labelledby={`product-${product.id}`}>
      <div className="product-summary">
        <div className="product-category"><span className="product-icon">{protein ? <Package size={20} /> : <FlaskConical size={20} />}</span><span>{protein ? t.sport : t.raw}</span><span className="product-index">0{index + 1}</span></div>
        <h3 id={`product-${product.id}`}>{name}</h3>
        <p className="product-description">{protein ? t.protein : t.creatine}<span>·</span>{protein ? "2 kg" : "1 kg"}</p>
        <div className="latest-price"><p>{t.latest}</p><strong>{stats ? money(stats.latest.price) : "—"}</strong>{stats && <span>{money(stats.latest.price / (protein ? 2 : 1))} {t.perKg}</span>}</div>
        {stats && <div className={`price-position ${stats.aboveLow === 0 ? "at-low" : ""}`}><span className="tiny-dot" />{stats.aboveLow === 0 ? t.atLow : `${new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 }).format(stats.aboveLow)}% ${t.aboveLow}`}</div>}
        <a className="product-link" href={product.url} target="_blank" rel="noreferrer">{t.viewProduct}<ArrowUpRight size={15} /></a>
      </div>

      <div className="product-chart-panel">
        <div className="chart-topline"><div className="chart-legend"><span><i style={{ background: color }} />{t.recorded}</span><span><i className="legend-dashed" />{t.median}</span></div><div className={`last-change ${change != null && change < 0 ? "price-down" : ""}`}><ChangeIcon size={14} />{change == null ? t.firstCheck : change === 0 ? t.unchanged : `${change > 0 ? "+" : "−"}${money(Math.abs(change))} ${t.sinceCheck}`}</div></div>
        {visible.length > 0 && rangeStats ? <div className="price-chart" role="img" aria-label={`${name}: ${t.recorded}. ${t.recordLow}: ${money(rangeStats.low)}. ${t.typical}: ${money(rangeStats.median)}.`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 4 }} accessibilityLayer>
              <CartesianGrid stroke="#2b3030" strokeDasharray="2 5" vertical={false} />
              <XAxis dataKey="timestamp" type="number" domain={domain} scale="time" tickCount={6} tickFormatter={value => date(Number(value))} tick={{ fill: "#929b97", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} tickMargin={12} />
              <YAxis domain={([min, max]: readonly [number, number]) => { const padding = Math.max((max - min) * 0.18, 1); return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)]; }} tickFormatter={value => `€${value}`} tick={{ fill: "#929b97", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickCount={4} />
              <Tooltip filterNull content={({ active, payload }) => {
                const point = payload?.[0]?.payload as Observation | undefined;
                return active && point?.price != null ? <div className="chart-tooltip"><span>{date(point.timestamp, true)}</span><strong style={{ color }}>{money(point.price)}</strong><span>{name}</span></div> : null;
              }} cursor={{ stroke: "#737d76", strokeDasharray: "3 3" }} />
              <ReferenceLine y={rangeStats.median} stroke="#818a84" strokeDasharray="5 5" />
              <ReferenceLine y={rangeStats.low} stroke={color} strokeOpacity={0.25} strokeDasharray="2 4" />
              <Line type="stepAfter" dataKey="price" name={name} stroke={color} strokeWidth={2.2} connectNulls={false} isAnimationActive={false} dot={{ fill: color, strokeWidth: 0, r: 1.8 }} activeDot={{ r: 5, fill: color, stroke: "#17201a", strokeWidth: 3 }} />
              {stats && stats.latest.timestamp >= domain[0] && stats.latest.timestamp <= domain[1] && <ReferenceDot x={stats.latest.timestamp} y={stats.latest.price} r={4} fill={color} stroke="#191f1b" strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
        </div> : <div className="chart-empty"><Clock3 size={26} /><strong>{points.length ? t.periodEmpty : t.empty}</strong><span>{points.length ? t.periodEmptySub : t.emptySub}</span></div>}
        <div className="chart-bottomline"><div><span>{t.recordLow}</span><strong>{stats ? money(stats.low) : "—"}</strong><ArrowDownRight size={15} /></div><p className={stale ? "stale-timestamp" : ""}><Clock3 size={12} />{t.checked}: {stats ? date(stats.latest.timestamp, true) : "—"}</p></div>
        {visible.length > 0 && <details className="history-values"><summary>{t.dataTable}<ArrowRight size={12} /></summary><div className="table-scroll"><table><caption className="sr-only">{name} — {t.recorded}</caption><thead><tr><th scope="col">{t.time}</th><th scope="col">{t.price}</th></tr></thead><tbody>{visible.map((point, i) => <tr key={`${point.timestamp}-${i}`}><td>{date(point.timestamp, true)}</td><td>{money(point.price)}</td></tr>)}</tbody></table></div></details>}
      </div>
    </article>
  );
}
