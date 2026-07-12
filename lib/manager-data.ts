import "server-only";
import { supabaseAdmin } from "./supabase-admin";

type OrderRow = {
  OrderID: string;
  OrderDate: string;
  CustID: string | null;
  OrderTotal: number;
  ShippingFee: number;
  PaymentMethod: string;
};

type CustomerRow = {
  CustomerID: string;
  FirstName: string;
  LastName: string;
  Country: string | null;
};

type ContactRow = {
  CustomerID: string;
  Email: string;
};

type OrderLineRow = {
  OrderID: string;
  LineNumber: number;
  ProductCode: string;
  Quantity: number;
  UnitPrice: number;
  LineRevenue: number;
};

export type DashboardStats = {
  last7DaysOrderCount: number;
  last7DaysRevenue: number;
  bestSeller: { sku: string; name: string; qty: number } | null;
};

export type RecentOrderRow = {
  orderId: string;
  date: string;
  customerName: string;
  country: string;
  total: number;
};

export type SalesCsvRow = {
  OrderID: string;
  OrderDate: string;
  FirstName: string;
  LastName: string;
  Country: string;
  ProductCode: string;
  ProductName: string;
  Quantity: number;
  UnitPrice: number;
  LineRevenue: number;
  ShippingFee: number;
  OrderTotal: number;
  PaymentMethod: string;
};

async function fetchOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabaseAdmin
    .from("Orders")
    .select('"OrderID", "OrderDate", "CustID", "OrderTotal", "ShippingFee", "PaymentMethod"')
    .order("OrderDate", { ascending: false });
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return data as unknown as OrderRow[];
}

async function fetchCustomers(): Promise<Map<string, CustomerRow>> {
  const { data, error } = await supabaseAdmin
    .from("Customers_Core")
    .select('"CustomerID", "FirstName", "LastName", "Country"');
  if (error) throw new Error(`Failed to load customers: ${error.message}`);
  const map = new Map<string, CustomerRow>();
  for (const row of data as unknown as CustomerRow[]) map.set(row.CustomerID, row);
  return map;
}

async function fetchContacts(): Promise<Map<string, ContactRow>> {
  const { data, error } = await supabaseAdmin.from("Customers_Contact").select('"CustomerID", "Email"');
  if (error) throw new Error(`Failed to load customer contacts: ${error.message}`);
  const map = new Map<string, ContactRow>();
  for (const row of data as unknown as ContactRow[]) map.set(row.CustomerID, row);
  return map;
}

async function fetchOrderLines(): Promise<OrderLineRow[]> {
  const { data, error } = await supabaseAdmin
    .from("OrderLines")
    .select('"OrderID", "LineNumber", "ProductCode", "Quantity", "UnitPrice", "LineRevenue"');
  if (error) throw new Error(`Failed to load order lines: ${error.message}`);
  return data as unknown as OrderLineRow[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [orders, orderLines] = await Promise.all([fetchOrders(), fetchOrderLines()]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentOrders = orders.filter((o) => new Date(o.OrderDate) >= sevenDaysAgo);

  const last7DaysOrderCount = recentOrders.length;
  const last7DaysRevenue = recentOrders.reduce((sum, o) => sum + Number(o.OrderTotal), 0);

  const qtyBySku = new Map<string, number>();
  for (const line of orderLines) {
    qtyBySku.set(line.ProductCode, (qtyBySku.get(line.ProductCode) ?? 0) + line.Quantity);
  }
  let bestSeller: DashboardStats["bestSeller"] = null;
  let maxQty = 0;
  for (const [sku, qty] of qtyBySku) {
    if (qty > maxQty) {
      maxQty = qty;
      bestSeller = { sku, name: sku, qty };
    }
  }
  if (bestSeller) {
    const { data } = await supabaseAdmin
      .from("products")
      .select("product_name")
      .eq("sku", bestSeller.sku)
      .maybeSingle();
    if (data?.product_name) bestSeller.name = data.product_name;
  }

  return { last7DaysOrderCount, last7DaysRevenue, bestSeller };
}

export async function getRecentOrders(limit = 20): Promise<RecentOrderRow[]> {
  const [orders, customers] = await Promise.all([fetchOrders(), fetchCustomers()]);
  return orders.slice(0, limit).map((o) => {
    const customer = o.CustID ? customers.get(o.CustID) : undefined;
    return {
      orderId: o.OrderID,
      date: o.OrderDate,
      customerName: customer ? `${customer.FirstName} ${customer.LastName}` : "—",
      country: customer?.Country ?? "—",
      total: Number(o.OrderTotal),
    };
  });
}

export async function getSalesCsvRows(): Promise<SalesCsvRow[]> {
  const [orders, orderLines, customers, contacts] = await Promise.all([
    fetchOrders(),
    fetchOrderLines(),
    fetchCustomers(),
    fetchContacts(),
  ]);
  void contacts; // reserved for a future email column if Rusti wants it

  const ordersById = new Map(orders.map((o) => [o.OrderID, o]));

  const { data: products } = await supabaseAdmin.from("products").select("sku, product_name");
  const nameBySku = new Map((products ?? []).map((p) => [p.sku as string, p.product_name as string]));

  const rows: SalesCsvRow[] = [];
  for (const line of orderLines) {
    const order = ordersById.get(line.OrderID);
    if (!order) continue;
    const customer = order.CustID ? customers.get(order.CustID) : undefined;
    rows.push({
      OrderID: order.OrderID,
      OrderDate: order.OrderDate,
      FirstName: customer?.FirstName ?? "",
      LastName: customer?.LastName ?? "",
      Country: customer?.Country ?? "",
      ProductCode: line.ProductCode,
      ProductName: nameBySku.get(line.ProductCode) ?? line.ProductCode,
      Quantity: line.Quantity,
      UnitPrice: Number(line.UnitPrice),
      LineRevenue: Number(line.LineRevenue),
      ShippingFee: Number(order.ShippingFee),
      OrderTotal: Number(order.OrderTotal),
      PaymentMethod: order.PaymentMethod,
    });
  }

  rows.sort((a, b) => (a.OrderDate < b.OrderDate ? 1 : -1));
  return rows;
}
