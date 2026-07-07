import Image from "next/image";
import ProductCard from "./components/ProductCard";
import { getCategories, getProductsByCategory, categorySlug } from "@/lib/products";

export default function Home() {
  const categories = getCategories();

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <Image
          src="/images/products/SUR-001-life.jpg"
          alt="Surfer riding a wave off Apo Island"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 text-white sm:px-6 sm:py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-sand">
            Apo Island, Philippines
          </p>
          <h1 className="mt-2 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
            Gear up for the reef, the waves, and the sand.
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/90 sm:text-lg">
            The Rusti Shack has kitted out snorkelers, divers, and surfers on
            Apo Island for years. Shop online and we&apos;ll ship it to you,
            or rent gear in person at the shack.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        {categories.map((category) => {
          const items = getProductsByCategory(category);
          return (
            <section key={category} id={categorySlug(category)} className="scroll-mt-20 py-8">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="text-2xl font-bold text-ocean-dark">{category}</h2>
                <span className="text-sm text-foreground/50">
                  {items.length} product{items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.sku} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
