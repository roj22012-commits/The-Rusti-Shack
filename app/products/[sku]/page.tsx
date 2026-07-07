import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getProductBySku } from "@/lib/products";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ sku: p.sku }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const product = getProductBySku(sku);
  if (!product) notFound();

  const studio = product.coverImage.studio ?? product.coverImage.lifestyle;
  const lifestyle = product.coverImage.lifestyle;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-ocean-dark hover:underline">
        &larr; Back to all products
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          {studio && (
            <div className="relative col-span-2 aspect-square overflow-hidden rounded-2xl bg-sand sm:col-span-1">
              <Image src={studio} alt={product.name} fill sizes="50vw" className="object-cover" />
            </div>
          )}
          {lifestyle && lifestyle !== studio && (
            <div className="relative col-span-2 aspect-square overflow-hidden rounded-2xl bg-sand sm:col-span-1">
              <Image src={lifestyle} alt={`${product.name} in use`} fill sizes="50vw" className="object-cover" />
            </div>
          )}
        </div>

        <div>
          <p className="text-sm uppercase tracking-wide text-ocean-dark/70">
            {product.category} &middot; {product.subcategory}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{product.name}</h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-semibold text-coral">
              ${product.basePrice.toFixed(2)}
            </span>
            {product.availability === "Both" && (
              <span className="rounded-full bg-ocean-dark/10 px-3 py-1 text-xs font-medium text-ocean-dark">
                Also available to rent in store on Apo Island
              </span>
            )}
          </div>

          {product.colorOptions.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-foreground/80">Colors</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colorOptions.map((c) => (
                  <span
                    key={c.color}
                    className="rounded-full border border-sand-dark px-3 py-1 text-sm text-foreground/80"
                  >
                    {c.color}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.hasVariants && (
            <div className="mt-6">
              <p className="text-sm font-medium text-foreground/80">Sizes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))).map(
                  (size) => (
                    <span
                      key={size}
                      className="rounded-full border border-sand-dark px-3 py-1 text-sm text-foreground/80"
                    >
                      {size}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          <button
            disabled
            className="mt-8 w-full rounded-full bg-ocean-dark px-6 py-3 text-sm font-semibold text-white opacity-60"
          >
            Add to cart (coming soon)
          </button>
        </div>
      </div>
    </div>
  );
}
