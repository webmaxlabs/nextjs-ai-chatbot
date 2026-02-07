import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key
// This bypasses RLS - use only for admin operations
// Note: Using untyped client since Supabase JS v2.x has issues with custom Database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = createClient<any>(
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseServer = createClient<any>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
