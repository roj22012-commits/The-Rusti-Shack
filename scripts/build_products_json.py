"""
Builds lib/products.json from the Products tab of data/The_Rusti_Shack_Dataset.xlsx.

This is a temporary, static stand-in for the real product catalog. Part 6.4
of the build replaces this with a Supabase `products` table; until then the
site reads from this generated file. Re-run this script any time the source
spreadsheet changes:

    python3 scripts/build_products_json.py
"""
import json
import os
import re
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "public", "images", "products")


def slug(value):
    if value is None or (isinstance(value, float)):
        return None
    return re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")


def main():
    df = pd.read_excel(os.path.join(ROOT, "data", "The_Rusti_Shack_Dataset.xlsx"), sheet_name="Products")

    files = set(os.listdir(IMG_DIR))

    def find_image(sku, color_slug, tag_options):
        # tag_options: ordered list of acceptable suffix tags, e.g. ['', 'm', 'w', 'u']
        # Try the color-qualified filename first, then fall back to the bare
        # SKU name (photographers skipped the color token for single-color items).
        prefixes = [f"{sku}-{color_slug}" if color_slug else sku]
        if color_slug:
            prefixes.append(sku)
        for prefix in prefixes:
            for tag in tag_options:
                fname = f"{prefix}-{tag}.jpg" if tag else f"{prefix}.jpg"
                if fname in files:
                    return f"/images/products/{fname}"
        return None

    def images_for(sku, color_slug):
        studio = find_image(sku, color_slug, ["", "m", "w", "u"])
        life = find_image(sku, color_slug, ["life"])
        return {"studio": studio, "lifestyle": life}

    parents = df[df["VariantType"] == "Parent"].copy()
    variants = df[df["VariantType"] == "Variant"].copy()
    standalone = df[df["VariantType"] == "Standalone"].copy()

    products = []

    for _, prow in parents.iterrows():
        psku = prow["SKU"]
        pvariants = variants[variants["ParentSKU"] == psku]
        # distinct colors in catalog order of first appearance
        seen_colors = []
        for _, v in pvariants.iterrows():
            c = v["Color"]
            if c not in seen_colors:
                seen_colors.append(c)

        color_options = []
        for c in seen_colors:
            cslug = slug(c)
            color_options.append({
                "color": c,
                "colorSlug": cslug,
                "images": images_for(psku, cslug),
            })

        variant_skus = []
        for _, v in pvariants.iterrows():
            variant_skus.append({
                "sku": v["SKU"],
                "size": v["Size"] if pd.notna(v["Size"]) else None,
                "color": v["Color"] if pd.notna(v["Color"]) else None,
                "gender": v["Gender"] if pd.notna(v["Gender"]) else None,
                "unitPrice": float(v["UnitPrice"]),
                "unitCost": float(v["UnitCost"]),
                "rentalRate": float(v["RentalRate"]) if pd.notna(v["RentalRate"]) else None,
            })

        products.append({
            "sku": psku,
            "name": prow["ProductName"],
            "category": prow["Category"],
            "subcategory": prow["Subcategory"],
            "availability": prow["Availability"],
            "basePrice": float(prow["UnitPrice"]),
            "baseRentalRate": float(prow["RentalRate"]) if pd.notna(prow["RentalRate"]) else None,
            "hasVariants": True,
            "colorOptions": color_options,
            "variants": variant_skus,
            "coverImage": color_options[0]["images"] if color_options else {"studio": None, "lifestyle": None},
        })

    for _, srow in standalone.iterrows():
        sku = srow["SKU"]
        imgs = images_for(sku, None)
        products.append({
            "sku": sku,
            "name": srow["ProductName"],
            "category": srow["Category"],
            "subcategory": srow["Subcategory"],
            "availability": srow["Availability"],
            "basePrice": float(srow["UnitPrice"]),
            "baseRentalRate": float(srow["RentalRate"]) if pd.notna(srow["RentalRate"]) else None,
            "hasVariants": False,
            "colorOptions": [],
            "variants": [{
                "sku": sku,
                "size": None,
                "color": None,
                "gender": None,
                "unitPrice": float(srow["UnitPrice"]),
                "unitCost": float(srow["UnitCost"]),
                "rentalRate": float(srow["RentalRate"]) if pd.notna(srow["RentalRate"]) else None,
            }],
            "coverImage": imgs,
        })

    # sanity: flag any product missing a studio cover image
    missing = [p["sku"] for p in products if not p["coverImage"]["studio"]]
    if missing:
        print("WARNING: no studio image found for:", missing)

    out_path = os.path.join(ROOT, "lib", "products.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(products)} products to {out_path}")
    by_cat = {}
    for p in products:
        by_cat[p["category"]] = by_cat.get(p["category"], 0) + 1
    print("By category:", by_cat)


if __name__ == "__main__":
    main()
