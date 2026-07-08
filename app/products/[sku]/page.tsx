import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getProductBySku } from "@/lib/products";
import ProductPurchasePanel from "@/app/components/ProductPurchasePanel";

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

          <div className="mt-4">
            <ProductPurchasePanel product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
