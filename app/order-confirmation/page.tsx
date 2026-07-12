import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAllProducts } from "@/lib/products";
import { SHIPPING_FEE } from "@/lib/constants";
import ClearCartOnMount from "@/app/components/ClearCartOnMount";

const LOCATION_ID = "SHIP-INTL";
const SALES_ASSOCIATE = "WEB";
const CHANNEL = "Shipping";
const PAYMENT_METHOD = "Card";

async function findOrCreateOrder(sessionId: string) {
  // Idempotency: if we've already recorded this Stripe session, reuse it
  // instead of writing a second order (handles refreshes / revisits).
  const { data: existing } = await supabaseAdmin
    .from("stripe_sessions")
    .select('"OrderID"')
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (existing) {
    return existing.OrderID as string;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product"],
  });

  if (session.payment_status !== "paid") {
    return null;
  }

  const meta = session.metadata ?? {};
  const email = session.customer_details?.email ?? session.customer_email ?? "";

  // Returning customer? Reuse their CustomerID instead of minting a new one.
  const { data: existingContact } = await supabaseAdmin
    .from("Customers_Contact")
    .select('"CustomerID"')
    .eq("Email", email)
    .maybeSingle();

  let customerId: string;
  if (existingContact) {
    customerId = existingContact.CustomerID as string;
  } else {
    const { data: newId, error: idError } = await supabaseAdmin.rpc("next_web_customer_id");
    if (idError || !newId) throw new Error(`Failed to generate CustomerID: ${idError?.message}`);
    customerId = newId as string;

    const today = new Date().toISOString().slice(0, 10);
    const { error: coreError } = await supabaseAdmin.from("Customers_Core").insert({
      CustomerID: customerId,
      FirstName: meta.firstName,
      LastName: meta.lastName,
      CustomerType: "Shipping",
      JoinDate: today,
      City: meta.city,
      Country: meta.country,
    });
    if (coreError) throw new Error(`Failed to write customer: ${coreError.message}`);

    const { error: contactError } = await supabaseAdmin.from("Customers_Contact").insert({
      CustomerID: customerId,
      Email: email,
      Phone: meta.phone,
      LoyaltyMember: meta.loyaltyMember === "true",
      StreetAddress: meta.streetAddress,
      Region: meta.region,
      PostalCode: meta.postalCode,
    });
    if (contactError) throw new Error(`Failed to write customer contact: ${contactError.message}`);
  }

  const { data: newOrderId, error: orderIdError } = await supabaseAdmin.rpc("next_web_order_id");
  if (orderIdError || !newOrderId) throw new Error(`Failed to generate OrderID: ${orderIdError?.message}`);
  const orderId = newOrderId as string;

  const lineItems = session.line_items?.data ?? [];
  const productLines = lineItems.filter((li) => {
    const product = li.price?.product;
    return typeof product !== "string" && !product?.deleted && product?.metadata?.sku;
  });

  const allProducts = await getAllProducts();
  const costBySku = new Map<string, number>();
  for (const p of allProducts) {
    for (const v of p.variants) costBySku.set(v.sku, v.unitCost);
  }

  const orderTotal = (session.amount_total ?? 0) / 100;
  const today = new Date().toISOString().slice(0, 10);

  const { error: ordersError } = await supabaseAdmin.from("Orders").insert({
    OrderID: orderId,
    OrderDate: today,
    CustID: customerId,
    LocationID: LOCATION_ID,
    SalesAssociate: SALES_ASSOCIATE,
    Channel: CHANNEL,
    ShippingFee: SHIPPING_FEE,
    OrderTotal: orderTotal,
    PaymentMethod: PAYMENT_METHOD,
  });
  if (ordersError) throw new Error(`Failed to write order: ${ordersError.message}`);

  const orderLines = productLines.map((li, idx) => {
    const product = li.price!.product;
    const sku =
      typeof product !== "string" && !product.deleted ? product.metadata?.sku ?? "" : "";
    const qty = li.quantity ?? 1;
    const unitPrice = (li.price?.unit_amount ?? 0) / 100;
    const unitCost = costBySku.get(sku) ?? 0;
    return {
      OrderID: orderId,
      LineNumber: idx + 1,
      ProductCode: sku,
      Quantity: qty,
      UnitPrice: unitPrice,
      DiscountPct: 0,
      LineRevenue: unitPrice * qty,
      LineCost: unitCost * qty,
      EffectiveDiscountAmount: 0,
    };
  });

  const { error: linesError } = await supabaseAdmin.from("OrderLines").insert(orderLines);
  if (linesError) throw new Error(`Failed to write order lines: ${linesError.message}`);

  const { error: sessionError } = await supabaseAdmin
    .from("stripe_sessions")
    .insert({ stripe_session_id: sessionId, OrderID: orderId });
  if (sessionError) throw new Error(`Failed to record session: ${sessionError.message}`);

  return orderId;
}

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">No order found</h1>
        <p className="mt-2 text-foreground/70">
          This page is only reachable right after checkout.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white">
          Back to the shop
        </Link>
      </div>
    );
  }

  let orderId: string | null = null;
  let errorMessage: string | null = null;
  try {
    orderId = await findOrCreateOrder(session_id);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Something went wrong.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-foreground/70">{errorMessage}</p>
        <p className="mt-2 text-sm text-foreground/50">
          If you were charged, contact us and we&apos;ll sort it out.
        </p>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Payment not completed</h1>
        <p className="mt-2 text-foreground/70">
          It doesn&apos;t look like this order was paid for.
        </p>
        <Link href="/checkout" className="mt-6 inline-block rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white">
          Back to checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <ClearCartOnMount />
      <p className="text-sm font-medium uppercase tracking-widest text-ocean-dark/70">
        Thank you
      </p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Your order is in.</h1>
      <p className="mt-4 text-foreground/70">
        We&apos;ll get it packed up and shipped from Apo Island. Your order number is:
      </p>
      <p className="mt-3 text-2xl font-semibold text-coral">{orderId}</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white">
        Keep exploring the shop
      </Link>
    </div>
  );
}
