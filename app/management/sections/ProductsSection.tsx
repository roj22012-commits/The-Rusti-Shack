"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ProductPerformance } from "@/lib/analytics-data";
import { downloadCsv } from "../export";

const CATEGORY_COLORS: Record<string, string> = {
  Apparel: "#0e7490",
  "Snorkel & Dive": "#14b8a6",
  "Beach Essentials": "#d9a441",
  Surfing: "#f0653f",
  Fishing: "#164e63",
  Unknown: "#9ca3af",
};

export default function ProductsSection({ products }: { products: ProductPerformance[] }) {
  const [sortBy, setSortBy] = useState<"margin" | "marginPct" | "revenue">("margin");

  const sorted = useMemo(() => [...products].sort((a, b) => (b[sortBy] ?? -Infinity) - (a[sortBy] ?? -Infinity)), [products, sortBy]);
  const top15 = sorted.slice(0, 15);
  const bottom10 = [...products].filter((p) => p.marginPct !== null).sort((a, b) => (a.marginPct ?? 0) - (b.marginPct ?? 0)).slice(0, 10);

  const title =
    sortBy === "margin"
      ? `${top15[0]?.productName ?? ""} earns the most total profit, ${sortBy === "margin" ? "" : ""}but check the margin-% view for what's most efficient per dollar sold`
      : sortBy === "marginPct"
        ? `${top15[0]?.productName ?? ""} keeps the highest share of every dollar it sells`
        : `${top15[0]?.productName ?? ""} is the top seller by revenue`;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <div className="flex gap-2">
            {(["margin", "marginPct", "revenue"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${sortBy === s ? "bg-ocean-dark text-white" : "bg-sand text-foreground/70"}`}
              >
                {s === "margin" ? "Total margin" : s === "marginPct" ? "Margin %" : "Revenue"}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  "product-performance.csv",
                  ["SKU", "Product", "Category", "UnitsSold", "Revenue", "Cost", "Margin", "MarginPct"],
                  products.map((p) => [p.sku, p.productName, p.category, p.unitsSold, p.revenue, p.cost, p.margin, p.marginPct ?? ""])
                )
              }
              className="rounded-full border border-sand-dark px-3 py-1 text-xs font-medium text-foreground/70 hover:border-ocean-dark"
            >
              Export CSV
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-foreground/50">Top 15 products, once cost of goods is factored in.</p>
        <div className="mt-4 h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top15} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
              <XAxis type="number" tickFormatter={(v) => (sortBy === "marginPct" ? `${v}%` : `$${(v / 1000).toFixed(0)}k`)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="productName" width={180} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => (sortBy === "marginPct" ? `${Number(v)}%` : `$${Math.round(Number(v)).toLocaleString()}`)} />
              <Bar dataKey={sortBy} radius={[0, 4, 4, 0]}>
                {top15.map((p) => (
                  <Cell key={p.sku} fill={CATEGORY_COLORS[p.category] ?? "#9ca3af"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          The 10 lowest-margin products (may look busy but earn the least per sale)
        </h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-sand-dark/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-sand/60 text-foreground/70">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 text-right font-medium">Units sold</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
                <th className="px-3 py-2 text-right font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {bottom10.map((p) => (
                <tr key={p.sku} className="border-t border-sand-dark/40">
                  <td className="px-3 py-2">{p.productName}</td>
                  <td className="px-3 py-2 text-right">{p.unitsSold}</td>
                  <td className="px-3 py-2 text-right">${Math.round(p.revenue).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{p.marginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
