"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PromoPerformanceRow } from "@/lib/analytics-data";
import { downloadCsv } from "../export";

export default function PromotionsSection({ promos }: { promos: PromoPerformanceRow[] }) {
  const ranked = useMemo(
    () =>
      [...promos]
        .map((p) => ({ ...p, netLift: p.revenueFromOrders - p.totalDiscount }))
        .sort((a, b) => b.netLift - a.netLift)
        .slice(0, 15),
    [promos]
  );
  const best = ranked[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {best ? `${best.promoName} drove the most net revenue after its own discount cost` : "Promotion performance"}
        </h2>
        <p className="mt-1 text-xs text-foreground/50">
          Revenue on orders that used the code, next to the discount those orders received.
        </p>
        <div className="mt-4 h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ranked} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="promoName" width={160} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => `$${Math.round(Number(v)).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="revenueFromOrders" fill="#0e7490" name="Revenue on those orders" radius={[0, 4, 4, 0]} />
              <Bar dataKey="totalDiscount" fill="#f0653f" name="Discount given" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              "promotions.csv",
              ["PromoCode", "PromoName", "Type", "OrdersUsing", "TotalDiscount", "RevenueFromOrders"],
              promos.map((p) => [p.promoCode, p.promoName, p.promoType, p.ordersUsing, p.totalDiscount, p.revenueFromOrders])
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
