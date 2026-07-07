import rawProducts from "./products.json";

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

export const products = rawProducts as Product[];

export function getAllProducts(): Product[] {
  return products;
}

export function getCategories(): string[] {
  const order = ["Apparel", "Snorkel & Dive", "Beach Essentials", "Surfing", "Fishing"];
  const present = new Set(products.map((p) => p.category));
  return order.filter((c) => present.has(c));
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export function getProductBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}

export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
