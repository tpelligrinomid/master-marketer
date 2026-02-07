import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const env = getEnv();
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  }
  return _supabase;
}
