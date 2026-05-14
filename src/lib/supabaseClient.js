import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase URL cargada:", supabaseUrl);
console.log("Supabase key cargada:", Boolean(supabaseKey));

if (!supabaseUrl) {
  console.error("Falta VITE_SUPABASE_URL");
}

if (!supabaseKey) {
  console.error("Falta VITE_SUPABASE_ANON_KEY o VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey);