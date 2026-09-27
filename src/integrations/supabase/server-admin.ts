// Server-only Supabase client for LinuxForge control-plane tables.
// Never import this module from browser/client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function getServerKey(): string {
  const key = process.env["SUPABASE_SECRET_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. Configure the server-only Supabase secret/service-role key for LinuxForge control-plane operations.",
    );
  }
  return key;
}

export function createSupabaseAdminClient() {
  const url = process.env["SUPABASE_URL"];
  if (!url) throw new Error("Missing SUPABASE_URL.");

  return createClient<Database>(url, getServerKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
