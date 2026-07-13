"use client";

import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ChartSpec } from "@/lib/gemini";

const COLORS = ["#0e7490", "#f0653f", "#d9a441", "#14b8a6", "#164e63", "#9ca3af", "#7c9a92", "#c2703d"];

export default function AssistantChart({ chart }: { chart: ChartSpec }) {
  if (chart.type === "number") {
    return (
      <div className="mt-3 flex flex-wrap gap-3">
        {chart.data.map((d) => (
          <div key={d.label} className="rounded-xl border border-sand-dark/60 bg-sand/40 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-foreground/50">{d.label}</p>
            <p className="text-xl font-bold text-foreground">{d.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 h-64 w-full rounded-xl border border-sand-dark/60 bg-white p-2">
      <p className="px-2 pt-1 text-xs font-semibold text-foreground/70">{chart.title}</p>
      <ResponsiveContainer width="100%" height="90%">
        {chart.type === "pie" ? (
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="label" outerRadius={80} label>
              {chart.data.map((d, i) => (
                <Cell key={d.label} fill={d.color ?? COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : chart.type === "line" ? (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line dataKey="value" stroke="#0e7490" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        ) : (
          <BarChart data={chart.data} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chart.data.map((d, i) => (
                <Cell key={d.label} fill={d.color ?? COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
