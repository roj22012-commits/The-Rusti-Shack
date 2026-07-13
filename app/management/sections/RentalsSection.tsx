"use client";

import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";
import type { RentalVsSalesRow } from "@/lib/analytics-data";
import { downloadCsv } from "../export";

export default function RentalsSection({ rows }: { rows: RentalVsSalesRow[] }) {
  const bySku = useMemo(() => {
    const m = new Map<string, { sku: string; unitsSold: number; unitsRented: number; saleRevenue: number; rentalRevenue: number }>();
    for (const r of rows) {
      const existing = m.get(r.sku) ?? { sku: r.sku, unitsSold: 0, unitsRented: 0, saleRevenue: 0, rentalRevenue: 0 };
      existing.unitsSold += r.unitsSold;
      existing.unitsRented += r.unitsRented;
      existing.saleRevenue += r.saleRevenue;
      existing.rentalRevenue += r.rentalRevenue;
      m.set(r.sku, existing);
    }
    return Array.from(m.values()).filter((s) => s.unitsRented > 0 || s.unitsSold > 0);
  }, [rows]);

  // Correlation between rental volume and sale volume, per SKU, across
  // months -- a real (if simple) signal for whether renting a SKU tends
  // to go with more or fewer sales of it, not just a guess.
  const correlation = useMemo(() => {
    const pairs = rows.filter((r) => r.unitsRented > 0 || r.unitsSold > 0);
    const n = pairs.length;
    if (n < 2) return 0;
    const xs = pairs.map((p) => p.unitsRented);
    const ys = pairs.map((p) => p.unitsSold);
    const xbar = xs.reduce((a, b) => a + b, 0) / n;
    const ybar = ys.reduce((a, b) => a + b, 0) / n;
    const sxy = xs.reduce((s, x, i) => s + (x - xbar) * (ys[i] - ybar), 0);
    const sxx = Math.sqrt(xs.reduce((s, x) => s + (x - xbar) ** 2, 0));
    const syy = Math.sqrt(ys.reduce((s, y) => s + (y - ybar) ** 2, 0));
    return sxx > 0 && syy > 0 ? sxy / (sxx * syy) : 0;
  }, [rows]);

  const r = Math.round(correlation * 100) / 100;
  const reading =
    r > 0.15
      ? "months and SKUs with more rentals also tend to see more sales -- renting looks like it helps sales, not hurts them"
      : r < -0.15
        ? "months and SKUs with more rentals tend to see fewer sales -- some cannibalization is plausible"
        : "rental and sale volume move mostly independently -- no strong sign either way";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Correlation between renting and selling the same product: {r} — {reading}
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Each dot is one SKU. Position shows how many units it sold vs. rented across the full history; size shows combined revenue.
        </p>
        <div className="mt-4 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
              <XAxis type="number" dataKey="unitsRented" name="Units rented" tick={{ fontSize: 11 }} label={{ value: "Units rented", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis type="number" dataKey="unitsSold" name="Units sold" tick={{ fontSize: 11 }} label={{ value: "Units sold", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <ZAxis type="number" dataKey="saleRevenue" range={[40, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: unknown, name: unknown) => [Number(v), String(name)]}
                labelFormatter={() => ""}
              />
              <Scatter data={bySku} fill="#0e7490" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              "rentals-vs-sales.csv",
              ["SKU", "UnitsSold", "UnitsRented", "SaleRevenue", "RentalRevenue"],
              bySku.map((s) => [s.sku, s.unitsSold, s.unitsRented, s.saleRevenue, s.rentalRevenue])
            )
          }
          className="rounded-full border border-sand-dark px-3 py-1 text-xs font-medium text-foreground/70 hover:border-ocean-dark"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
