"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyPerformance } from "@/lib/analytics-data";
import { FORECAST_MODELS, runForecastModel, type ForecastModelId } from "@/lib/forecast";
import InfoButton from "../InfoButton";
import { downloadCsv } from "../export";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTH_NAMES[Number(mo)]} '${y.slice(2)}`;
}

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function HistoricalsForecastSection({
  monthly,
  selectedYear,
}: {
  monthly: MonthlyPerformance[];
  selectedYear: number | "all";
}) {
  const [metric, setMetric] = useState<"revenue" | "margin">("revenue");
  const [model, setModel] = useState<ForecastModelId>("seasonal");
  const [horizon, setHorizon] = useState(6);

  // Forecasts are always computed from the FULL history (a model needs the
  // whole trend/season shape), but the chart's visible window follows the
  // year slicer, same as every other view on the page.
  const fullHistory = useMemo(
    () => monthly.map((m) => ({ year: m.year, monthNum: m.monthNum, value: metric === "revenue" ? m.revenue : m.margin })),
    [monthly, metric]
  );

  const { fitted, forecast } = useMemo(
    () => runForecastModel(model, fullHistory, horizon),
    [model, fullHistory, horizon]
  );

  const chartData = useMemo(() => {
    const rows: { month: string; actual: number | null; yhat: number | null; lower: number | null; band: number | null }[] = [];
    for (let i = 0; i < monthly.length; i++) {
      const m = monthly[i];
      if (selectedYear !== "all" && m.year !== selectedYear) continue;
      const f = fitted[i];
      rows.push({
        month: m.month,
        actual: metric === "revenue" ? m.revenue : m.margin,
        yhat: null,
        lower: null,
        band: null,
      });
      void f;
    }
    for (const f of forecast) {
      rows.push({ month: f.month, actual: null, yhat: f.yhat, lower: f.lower, band: f.upper - f.lower });
    }
    // bridge: connect the last actual point to the first forecast point
    if (rows.length > 0) {
      const lastActualIdx = [...rows].reverse().findIndex((r) => r.actual !== null);
      if (lastActualIdx !== -1) {
        const idx = rows.length - 1 - lastActualIdx;
        rows[idx] = { ...rows[idx], yhat: rows[idx].actual };
      }
    }
    return rows;
  }, [monthly, fitted, forecast, selectedYear, metric]);

  const years = useMemo(() => Array.from(new Set(monthly.map((m) => m.year))).sort(), [monthly]);

  const title = useMemo(() => {
    const metricLabel = metric === "revenue" ? "Revenue" : "Margin";
    if (selectedYear === "all" && years.length >= 2) {
      const firstYear = years[0];
      const lastYear = years[years.length - 1];
      const firstYearTotal = monthly.filter((m) => m.year === firstYear).reduce((s, m) => s + (metric === "revenue" ? m.revenue : m.margin), 0);
      const lastYearTotal = monthly.filter((m) => m.year === lastYear).reduce((s, m) => s + (metric === "revenue" ? m.revenue : m.margin), 0);
      const pct = firstYearTotal > 0 ? Math.round(((lastYearTotal - firstYearTotal) / firstYearTotal) * 100) : 0;
      const direction = pct >= 0 ? "grown" : "fallen";
      return `${metricLabel} has ${direction} ${Math.abs(pct)}% from ${firstYear} to ${lastYear}, with a recurring seasonal swing every year`;
    }
    if (selectedYear !== "all") {
      const thisYear = monthly.filter((m) => m.year === selectedYear);
      const prevYear = monthly.filter((m) => m.year === selectedYear - 1);
      const thisTotal = thisYear.reduce((s, m) => s + (metric === "revenue" ? m.revenue : m.margin), 0);
      const prevTotal = prevYear.reduce((s, m) => s + (metric === "revenue" ? m.revenue : m.margin), 0);
      const peak = thisYear.reduce((best, m) => ((metric === "revenue" ? m.revenue : m.margin) > (metric === "revenue" ? best.revenue : best.margin) ? m : best), thisYear[0]);
      const peakLabel = peak ? MONTH_NAMES[peak.monthNum] : "";
      if (prevTotal > 0) {
        const pct = Math.round(((thisTotal - prevTotal) / prevTotal) * 100);
        const direction = pct >= 0 ? "up" : "down";
        return `${selectedYear} ${metricLabel.toLowerCase()} is ${direction} ${Math.abs(pct)}% vs. ${selectedYear - 1}, peaking in ${peakLabel}`;
      }
      return `${selectedYear} ${metricLabel.toLowerCase()} peaked in ${peakLabel}`;
    }
    return `${metricLabel} over time`;
  }, [monthly, metric, selectedYear, years]);

  const modelInfo = FORECAST_MODELS.find((m) => m.id === model)!;
  const lastForecast = forecast[forecast.length - 1];

  const forecastTitle = lastForecast
    ? `The ${modelInfo.label.toLowerCase()} model projects ${metric} of about ${fmtMoney(lastForecast.yhat)} by ${formatMonth(lastForecast.month)} (likely between ${fmtMoney(Math.max(0, lastForecast.lower))} and ${fmtMoney(lastForecast.upper)})`
    : "";

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMetric("revenue")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${metric === "revenue" ? "bg-ocean-dark text-white" : "bg-sand text-foreground/70"}`}
            >
              Revenue
            </button>
            <button
              type="button"
              onClick={() => setMetric("margin")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${metric === "margin" ? "bg-ocean-dark text-white" : "bg-sand text-foreground/70"}`}
            >
              Margin
            </button>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  "monthly-performance.csv",
                  ["Month", "Revenue", "Cost", "Margin", "Orders", "UnitsSold"],
                  monthly.map((m) => [m.month, m.revenue, m.cost, m.margin, m.orderCount, m.unitsSold])
                )
              }
              className="rounded-full border border-sand-dark px-3 py-1 text-xs font-medium text-foreground/70 hover:border-ocean-dark"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(l) => formatMonth(String(l))}
                formatter={(value: unknown, name: unknown) => [fmtMoney(Number(value)), String(name)]}
              />
              <Legend />
              <Area dataKey="lower" stackId="band" stroke="none" fill="transparent" legendType="none" />
              <Area
                dataKey="band"
                stackId="band"
                stroke="none"
                fill="#0e7490"
                fillOpacity={0.12}
                name="Forecast range"
              />
              <Line dataKey="actual" stroke="#0e7490" strokeWidth={2.5} dot={false} name="Actual" connectNulls={false} />
              <Line
                dataKey="yhat"
                stroke="#f0653f"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="Forecast"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-sand-dark/60 bg-sand/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">{forecastTitle}</h3>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FORECAST_MODELS.map((m) => (
            <span key={m.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setModel(m.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  model === m.id ? "bg-ocean-dark text-white" : "bg-white text-foreground/70 border border-sand-dark"
                }`}
              >
                {m.label} <span className="opacity-70">&middot; {m.typicalError}</span>
              </button>
              {model === m.id && (
                <InfoButton title={m.label}>
                  <p>{m.explanation}</p>
                </InfoButton>
              )}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label htmlFor="horizon" className="text-xs font-medium text-foreground/70">
            Forecast horizon: {horizon} month{horizon === 1 ? "" : "s"}
          </label>
          <input
            id="horizon"
            type="range"
            min={1}
            max={18}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="w-48"
          />
        </div>
      </div>
    </div>
  );
}
