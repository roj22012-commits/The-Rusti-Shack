import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAllProducts } from "@/lib/products";
import { SHIPPING_FEE } from "@/lib/constants";

type CheckoutRequestItem = { sku: string; qty: number };
type CheckoutRequestBody = {
  items: CheckoutRequestItem[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    streetAddress: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    loyaltyMember: boolean;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: CheckoutRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { items, customer } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (
    !customer?.firstName?.trim() ||
    !customer?.lastName?.trim() ||
    !customer?.email?.trim() ||
    !EMAIL_RE.test(customer.email.trim()) ||
    !customer?.streetAddress?.trim() ||
    !customer?.city?.trim() ||
    !customer?.region?.trim() ||
    !customer?.postalCode?.trim() ||
    !customer?.country?.trim()
  ) {
    return NextResponse.json({ error: "Missing or invalid customer details" }, { status: 400 });
  }

  // Prices always come from the catalog, never from the client.
  const allProducts = await getAllProducts();
  const variantIndex = new Map<
    string,
    { name: string; unitPrice: number }
  >();
  for (const p of allProducts) {
    for (const v of p.variants) {
      variantIndex.set(v.sku, { name: p.name, unitPrice: v.unitPrice });
    }
  }

  const lineItems: import("stripe").default.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of items) {
    const variant = variantIndex.get(item.sku);
    const qty = Number(item.qty);
    if (!variant || !Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: `Invalid cart item: ${item.sku}` }, { status: 400 });
    }
    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(variant.unitPrice * 100),
        product_data: {
          name: variant.name,
          metadata: { sku: item.sku },
        },
      },
    });
  }

  lineItems.push({
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: Math.round(SHIPPING_FEE * 100),
      product_data: { name: "Shipping" },
    },
  });

  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: customer.email.trim(),
    success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`,
    metadata: {
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      phone: customer.phone?.trim() ?? "",
      streetAddress: customer.streetAddress.trim(),
      city: customer.city.trim(),
      region: customer.region.trim(),
      postalCode: customer.postalCode.trim(),
      country: customer.country.trim(),
      loyaltyMember: String(!!customer.loyaltyMember),
    },
  });

  return NextResponse.json({ url: session.url });
}
