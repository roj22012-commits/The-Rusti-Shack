"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SeasonalRow } from "@/lib/analytics-data";
import { downloadCsv } from "../export";

// Season lengths in calendar months, needed to compare seasons fairly --
// Typhoon (Jun-Nov) spans 6 months and Shoulder (May) spans 1, so raw
// totals would make Typhoon look busiest by sheer month count alone, not
// because it actually sells more per month. Comparing monthly averages is
// the honest read.
const SEASON_MONTHS: Record<string, number> = { "Dry Peak": 5, Shoulder: 1, Typhoon: 6 };
const SEASON_ORDER = ["Dry Peak", "Shoulder", "Typhoon"];

export default function SeasonalitySection({ rows }: { rows: SeasonalRow[] }) {
  const bySeason = useMemo(() => {
    const m = new Map<string, { season: string; revenue: number; margin: number; years: Set<number> }>();
    for (const r of rows) {
      const existing = m.get(r.season) ?? { season: r.season, revenue: 0, margin: 0, years: new Set<number>() };
      existing.revenue += r.revenue;
      existing.margin += r.margin;
      existing.years.add(r.year);
      m.set(r.season, existing);
    }
    return SEASON_ORDER.map((s) => m.get(s))
      .filter((s): s is { season: string; revenue: number; margin: number; years: Set<number> } => !!s)
      .map((s) => {
        const monthsObserved = SEASON_MONTHS[s.season] * s.years.size;
        return {
          season: s.season,
          revenue: monthsObserved > 0 ? Math.round(s.revenue / monthsObserved) : 0,
          margin: monthsObserved > 0 ? Math.round(s.margin / monthsObserved) : 0,
        };
      });
  }, [rows]);

  const best = [...bySeason].sort((a, b) => b.revenue - a.revenue)[0];
  const worst = [...bySeason].sort((a, b) => a.revenue - b.revenue)[0];
  const lift = best && worst && worst.revenue > 0 ? Math.round(((best.revenue - worst.revenue) / worst.revenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {best ? `A typical ${best.season} month brings in about ${lift}% more revenue than a typical ${worst.season} month` : "Seasonality"}
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Average revenue and margin per calendar month within each season (not a raw total, since
          Typhoon runs 6 months, Dry Peak 5, and Shoulder just 1). Apo Island&apos;s three seasons:
          Dry Peak (Dec&ndash;Apr), Shoulder (May), Typhoon (Jun&ndash;Nov).
        </p>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySeason}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => `$${Math.round(Number(v)).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="revenue" fill="#0e7490" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="margin" fill="#f0653f" name="Margin" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => downloadCsv("seasonality.csv", ["Season", "Year", "Revenue", "Margin"], rows.map((r) => [r.season, r.year, r.revenue, r.margin]))}
          className="rounded-full border border-sand-dark px-3 py-1 text-xs font-medium text-foreground/70 hover:border-ocean-dark"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
