"use client";

import Image from "next/image";
import Link from "next/link";
import { SHIPPING_FEE, useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { items, removeItem, setQty, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-foreground/70">
          Find something for the reef, the waves, or the sand.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white"
        >
          Keep shopping
        </Link>
      </div>
    );
  }

  const total = subtotal + SHIPPING_FEE;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Your cart</h1>

      <div className="mt-6 divide-y divide-sand-dark/60">
        {items.map((item) => (
          <div key={item.sku} className="flex gap-4 py-4">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-sand">
              {item.image && (
                <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-sm text-foreground/60">
                {[item.size, item.color].filter(Boolean).join(" / ")}
              </p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center rounded-full border border-sand-dark">
                  <button
                    type="button"
                    onClick={() => setQty(item.sku, item.qty - 1)}
                    className="px-2.5 py-0.5 text-foreground/70"
                    aria-label="Decrease quantity"
                  >
                    &minus;
                  </button>
                  <span className="w-6 text-center text-sm">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(item.sku, item.qty + 1)}
                    className="px-2.5 py-0.5 text-foreground/70"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.sku)}
                  className="text-xs text-foreground/50 underline hover:text-coral"
                >
                  Remove
                </button>
              </div>
            </div>
            <p className="w-16 flex-shrink-0 text-right text-sm font-medium text-foreground">
              ${(item.unitPrice * item.qty).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t border-sand-dark/60 pt-4 text-sm">
        <div className="flex justify-between text-foreground/70">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-foreground/70">
          <span>Shipping</span>
          <span>${SHIPPING_FEE.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-foreground">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex-1 rounded-full border border-sand-dark px-6 py-3 text-center text-sm font-semibold text-foreground/80"
        >
          Keep shopping
        </Link>
        <Link
          href="/checkout"
          className="flex-1 rounded-full bg-ocean-dark px-6 py-3 text-center text-sm font-semibold text-white"
        >
          Check out
        </Link>
      </div>
    </div>
  );
}
