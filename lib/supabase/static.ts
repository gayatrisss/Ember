import { createClient } from "@supabase/supabase-js";

/**
 * Cookieless, anon-key Supabase client for PUBLIC reads in statically-rendered /
 * ISR server components. Because it never touches cookies(), the route stays
 * static (no session = nothing request-specific) — unlike the cookie-aware
 * server client, which forces dynamic rendering. Use for public data only
 * (e.g. the cabins table, RLS-readable by anon); use lib/supabase/server for
 * anything that depends on the logged-in user.
 */
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
