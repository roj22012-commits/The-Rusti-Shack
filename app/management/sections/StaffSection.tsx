"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { StaffPerformanceRow } from "@/lib/analytics-data";
import { downloadCsv } from "../export";

export default function StaffSection({ staff }: { staff: StaffPerformanceRow[] }) {
  const sorted = [...staff].sort((a, b) => b.orderRevenue + b.rentalRevenue - (a.orderRevenue + a.rentalRevenue));
  const top = sorted[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {top ? `${top.employeeName} (${top.role}) has rung up the most total revenue` : "Staff performance"}
        </h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ded0" />
              <XAxis dataKey="employeeName" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => `$${Math.round(Number(v)).toLocaleString()}`} />
              <Bar dataKey="orderRevenue" stackId="a" fill="#0e7490" name="Order revenue" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rentalRevenue" stackId="a" fill="#14b8a6" name="Rental revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              "staff-performance.csv",
              ["EmpID", "Name", "Role", "OrdersHandled", "OrderRevenue", "RentalsHandled", "RentalRevenue"],
              staff.map((s) => [s.empId, s.employeeName, s.role, s.ordersHandled, s.orderRevenue, s.rentalsHandled, s.rentalRevenue])
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
