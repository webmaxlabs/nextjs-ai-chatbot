import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-side Supabase client with service role key
// This bypasses RLS - use only for admin operations
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Server-side client with anon key (respects RLS)
export const supabaseServer = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
