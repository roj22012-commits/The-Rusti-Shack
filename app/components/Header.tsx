import Link from "next/link";
import { getCategories, categorySlug } from "@/lib/products";

export default function Header() {
  const categories = getCategories();

  return (
    <header className="sticky top-0 z-10 border-b border-sand-dark/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-ocean-dark">
            The Rusti Shack
          </span>
        </Link>
        <nav className="hidden gap-5 text-sm font-medium text-foreground/80 md:flex">
          {categories.map((c) => (
            <a key={c} href={`/#${categorySlug(c)}`} className="hover:text-ocean-dark">
              {c}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
