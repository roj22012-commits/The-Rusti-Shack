import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MANAGER_COOKIE_NAME, verifySessionCookieValue } from "@/lib/manager-auth";
import { getSalesCsvRows, type SalesCsvRow } from "@/lib/manager-data";

const COLUMNS: (keyof SalesCsvRow)[] = [
  "OrderID",
  "OrderDate",
  "FirstName",
  "LastName",
  "Country",
  "ProductCode",
  "ProductName",
  "Quantity",
  "UnitPrice",
  "LineRevenue",
  "ShippingFee",
  "OrderTotal",
  "PaymentMethod",
];

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const jar = await cookies();
  const session = jar.get(MANAGER_COOKIE_NAME)?.value;
  if (!verifySessionCookieValue(session)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const rows = await getSalesCsvRows();
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((c) => csvEscape(row[c])).join(","));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rusti-shack-sales-${today}.csv"`,
    },
  });
}
