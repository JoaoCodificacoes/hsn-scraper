"use client";

import React, { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { Activity, BellRing, TrendingDown } from "lucide-react";
import { translations } from "@/lib/i18n";

// Types
type HistoryItem = { price: number; date: string };
type ApiData = { evowhey: HistoryItem[]; creatine: HistoryItem[] };

export default function Dashboard() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "pt">("en");

  useEffect(() => {
    // Detect browser language
    if (typeof navigator !== "undefined") {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("pt")) {
        setLang("pt");
      }
    }

    fetch("/api/history")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch history:", err);
        setLoading(false);
      });
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    
    // Group by day and take minimum price
    const grouped: Record<string, { date: string; evowhey?: number; creatine?: number }> = {};
    
    const processSeries = (items: HistoryItem[], key: "evowhey" | "creatine") => {
      items.forEach(item => {
        if (!item.date || !item.price) return;
        const day = item.date.split("T")[0]; // YYYY-MM-DD
        if (!grouped[day]) {
          grouped[day] = { date: day };
        }
        const existingPrice = grouped[day][key];
        if (existingPrice === undefined || item.price < existingPrice) {
          grouped[day][key] = item.price;
        }
      });
    };

    if (data.evowhey) processSeries(data.evowhey, "evowhey");
    if (data.creatine) processSeries(data.creatine, "creatine");

    // Convert to sorted array
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const t = translations[lang];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <Activity className="animate-spin text-emerald-400 w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
              <TrendingDown className="text-emerald-400 w-8 h-8" />
              {t.title}
            </h1>
            <p className="text-zinc-400">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <BellRing className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide">{t.botActive}</span>
          </div>
        </header>

        {/* Chart Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="mb-6 space-y-1">
            <h2 className="text-xl font-semibold text-zinc-100">{t.chartTitle}</h2>
            <p className="text-sm text-zinc-400">{t.chartDesc}</p>
          </div>
          
          <div className="h-[400px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#a1a1aa" 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    tickFormatter={(val) => {
                      try { return format(parseISO(val), "MMM d", { locale: t.dateLocale }) } catch { return val }
                    }}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    tickFormatter={(val) => `€${val}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '8px' }}
                    formatter={(value: any) => [`€${Number(value).toFixed(2)}`, '']}
                    labelFormatter={(label) => {
                      try { return format(parseISO(label as string), "MMMM d, yyyy", { locale: t.dateLocale }) } catch { return label }
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="evowhey" 
                    name="Evowhey" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    dataKey="creatine" 
                    name="Creatine 1Kg" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                <Activity className="w-10 h-10 mb-3 opacity-50" />
                <p>{t.noData}</p>
                <p className="text-sm mt-1">{t.noDataSub}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
