import "server-only";
import { supabaseAdmin } from "./supabase-admin";

export type MonthlyPerformance = {
  month: string;
  year: number;
  monthNum: number;
  revenue: number;
  cost: number;
  margin: number;
  orderCount: number;
  unitsSold: number;
};

type MonthlyPerformanceRow = {
  month: string;
  year: number;
  month_num: number;
  channel: string;
  revenue: number;
  cost: number;
  margin: number;
  order_count: number;
  units_sold: number;
};

export async function getMonthlyPerformance(): Promise<MonthlyPerformance[]> {
  const { data, error } = await supabaseAdmin
    .from("monthly_performance")
    .select("*")
    .order("month", { ascending: true });
  if (error) throw new Error(`Failed to load monthly performance: ${error.message}`);

  const byMonth = new Map<string, MonthlyPerformance>();
  for (const row of data as unknown as MonthlyPerformanceRow[]) {
    const existing = byMonth.get(row.month);
    if (existing) {
      existing.revenue += Number(row.revenue);
      existing.cost += Number(row.cost);
      existing.margin += Number(row.margin);
      existing.orderCount += row.order_count;
      existing.unitsSold += row.units_sold;
    } else {
      byMonth.set(row.month, {
        month: row.month,
        year: row.year,
        monthNum: row.month_num,
        revenue: Number(row.revenue),
        cost: Number(row.cost),
        margin: Number(row.margin),
        orderCount: row.order_count,
        unitsSold: row.units_sold,
      });
    }
  }
  return Array.from(byMonth.values()).sort((a, b) => (a.month < b.month ? -1 : 1));
}

export async function getAvailableYears(): Promise<number[]> {
  const monthly = await getMonthlyPerformance();
  const years = Array.from(new Set(monthly.map((m) => m.year))).sort((a, b) => b - a);
  return years;
}

export type ProductPerformance = {
  sku: string;
  productName: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number | null;
};

export async function getProductPerformance(): Promise<ProductPerformance[]> {
  const { data, error } = await supabaseAdmin
    .from("product_performance")
    .select("*")
    .order("margin", { ascending: false });
  if (error) throw new Error(`Failed to load product performance: ${error.message}`);
  return (data ?? []).map((r) => ({
    sku: r.sku,
    productName: r.product_name,
    category: r.category,
    unitsSold: r.units_sold,
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    margin: Number(r.margin),
    marginPct: r.margin_pct === null ? null : Number(r.margin_pct),
  }));
}

// --- Inventory reorder points -----------------------------------------
//
// Methodology (statistical safety-stock reorder point, the standard
// inventory-management formula):
//
//   reorder point = (average daily demand x lead time) + safety stock
//   safety stock  = Z x (std. dev. of daily demand) x sqrt(lead time)
//
// Average daily demand and its standard deviation are computed from the
// last 90 days of actual sales on record for that SKU, treating days with
// no sale as zero demand (not just averaging over the days it happened to
// sell). Lead time is a documented assumption (14 days, a reasonable
// mainland-to-island resupply window for a shop on Apo Island). Z=1.65
// targets roughly a 95% chance of not running out before the next
// delivery arrives, a standard one-sided service-level choice.

const LEAD_TIME_DAYS = 14;
const SERVICE_LEVEL_Z = 1.65;
const LOOKBACK_DAYS = 90;

export type InventoryRow = {
  sku: string;
  productName: string;
  onHand: number;
  availableForSale: number;
  avgDailyDemand: number;
  reorderPoint: number;
  needsReorder: boolean;
  daysOfStockLeft: number | null;
};

export async function getInventoryReorderView(): Promise<InventoryRow[]> {
  const { data: maxDateRow, error: maxDateErr } = await supabaseAdmin
    .from("Orders")
    .select('"OrderDate"')
    .order("OrderDate", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxDateErr) throw new Error(`Failed to find latest order date: ${maxDateErr.message}`);
  const anchor = maxDateRow ? new Date(maxDateRow.OrderDate as string) : new Date();
  const cutoff = new Date(anchor);
  cutoff.setDate(cutoff.getDate() - (LOOKBACK_DAYS - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data: salesRows, error: salesErr } = await supabaseAdmin
    .from("daily_sku_sales")
    .select("sku, sale_date, qty_sold")
    .gte("sale_date", cutoffStr);
  if (salesErr) throw new Error(`Failed to load daily sales: ${salesErr.message}`);

  const qtyBySkuDate = new Map<string, Map<string, number>>();
  for (const row of salesRows ?? []) {
    const sku = row.sku as string;
    if (!qtyBySkuDate.has(sku)) qtyBySkuDate.set(sku, new Map());
    qtyBySkuDate.get(sku)!.set(row.sale_date as string, Number(row.qty_sold));
  }

  const { data: inventory, error: invErr } = await supabaseAdmin
    .from("Inventory")
    .select('"SKU", "OnHandQty", "AvailableForSale"')
    .order("SKU", { ascending: true });
  if (invErr) throw new Error(`Failed to load inventory: ${invErr.message}`);

  const { data: products } = await supabaseAdmin.from("products").select("sku, product_name");
  const nameBySku = new Map((products ?? []).map((p) => [p.sku as string, p.product_name as string]));

  const rows: InventoryRow[] = [];
  for (const inv of inventory ?? []) {
    const sku = inv.SKU as string;
    const dateMap = qtyBySkuDate.get(sku) ?? new Map<string, number>();
    const daily: number[] = [];
    for (let i = 0; i < LOOKBACK_DAYS; i++) {
      const d = new Date(cutoff);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      daily.push(dateMap.get(key) ?? 0);
    }
    const avg = daily.reduce((a, b) => a + b, 0) / LOOKBACK_DAYS;
    const variance = daily.reduce((s, v) => s + (v - avg) ** 2, 0) / LOOKBACK_DAYS;
    const std = Math.sqrt(variance);

    const reorderPoint = Math.ceil(avg * LEAD_TIME_DAYS + SERVICE_LEVEL_Z * std * Math.sqrt(LEAD_TIME_DAYS));
    const availableForSale = Number(inv.AvailableForSale);

    rows.push({
      sku,
      productName: nameBySku.get(sku) ?? sku,
      onHand: Number(inv.OnHandQty),
      availableForSale,
      avgDailyDemand: Math.round(avg * 100) / 100,
      reorderPoint,
      needsReorder: availableForSale <= reorderPoint,
      daysOfStockLeft: avg > 0 ? Math.round((availableForSale / avg) * 10) / 10 : null,
    });
  }

  return rows.sort((a, b) => {
    if (a.needsReorder !== b.needsReorder) return a.needsReorder ? -1 : 1;
    return (a.daysOfStockLeft ?? Infinity) - (b.daysOfStockLeft ?? Infinity);
  });
}

export const REORDER_METHODOLOGY = {
  leadTimeDays: LEAD_TIME_DAYS,
  serviceLevelZ: SERVICE_LEVEL_Z,
  lookbackDays: LOOKBACK_DAYS,
};

// --- Customers, rentals, promos, staff, seasonality (breadth views) ----

export type CustomerSummaryRow = {
  customerId: string;
  customerType: string;
  country: string;
  joinDate: string;
  loyaltyMember: boolean;
  orderCount: number;
  lifetimeRevenue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
};

export async function getCustomerSummary(): Promise<CustomerSummaryRow[]> {
  const { data, error } = await supabaseAdmin.from("customer_summary").select("*");
  if (error) throw new Error(`Failed to load customer summary: ${error.message}`);
  return (data ?? []).map((r) => ({
    customerId: r.customer_id,
    customerType: r.customer_type,
    country: r.country,
    joinDate: r.join_date,
    loyaltyMember: !!r.loyalty_member,
    orderCount: r.order_count,
    lifetimeRevenue: Number(r.lifetime_revenue),
    firstOrderDate: r.first_order_date,
    lastOrderDate: r.last_order_date,
  }));
}

export type PromoPerformanceRow = {
  promoCode: string;
  promoName: string;
  promoType: string;
  ordersUsing: number;
  totalDiscount: number;
  revenueFromOrders: number;
};

export async function getPromoPerformance(): Promise<PromoPerformanceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("promo_performance")
    .select("*")
    .order("total_discount", { ascending: false });
  if (error) throw new Error(`Failed to load promo performance: ${error.message}`);
  return (data ?? []).map((r) => ({
    promoCode: r.promo_code,
    promoName: r.promo_name,
    promoType: r.promo_type,
    ordersUsing: r.orders_using,
    totalDiscount: Number(r.total_discount),
    revenueFromOrders: Number(r.revenue_from_orders),
  }));
}

export type StaffPerformanceRow = {
  empId: string;
  employeeName: string;
  role: string;
  ordersHandled: number;
  orderRevenue: number;
  rentalsHandled: number;
  rentalRevenue: number;
};

export async function getStaffPerformance(): Promise<StaffPerformanceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("staff_performance")
    .select("*")
    .order("order_revenue", { ascending: false });
  if (error) throw new Error(`Failed to load staff performance: ${error.message}`);
  return (data ?? []).map((r) => ({
    empId: r.emp_id,
    employeeName: r.employee_name,
    role: r.role,
    ordersHandled: r.orders_handled,
    orderRevenue: Number(r.order_revenue),
    rentalsHandled: r.rentals_handled,
    rentalRevenue: Number(r.rental_revenue),
  }));
}

export type SeasonalRow = { season: string; year: number; revenue: number; margin: number };

export async function getSeasonalPerformance(): Promise<SeasonalRow[]> {
  const { data, error } = await supabaseAdmin.from("seasonal_performance").select("*");
  if (error) throw new Error(`Failed to load seasonal performance: ${error.message}`);
  return (data ?? []).map((r) => ({
    season: r.season,
    year: r.year,
    revenue: Number(r.revenue),
    margin: Number(r.margin),
  }));
}

export type RentalVsSalesRow = {
  sku: string;
  month: string;
  unitsSold: number;
  saleRevenue: number;
  unitsRented: number;
  rentalRevenue: number;
};

export async function getRentalVsSales(): Promise<RentalVsSalesRow[]> {
  const { data, error } = await supabaseAdmin.from("rental_vs_sales_by_sku_month").select("*");
  if (error) throw new Error(`Failed to load rental vs. sales: ${error.message}`);
  return (data ?? []).map((r) => ({
    sku: r.sku,
    month: r.month,
    unitsSold: r.units_sold,
    saleRevenue: Number(r.sale_revenue),
    unitsRented: r.units_rented,
    rentalRevenue: Number(r.rental_revenue),
  }));
}
