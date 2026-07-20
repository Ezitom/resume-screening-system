// supabase-client.js
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    const createClientFn = (typeof supabase !== 'undefined' && supabase.createClient)
      ? supabase.createClient
      : (typeof window !== 'undefined' && window.supabase?.createClient);

    if (createClientFn) {
      supabaseClient = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } else {
      console.warn("[WARN] Supabase SDK script is not loaded.");
    }
  } catch (err) {
    console.error("[ERROR] Failed to initialize Supabase client:", err);
  }
} else {
  console.warn("[WARN] Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing!");
}

window.supabaseClient = supabaseClient;
