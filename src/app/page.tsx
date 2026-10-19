"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, Bell, Check, ChevronRight, Clock3, RefreshCw, TrendingDown } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { PRODUCTS } from "@/lib/config";
import { normalizeHistory, timeDomain, type Observation, type Period } from "@/lib/history";
import { translations, type Language } from "@/lib/i18n";

const DISCORD_URL = "https://discord.com/oauth2/authorize?client_id=1521296678638846074";
type History = Record<string, Observation[]>;

export default function Dashboard() {
  const [data, setData] = useState<History>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [lang, setLang] = useState<Language>("en");
  const [period, setPeriod] = useState<Period>("all");
  const [request, setRequest] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("hsn-language"); } catch { /* Browser storage can be disabled. */ }
      setLang(saved === "pt" || saved === "en" ? saved : navigator.language.startsWith("pt") ? "pt" : "en");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let disposed = false;
    async function load() {
      try {
        const response = await fetch("/api/history", { signal: controller.signal });
        const json = await response.json();
        if (!response.ok || !json.success || !json.data || typeof json.data !== "object") throw new Error("History unavailable");
        const history = Object.fromEntries(PRODUCTS.map(product => [product.id, normalizeHistory(json.data[product.id])]));
        if (!disposed) { setData(history); setNow(Date.now()); setStatus("ready"); }
      } catch {
        if (!disposed) setStatus("error");
      } finally { clearTimeout(timeout); }
    }
    void load();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [request]);

  const t = translations[lang];
  const domain = useMemo(() => timeDomain(Object.values(data), period, now), [data, period, now]);
  const count = Object.values(data).reduce((total, points) => total + points.length, 0);
  const isStale = Object.values(data).some(points => points.length > 0 && now - points[points.length - 1].timestamp > 48 * 3_600_000);
  const formatCount = new Intl.NumberFormat(t.locale);

  function changeLanguage(language: Language) {
    setLang(language);
    try { localStorage.setItem("hsn-language", language); } catch { /* Keep the control usable without storage. */ }
  }

  return (
    <div className="dashboard">
      <a href="#prices" className="skip-link">{t.overview}</a>
      <header className="site-header shell">
        <a href="#" className="brand" aria-label="HSN Price Tracker">
          <span className="brand-icon"><TrendingDown size={22} strokeWidth={2.5} /></span>
          <span>HSN<span className="brand-light"> / price tracker</span></span>
        </a>
        <nav className="header-nav" aria-label={t.overview}>
          <a href="#prices">{t.overview}</a><a href="#alerts">{t.howItWorks}</a>
        </nav>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label={t.language}>
            {(["en", "pt"] as const).map(language => <button key={language} onClick={() => changeLanguage(language)} aria-pressed={lang === language}>{language.toUpperCase()}</button>)}
          </div>
          <a className="button button-small" href={DISCORD_URL} target="_blank" rel="noreferrer"><Bell size={15} /><span>{t.alerts}</span><ArrowRight size={15} /></a>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="tiny-dot" />{t.eyebrow}</p>
            <h1>{t.title}<ArrowDownRight aria-hidden="true" /></h1>
            <p className="hero-description">{t.subtitle}</p>
          </div>
          <div className="hero-facts">
            <div><span>{t.tracking}</span><strong>02<span className="fact-dot">.</span></strong></div>
            <div><span>{t.observations}</span><strong>{status === "ready" ? formatCount.format(count) : "—"}<span className="fact-dot">.</span></strong></div>
          </div>
        </section>

        <section id="prices" className="prices-section" aria-labelledby="prices-heading">
          <div className="section-heading">
            <div><p className="eyebrow muted">01 / {t.overview}</p><h2 id="prices-heading">{t.history}</h2><p>{t.historySub}</p></div>
            <div className="period-switch" role="group" aria-label={t.rangeLabel}>
              {([["7", t.sevenDays], ["30", t.thirtyDays], ["all", t.allTime]] as const).map(([value, label]) => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
            </div>
          </div>

          {status === "ready" && isStale && <div className="freshness-notice" role="status"><Clock3 size={17} /><strong>{t.stale}</strong><span>{t.staleSub}</span></div>}
          {status === "error" ? <div className="page-state" role="alert"><RefreshCw size={28} /><h3>{t.error}</h3><p>{t.errorSub}</p><button className="button" onClick={() => { setStatus("loading"); setRequest(value => value + 1); }}>{t.retry}<ArrowRight size={16} /></button></div> :
            <div className="product-list" aria-busy={status === "loading"}>
              {status === "loading" ? <><p className="sr-only" role="status">{t.loading}</p>{PRODUCTS.map(product => <div key={product.id} className="product-skeleton"><div /><div /><div /></div>)}</> :
                PRODUCTS.map((product, index) => <ProductCard key={product.id} product={product} index={index} points={data[product.id] ?? []} domain={domain} t={t} now={now} />)}
            </div>}
          <div className="chart-footnotes"><p>{t.chartNote}</p><p>{t.medianNote}</p></div>
          <div className="source-line"><span><span className="tiny-dot" />{t.source}</span><span>{t.currency}</span></div>
        </section>

        <section className="alert-panel" id="alerts" aria-labelledby="alerts-heading">
          <div className="alert-copy"><span className="alert-icon"><Bell size={24} /></span><p className="eyebrow">{t.alertEyebrow}</p><h2 id="alerts-heading">{t.alertTitle}</h2><p>{t.alertSub}</p><a className="button" href={DISCORD_URL} target="_blank" rel="noreferrer">{t.alerts}<ArrowRight size={17} /></a></div>
          <ol className="alert-steps">{[t.stepOne, t.stepTwo, t.stepThree].map((step, index) => <li key={step}><span className="step-number">0{index + 1}</span><span>{step}</span>{index === 2 ? <Check size={17} /> : <ChevronRight size={17} />}</li>)}</ol>
        </section>
      </main>
      <footer className="site-footer shell"><span>{t.footer}</span><span>{t.footerNote}</span></footer>
    </div>
  );
}
