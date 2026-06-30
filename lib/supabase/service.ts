import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client for server-only background work (the notifications
// cron, dev triggers). Bypasses RLS and can use the auth admin API to resolve user
// emails. NEVER import this into client components — the service key must stay server-side.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prod (Supabase Vercel integration) exposes SUPABASE_SERVICE_ROLE_KEY; local
  // .env.local uses SUPABASE_SERVICE_KEY. Accept either.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error("[ember] createServiceClient: missing SUPABASE url or service-role key");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
