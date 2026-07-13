"use client";

import { useMemo, useState } from "react";
import type { DashboardStats, RecentOrderRow } from "@/lib/manager-data";
import type {
  MonthlyPerformance,
  ProductPerformance,
  InventoryRow,
  CustomerSummaryRow,
  PromoPerformanceRow,
  StaffPerformanceRow,
  SeasonalRow,
  RentalVsSalesRow,
} from "@/lib/analytics-data";
import LogoutButton from "./LogoutButton";
import YearSlicer from "./YearSlicer";
import OverviewSection from "./sections/OverviewSection";
import HistoricalsForecastSection from "./sections/HistoricalsForecastSection";
import InventorySection from "./sections/InventorySection";
import ProductsSection from "./sections/ProductsSection";
import CustomersSection from "./sections/CustomersSection";
import RentalsSection from "./sections/RentalsSection";
import PromotionsSection from "./sections/PromotionsSection";
import StaffSection from "./sections/StaffSection";
import SeasonalitySection from "./sections/SeasonalitySection";

const TABS = [
  "Overview",
  "Historicals & Forecast",
  "Inventory",
  "Products",
  "Customers",
  "Rentals vs. Sales",
  "Promotions",
  "Staff",
  "Seasonality",
] as const;
type Tab = (typeof TABS)[number];

export default function Dashboard(props: {
  stats: DashboardStats;
  recentOrders: RecentOrderRow[];
  monthly: MonthlyPerformance[];
  products: ProductPerformance[];
  inventory: InventoryRow[];
  reorderMethodology: { leadTimeDays: number; serviceLevelZ: number; lookbackDays: number };
  customers: CustomerSummaryRow[];
  promos: PromoPerformanceRow[];
  staff: StaffPerformanceRow[];
  seasonal: SeasonalRow[];
  rentalVsSales: RentalVsSalesRow[];
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [year, setYear] = useState<number | "all">("all");

  const years = useMemo(() => Array.from(new Set(props.monthly.map((m) => m.year))).sort((a, b) => b - a), [props.monthly]);
  const filteredSeasonal = useMemo(
    () => (year === "all" ? props.seasonal : props.seasonal.filter((s) => s.year === year)),
    [props.seasonal, year]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Manager back office</h1>
        <LogoutButton />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-sand-dark/60 pb-3">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-ocean-dark text-white" : "text-foreground/60 hover:bg-sand"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
        {(tab === "Historicals & Forecast" || tab === "Seasonality") && (
          <YearSlicer years={years} selected={year} onChange={setYear} />
        )}
      </div>

      <div className="mt-6">
        {tab === "Overview" && <OverviewSection stats={props.stats} recentOrders={props.recentOrders} />}
        {tab === "Historicals & Forecast" && <HistoricalsForecastSection monthly={props.monthly} selectedYear={year} />}
        {tab === "Inventory" && <InventorySection rows={props.inventory} methodology={props.reorderMethodology} />}
        {tab === "Products" && <ProductsSection products={props.products} />}
        {tab === "Customers" && <CustomersSection customers={props.customers} />}
        {tab === "Rentals vs. Sales" && <RentalsSection rows={props.rentalVsSales} />}
        {tab === "Promotions" && <PromotionsSection promos={props.promos} />}
        {tab === "Staff" && <StaffSection staff={props.staff} />}
        {tab === "Seasonality" && <SeasonalitySection rows={filteredSeasonal} />}
      </div>
    </div>
  );
}
