import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products";

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function ProductCard({ product }: { product: Product }) {
  const image = product.coverImage.studio ?? product.coverImage.lifestyle;

  return (
    <Link
      href={`/products/${product.sku}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-sand">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {product.availability === "Both" && (
            <span className="rounded-full bg-ocean-dark/90 px-2 py-0.5 text-xs font-medium text-white">
              Rent or buy
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs uppercase tracking-wide text-ocean-dark/70">
          {product.subcategory}
        </p>
        <h3 className="text-sm font-semibold leading-snug text-foreground">
          {product.name}
        </h3>
        <p className="mt-auto text-sm font-medium text-coral">
          {formatPrice(product.basePrice)}
        </p>
      </div>
    </Link>
  );
}
