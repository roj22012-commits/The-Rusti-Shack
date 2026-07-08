# The Rusti Shack — Standing Instructions

## What this is

The real online store for The Rusti Shack, a snorkel/dive/surf/beach/fishing
shop on Apo Island, Philippines, owned by Rusti. This is not the practice
site — it lives in its own repo (`The-Rusti-Shack`) and its own Vercel
deployment, separate from the `rusti-practice` warm-up project.

Rusti's own words, from her emails, are the spec:
- "Make sure people can tell what we rent versus what we sell, since most of
  our gear is both."
- A short "About Apo Island" page, since tourists constantly ask her how to
  get there by bangka.
- **We only sell online. Rentals stay on the island** — nobody rents a
  kayak from Berlin through a browser. Every product is purchasable, but
  only items where `Availability` is `Both` also get an in-store-rental note.
- The site's data (orders, customers, order lines) has to line up column
  for column with her existing bookkeeping sheets — see the Products/Orders
  schema notes below once Supabase is wired up (Part 6.4 of the build).

## Voice and design

- Warm, clear, human — like a real person who runs a beach shop wrote it.
  Not templatey stock-photo copy. Short sentences over marketing-speak.
- Coastal palette: ocean blue/teal (`--color-ocean`, `--color-ocean-dark`),
  sand/tan neutrals (`--color-sand`, `--color-sand-dark`), coral as the one
  accent color for prices/CTAs (`--color-coral`). Defined in
  `app/globals.css`.
- Photography-forward: real product photos everywhere, no placeholder
  gibberish. Studio shot for the grid, lifestyle/worn shot on product detail
  pages where one exists.
- **Always check every page on a phone-sized viewport**, not just desktop.
  Most of the shots this project takes at real screens will be mobile.

## Stack and data

- Next.js (App Router) + TypeScript + Tailwind v4, deployed on Vercel.
- Product catalog: `lib/products.json`, generated from
  `data/The_Rusti_Shack_Dataset.xlsx` (Products tab) by
  `scripts/build_products_json.py`. This is a **temporary stand-in** — Part
  6.4 of the build replaces it with a Supabase `products` table. Don't build
  features that assume the JSON file is permanent.
- One photo per genuinely distinct look (color/pattern), not per
  size — see the Part 5 photo plan. `ParentSKU` groups a product family;
  `VariantType` of `Parent` rows are non-sellable roll-ups, `Variant` and
  `Standalone` rows are the actual purchasable SKUs.
- Cart must capture the exact variant SKU (size + color), not just the
  product family.

## Process

- Build one piece at a time: describe it, build it, look at it, refine it,
  then move to the next piece. Don't try to build the whole store in one
  shot.
- Commit and push after every meaningful, working change.
- Keep this file up to date. When the vision, design decisions, or data
  model change, update CLAUDE.md in the same pass — don't let it go stale.

## Security

Follow every rule in SECURITY.md.

Never put passwords, API keys, or other secrets in code or on GitHub.
Secrets go in environment variables.
