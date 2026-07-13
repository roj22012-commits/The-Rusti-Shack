import { cookies } from "next/headers";
import type { Metadata } from "next";
import { MANAGER_COOKIE_NAME, verifySessionCookieValue } from "@/lib/manager-auth";
import { getDashboardStats, getRecentOrders } from "@/lib/manager-data";
import {
  getMonthlyPerformance,
  getProductPerformance,
  getInventoryReorderView,
  REORDER_METHODOLOGY,
  getCustomerSummary,
  getPromoPerformance,
  getStaffPerformance,
  getSeasonalPerformance,
  getRentalVsSales,
} from "@/lib/analytics-data";
import LoginForm from "./LoginForm";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ManagementPage() {
  const jar = await cookies();
  const session = jar.get(MANAGER_COOKIE_NAME)?.value;
  const authed = verifySessionCookieValue(session);

  if (!authed) {
    return <LoginForm />;
  }

  const [
    stats,
    recentOrders,
    monthly,
    products,
    inventory,
    customers,
    promos,
    staff,
    seasonal,
    rentalVsSales,
  ] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(20),
    getMonthlyPerformance(),
    getProductPerformance(),
    getInventoryReorderView(),
    getCustomerSummary(),
    getPromoPerformance(),
    getStaffPerformance(),
    getSeasonalPerformance(),
    getRentalVsSales(),
  ]);

  return (
    <Dashboard
      stats={stats}
      recentOrders={recentOrders}
      monthly={monthly}
      products={products}
      inventory={inventory}
      reorderMethodology={REORDER_METHODOLOGY}
      customers={customers}
      promos={promos}
      staff={staff}
      seasonal={seasonal}
      rentalVsSales={rentalVsSales}
    />
  );
}
