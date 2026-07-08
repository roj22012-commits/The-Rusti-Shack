"use client";

import Link from "next/link";
import { useState } from "react";
import { SHIPPING_FEE, useCart } from "@/lib/cart-context";
import { COUNTRIES } from "@/lib/countries";

type FormState = {
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

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Philippines",
  loyaltyMember: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [validated, setValidated] = useState(false);

  const total = subtotal + SHIPPING_FEE;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "That doesn't look like a valid email.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    if (!form.streetAddress.trim()) next.streetAddress = "Street address is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.region.trim()) next.region = "State / region is required.";
    if (!form.postalCode.trim()) next.postalCode = "Postal code is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) setValidated(true);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <Link href="/" className="mt-6 inline-block rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white">
          Keep shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Checkout</h1>

      <div className="mt-6 grid gap-10 md:grid-cols-[1.3fr_1fr]">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" error={errors.firstName}>
              <input
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={inputClass(!!errors.firstName)}
              />
            </Field>
            <Field label="Last name" error={errors.lastName}>
              <input
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={inputClass(!!errors.lastName)}
              />
            </Field>
          </div>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass(!!errors.email)}
            />
          </Field>

          <Field label="Phone" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass(!!errors.phone)}
            />
          </Field>

          <Field label="Street address" error={errors.streetAddress}>
            <input
              value={form.streetAddress}
              onChange={(e) => update("streetAddress", e.target.value)}
              className={inputClass(!!errors.streetAddress)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City" error={errors.city}>
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass(!!errors.city)}
              />
            </Field>
            <Field label="State / region" error={errors.region}>
              <input
                value={form.region}
                onChange={(e) => update("region", e.target.value)}
                className={inputClass(!!errors.region)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Postal code" error={errors.postalCode}>
              <input
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
                className={inputClass(!!errors.postalCode)}
              />
            </Field>
            <Field label="Country">
              <select
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className={inputClass(false)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={form.loyaltyMember}
              onChange={(e) => update("loyaltyMember", e.target.checked)}
              className="h-4 w-4 rounded border-sand-dark"
            />
            Join Rusti&apos;s loyalty list
          </label>

          {validated ? (
            <div className="rounded-xl bg-ocean-dark/10 p-4 text-sm text-ocean-dark">
              Your details look good. Payment isn&apos;t wired up yet — that&apos;s
              the next piece of the build (Stripe, in test mode). Once it&apos;s
              connected, this button will send you to a secure Stripe payment
              page.
            </div>
          ) : (
            <button
              type="submit"
              className="w-full rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white"
            >
              Continue to payment
            </button>
          )}
        </form>

        <div className="h-fit rounded-2xl bg-sand/60 p-5">
          <h2 className="font-semibold text-foreground">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.sku} className="flex justify-between text-foreground/80">
                <span>
                  {item.name}
                  {item.size || item.color ? ` (${[item.size, item.color].filter(Boolean).join(" / ")})` : ""}
                  {" "}&times; {item.qty}
                </span>
                <span>${(item.unitPrice * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t border-sand-dark/60 pt-3 text-sm text-foreground/80">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>${SHIPPING_FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-foreground">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ocean-dark/40 ${
    hasError ? "border-coral" : "border-sand-dark"
  }`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </label>
  );
}
