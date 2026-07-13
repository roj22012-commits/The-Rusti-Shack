"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { CustomerSummaryRow } from "@/lib/analytics-data";
import { downloadCsv } from "../export";

const COLORS = ["#0e7490", "#f0653f", "#d9a441", "#14b8a6", "#164e63", "#9ca3af"];

export default function CustomersSection({ customers }: { customers: CustomerSummaryRow[] }) {
  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of customers) m.set(c.customerType, (m.get(c.customerType) ?? 0) + 1);
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [customers]);

  const byCountry = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of customers) m.set(c.country ?? "Unknown", (m.get(c.country ?? "Unknown") ?? 0) + 1);
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [customers]);

  const repeatCount = customers.filter((c) => c.orderCount > 1).length;
  const oneTimeCount = customers.filter((c) => c.orderCount === 1).length;
  const neverOrdered = customers.filter((c) => c.orderCount === 0).length;
  const repeatRate = customers.length > 0 ? Math.round((repeatCount / (repeatCount + oneTimeCount)) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Repeat customer rate" value={`${repeatRate}%`} sub={`${repeatCount} of ${repeatCount + oneTimeCount} buyers come back`} />
        <StatCard label="One-time buyers" value={String(oneTimeCount)} />
        <StatCard label="Never purchased" value={String(neverOrdered)} sub="On file but no orders yet" />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {byType.sort((a, b) => b.value - a.value)[0]?.name ?? ""} customers make up the largest segment
          </h3>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Where her customers are located</h3>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCountry} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0e7490" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              "customers.csv",
              ["CustomerID", "Type", "Country", "JoinDate", "LoyaltyMember", "OrderCount", "LifetimeRevenue", "LastOrderDate"],
              customers.map((c) => [c.customerId, c.customerType, c.country, c.joinDate, c.loyaltyMember ? "Yes" : "No", c.orderCount, c.lifetimeRevenue, c.lastOrderDate ?? ""])
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-sand-dark/60 bg-sand/40 p-4">
      <p className="text-xs uppercase tracking-wide text-foreground/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-foreground/50">{sub}</p>}
    </div>
  );
}
