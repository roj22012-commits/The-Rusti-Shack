import imageManifest from "./products.json";
import { supabase } from "./supabase";

export type ProductImages = {
  studio: string | null;
  lifestyle: string | null;
};

export type ColorOption = {
  color: string;
  colorSlug: string | null;
  images: ProductImages;
};

export type ProductVariant = {
  sku: string;
  size: string | null;
  color: string | null;
  gender: string | null;
  unitPrice: number;
  unitCost: number;
  rentalRate: number | null;
};

export type Availability = "Sale only" | "Both";

export type Product = {
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  availability: Availability;
  basePrice: number;
  baseRentalRate: number | null;
  hasVariants: boolean;
  colorOptions: ColorOption[];
  variants: ProductVariant[];
  coverImage: ProductImages;
};

// Photos are static assets checked into the repo, not data Rusti edits, so
// we keep resolving image paths from the locally generated manifest rather
// than storing them in Supabase. Everything else (price, category,
// availability) comes from the database now.
type ImageManifestEntry = {
  sku: string;
  coverImage: ProductImages;
  colorOptions: ColorOption[];
};
const imagesBySku = new Map<string, ImageManifestEntry>(
  (imageManifest as ImageManifestEntry[]).map((p) => [p.sku, p])
);

type ProductRow = {
  sku: string;
  product_name: string;
  category: string;
  subcategory: string;
  unit_cost: number | null;
  unit_price: number;
  rental_rate: number | null;
  availability: string;
  parent_sku: string | null;
  size: string | null;
  color: string | null;
  gender: string | null;
  variant_type: "Parent" | "Variant" | "Standalone";
};

async function fetchAllRows(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "sku, product_name, category, subcategory, unit_cost, unit_price, rental_rate, availability, parent_sku, size, color, gender, variant_type"
    );
  if (error) {
    throw new Error(`Failed to load products from Supabase: ${error.message}`);
  }
  return data as ProductRow[];
}

function buildProducts(rows: ProductRow[]): Product[] {
  const parents = rows.filter((r) => r.variant_type === "Parent");
  const variants = rows.filter((r) => r.variant_type === "Variant");
  const standalone = rows.filter((r) => r.variant_type === "Standalone");

  const result: Product[] = [];

  for (const p of parents) {
    const pVariants = variants.filter((v) => v.parent_sku === p.sku);
    const seenColors: string[] = [];
    for (const v of pVariants) {
      if (v.color && !seenColors.includes(v.color)) seenColors.push(v.color);
    }

    const manifestEntry = imagesBySku.get(p.sku);
    const colorOptions: ColorOption[] = seenColors.map((c) => {
      const match = manifestEntry?.colorOptions.find((co) => co.color === c);
      return match ?? { color: c, colorSlug: null, images: { studio: null, lifestyle: null } };
    });

    result.push({
      sku: p.sku,
      name: p.product_name,
      category: p.category,
      subcategory: p.subcategory,
      availability: p.availability as Availability,
      basePrice: Number(p.unit_price),
      baseRentalRate: p.rental_rate != null ? Number(p.rental_rate) : null,
      hasVariants: true,
      colorOptions,
      variants: pVariants.map((v) => ({
        sku: v.sku,
        size: v.size,
        color: v.color,
        gender: v.gender,
        unitPrice: Number(v.unit_price),
        unitCost: Number(v.unit_cost),
        rentalRate: v.rental_rate != null ? Number(v.rental_rate) : null,
      })),
      coverImage:
        manifestEntry?.coverImage ?? colorOptions[0]?.images ?? { studio: null, lifestyle: null },
    });
  }

  for (const s of standalone) {
    const manifestEntry = imagesBySku.get(s.sku);
    result.push({
      sku: s.sku,
      name: s.product_name,
      category: s.category,
      subcategory: s.subcategory,
      availability: s.availability as Availability,
      basePrice: Number(s.unit_price),
      baseRentalRate: s.rental_rate != null ? Number(s.rental_rate) : null,
      hasVariants: false,
      colorOptions: [],
      variants: [
        {
          sku: s.sku,
          size: null,
          color: null,
          gender: null,
          unitPrice: Number(s.unit_price),
          unitCost: Number(s.unit_cost),
          rentalRate: s.rental_rate != null ? Number(s.rental_rate) : null,
        },
      ],
      coverImage: manifestEntry?.coverImage ?? { studio: null, lifestyle: null },
    });
  }

  return result;
}

let cachedProducts: Product[] | null = null;

export async function getAllProducts(): Promise<Product[]> {
  if (cachedProducts) return cachedProducts;
  const rows = await fetchAllRows();
  cachedProducts = buildProducts(rows);
  return cachedProducts;
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.category === category);
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const all = await getAllProducts();
  return all.find((p) => p.sku === sku);
}

export function getCategories(): string[] {
  return ["Apparel", "Snorkel & Dive", "Beach Essentials", "Surfing", "Fishing"];
}

export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
