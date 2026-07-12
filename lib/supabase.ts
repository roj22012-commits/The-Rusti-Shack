import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Safe to use in the browser: this is the publishable/anon key, and every
// table it can reach is guarded by a Row Level Security policy. See
// SECURITY.md. Server-side writes that need to bypass RLS (order writes
// after Stripe confirms payment, the manager page) use a separate
// service-role client that never ships to the client bundle.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
