"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

export default function ProductPurchasePanel({ product }: { product: Product }) {
  const { addItem } = useCart();

  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[],
    [product]
  );
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[],
    [product]
  );
  const genders = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.gender).filter(Boolean))) as string[],
    [product]
  );

  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0] : null);
  const [gender, setGender] = useState<string | null>(genders.length === 1 ? genders[0] : null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const matchedVariant = product.variants.find(
    (v) =>
      (sizes.length === 0 || v.size === size) &&
      (colors.length === 0 || v.color === color) &&
      (genders.length === 0 || v.gender === gender)
  );

  const activeColorOption =
    product.colorOptions.find((c) => c.color === color) ?? product.colorOptions[0];
  const image = activeColorOption?.images.studio ?? product.coverImage.studio;

  const canAdd = Boolean(matchedVariant);

  function handleAddToCart() {
    if (!matchedVariant) return;
    addItem(
      {
        sku: matchedVariant.sku,
        parentSku: product.sku,
        name: product.name,
        image: image ?? null,
        unitPrice: matchedVariant.unitPrice,
        size: matchedVariant.size,
        color: matchedVariant.color,
      },
      qty
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-semibold text-coral">
          ${(matchedVariant?.unitPrice ?? product.basePrice).toFixed(2)}
        </span>
        {product.availability === "Both" && (
          <span className="rounded-full bg-ocean-dark/10 px-3 py-1 text-xs font-medium text-ocean-dark">
            Also available to rent in store on Apo Island
          </span>
        )}
      </div>

      {colors.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-foreground/80">Color</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  color === c
                    ? "border-ocean-dark bg-ocean-dark text-white"
                    : "border-sand-dark text-foreground/80 hover:border-ocean-dark"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-foreground/80">Size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  size === s
                    ? "border-ocean-dark bg-ocean-dark text-white"
                    : "border-sand-dark text-foreground/80 hover:border-ocean-dark"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {genders.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-foreground/80">Fit</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  gender === g
                    ? "border-ocean-dark bg-ocean-dark text-white"
                    : "border-sand-dark text-foreground/80 hover:border-ocean-dark"
                }`}
              >
                {g === "M" ? "Men's" : g === "W" ? "Women's" : g}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <p className="text-sm font-medium text-foreground/80">Quantity</p>
        <div className="flex items-center rounded-full border border-sand-dark">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-1 text-lg text-foreground/70"
            aria-label="Decrease quantity"
          >
            &minus;
          </button>
          <span className="w-6 text-center text-sm">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="px-3 py-1 text-lg text-foreground/70"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!canAdd}
        onClick={handleAddToCart}
        className="mt-8 w-full rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      >
        {justAdded ? "Added to cart" : canAdd ? "Add to cart" : "Select options"}
      </button>
    </div>
  );
}
