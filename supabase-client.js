// supabase-client.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (err) {
    console.error("[ERROR] Failed to initialize Supabase client:", err);
  }
} else {
  console.warn("[WARN] Supabase environment variables are missing! The application will run in offline fallback mode with mock data.");
}

window.supabaseClient = supabaseClient;

