import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Safe: uses anon key, can only do what RLS allows
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
