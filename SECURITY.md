# SECURITY.md — The Rusti Shack

A rulebook for anyone (human or Claude) writing code in this project. This
store will hold a real database, a real checkout, and a private manager
page. None of the risks below are exotic — they're the same dozen doors
every small store on the internet has, which is exactly why they're easy to
lock if you do it before the code, not after.

## 1. The non-negotiables

1. **No secrets in code or in git.** API keys, database service-role keys,
   Stripe secret keys, the manager password — all of it lives in
   environment variables (`.env.local` locally, Vercel's Environment
   Variables in production). `.env*` is git-ignored. Never paste a secret
   into a commit, a comment, a screenshot, or a chat log.
2. **Only the Supabase publishable/anon key ever reaches the browser.** The
   service-role key (if ever needed) never ships to the client.
3. **Row Level Security (RLS) is on for every Supabase table**, from the
   moment each table is created. Public read access is a deliberate,
   narrow policy (e.g. `products` readable by anyone) — not the absence of
   a policy. Customer and order tables are never publicly readable.
4. **Prices are never trusted from the client.** The server looks up the
   real price (and cost) from the product catalog when building an order.
   A shopper editing the DOM or replaying a request with a different price
   must not change what they're charged.
5. **Payments are verified server-to-server before anything is saved.**
   After Stripe redirects back, the server asks Stripe directly "did this
   session actually get paid?" before writing a customer, an order, or any
   order lines. Visiting a confirmation URL directly, without paying, must
   never create an order.
6. **Every write to the database goes through server-side code**, never
   directly from client JavaScript with elevated privileges. The browser
   talks to your API routes; your API routes talk to Supabase.
7. **The manager page (`/manager`) is not linked from anywhere on the
   site.** It is reached only by typing the address directly. Being
   unlisted is not the real lock — the password check on the server is.
8. **The manager password is checked server-side**, before any manager
   data is sent to the browser. There is nothing to see in page source or
   dev tools until the password is verified. It is a long, unique password
   stored as an environment variable, never hard-coded.
9. **All user-supplied input is validated on the server**, not just in the
   browser form: required fields, plausible email format, reasonable
   lengths. Client-side validation is a courtesy to the shopper, not a
   security control — assume it can be bypassed entirely.
10. **Stripe stays in test mode until Rusti explicitly says otherwise.**
    Only `pk_test_...` / `sk_test_...` keys belong in this project during
    the build.
11. **Rentals never appear as a purchasable option online.** Availability
    logic that lets a `Both` item be bought online but not "rented from
    Berlin" is a business rule enforced in code, not just in copy.
12. **Two-factor authentication is on** for the GitHub account, the
    Supabase account, the Stripe account, and the Vercel account tied to
    this project.

## 2. Secrets and environment variables

- Local secrets go in `.env.local` (git-ignored). Production secrets go in
  Vercel → Project Settings → Environment Variables, then redeploy.
- Anything prefixed `NEXT_PUBLIC_` is bundled into client-side JavaScript
  and is effectively public — only ever put genuinely public values there
  (e.g. the Supabase URL and anon/publishable key). Everything else stays
  server-only.
- If a secret is ever accidentally committed: rotate it (generate a new
  one from the provider) immediately. Removing it from a future commit is
  not enough; assume a leaked key is compromised the moment it's pushed.

## 3. Database (Supabase)

- RLS enabled on every table, with explicit policies. Default posture is
  "deny", then open exactly what's needed (e.g. `SELECT` on `products` for
  the `anon` role).
- Customers, Orders, and OrderLines tables are never readable by the
  `anon` role directly. Reads for the manager page go through a
  server-side API route that checks the manager password first.
- Use parameterized queries / the Supabase client library's query builder
  — never string-concatenate user input into raw SQL.

## 4. Checkout and payments (Stripe)

- Cart contents from the browser are a list of SKUs and quantities only.
  The server re-derives prices from the catalog before creating the Stripe
  Checkout Session.
- After redirect, the server calls Stripe to confirm the session's payment
  status before writing anything to Supabase.
- Returning customers are matched by email server-side to reuse a
  `CustomerID`; this lookup happens after payment is confirmed, not before.
- No card numbers ever touch this codebase — Stripe Checkout's hosted page
  handles that entirely.

## 5. The manager page

- Route: `/manager`. No nav link, no sitemap entry.
- Gate is a single shared password (env var), checked in server-side code
  (a Server Action or Route Handler), before any dashboard data or the CSV
  export is returned.
- This is sufficient for a single owner. If more than one person ever
  needs access, replace it with real per-user auth (Supabase Auth) rather
  than sharing a password.

## 6. Dependencies and platform hygiene

- Keep `next`, `react`, and other dependencies reasonably current;
  `npm audit` moderate/high findings get a look before shipping, not an
  automatic ignore.
- HTTPS is handled by Vercel by default — don't disable it or serve mixed
  content.
- Don't log secrets, full card data, or full customer PII to the console
  or to any third-party logging service.

## 7. What this file cannot do

No file makes a website unhackable, the same way no lock makes a house
impossible to enter. This rulebook closes the handful of doors that
automated scanners and opportunistic attackers actually try against a
store this size: leaked secrets, missing RLS, trusting client-side prices,
skipping payment verification, and an unlocked back office. It does not
protect against a determined, targeted attacker with unlimited time, a
zero-day in a dependency, a compromised laptop, phishing against Rusti or
the developer directly, or a mistake in a part of the stack outside this
codebase (Vercel's, Supabase's, or Stripe's own infrastructure). Run a
security review (`/security-review` in Claude Code, or ask Claude Code
directly) after each major milestone — after payments work, after the
manager page ships, and again during final polish — and treat its findings
as a checklist to close, not a formality.
