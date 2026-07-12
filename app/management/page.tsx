import { cookies } from "next/headers";
import type { Metadata } from "next";
import { MANAGER_COOKIE_NAME, verifySessionCookieValue } from "@/lib/manager-auth";
import { getDashboardStats, getRecentOrders } from "@/lib/manager-data";
import LoginForm from "./LoginForm";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const jar = await cookies();
  const session = jar.get(MANAGER_COOKIE_NAME)?.value;
  const authed = verifySessionCookieValue(session);

  if (!authed) {
    return <LoginForm />;
  }

  const [stats, recentOrders] = await Promise.all([getDashboardStats(), getRecentOrders(20)]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Manager dashboard</h1>
        <LogoutButton />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Orders, last 7 days" value={String(stats.last7DaysOrderCount)} />
        <StatCard label="Revenue, last 7 days" value={`$${stats.last7DaysRevenue.toFixed(2)}`} />
        <StatCard
          label="Best seller"
          value={stats.bestSeller ? stats.bestSeller.name : "—"}
          sub={stats.bestSeller ? `${stats.bestSeller.qty} sold` : undefined}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent orders</h2>
        <a
          href="/api/manager/csv"
          className="rounded-full bg-ocean-dark px-5 py-2 text-sm font-semibold text-white"
        >
          Download sales (CSV)
        </a>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-sand-dark/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand/60 text-foreground/70">
            <tr>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Country</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-foreground/50">
                  No orders yet.
                </td>
              </tr>
            )}
            {recentOrders.map((o) => (
              <tr key={o.orderId} className="border-t border-sand-dark/40">
                <td className="px-4 py-2 font-medium text-ocean-dark">{o.orderId}</td>
                <td className="px-4 py-2">{o.date}</td>
                <td className="px-4 py-2">{o.customerName}</td>
                <td className="px-4 py-2">{o.country}</td>
                <td className="px-4 py-2 text-right">${o.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
