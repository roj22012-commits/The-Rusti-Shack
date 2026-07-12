import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client bypasses Row Level Security. It must never be imported by
// client components or sent to the browser -- the "server-only" import
// above makes any accidental client-side import fail at build time.
// Used for: writing orders after Stripe confirms payment, and the manager
// page's reads. See SECURITY.md.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
