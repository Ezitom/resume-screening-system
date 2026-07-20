/**
 * ===================================================
 * ADMIN INSTRUCTIONS: HOW TO ADD NEW RECRUITERS
 * ===================================================
 * Since public signup is disabled and recruitment signup is invite-only,
 * the first recruiter account (and subsequent pre-approved recruiters)
 * must be created manually through the Supabase dashboard:
 * 
 * 1. Go to Supabase dashboard → Authentication → Users
 * 2. Click "Add User" → "Create new user"
 * 3. Enter the recruiter's email and a temporary password
 * 4. Click "Create User"
 * 5. Then go to Table Editor → recruiters table → Insert row
 * 6. Add the recruiter's id (copy from the Users page), full_name, email, role: "recruiter", status: "active"
 * 
 * Once added, the recruiter can log in with those credentials and
 * change their password at any time using the forgot password flow.
 */

// auth.js — Complete Authentication Helper
// Handles all auth operations using Supabase

function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (typeof supabase !== 'undefined') {
    const url = import.meta.env?.VITE_SUPABASE_URL;
    const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        const { createClient } = supabase;
        window.supabaseClient = createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        return window.supabaseClient;
      } catch (err) {
        console.error("Error creating Supabase client in auth.js fallback:", err);
      }
    }
  }
  return null;
}

// ── LOGIN ────────────────────────────────────────────────
async function loginRecruiter(email, password) {
  const client = getSupabaseClient();
  if (!client || !client.auth) {
    throw new Error("Supabase client is not initialized. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.");
  }
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) throw new Error(error.message);
  return data;
}

// ── LOGOUT ───────────────────────────────────────────────
async function logoutRecruiter() {
  const client = getSupabaseClient();
  if (!client || !client.auth) {
    window.location.href = "login.html";
    return;
  }
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
  window.location.href = "login.html";
}

// ── GET CURRENT SESSION ──────────────────────────────────
async function getCurrentSession() {
  const client = getSupabaseClient();
  if (!client || !client.auth) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
}

// ── GET CURRENT USER ─────────────────────────────────────
async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client || !client.auth) return null;
  const { data: { user } } = await client.auth.getUser();
  return user;
}

// ── FORGOT PASSWORD ──────────────────────────────────────
async function sendPasswordReset(email) {
  const client = getSupabaseClient();
  if (!client || !client.auth) {
    throw new Error("Supabase client is not initialized.");
  }
  const { error } = await client.auth.resetPasswordForEmail(
    email.trim(),
    { redirectTo: window.location.origin + "/reset-password.html" }
  );
  if (error) throw new Error(error.message);
}

// ── RESET PASSWORD (after clicking email link) ───────────
async function updatePassword(newPassword) {
  const client = getSupabaseClient();
  if (!client || !client.auth) {
    throw new Error("Supabase client is not initialized.");
  }
  const { error } = await client.auth.updateUser({
    password: newPassword
  });
  if (error) throw new Error(error.message);
}

// ── INVITE RECRUITER (admin only) ────────────────────────
async function inviteRecruiter(email, fullName) {
  const client = getSupabaseClient();
  if (!client || !client.auth) {
    throw new Error("Supabase client is not initialized.");
  }
  const { data, error } = await client.auth.admin.inviteUserByEmail(email);
  if (error) throw new Error(error.message);

  // Save recruiter profile to recruiters table
  await client.from("recruiters").insert([{
    id: data.user.id,
    full_name: fullName,
    email: email,
    role: "recruiter",
    status: "active"
  }]);

  return data;
}

// ── PROTECT PAGES (call on every protected page) ─────────
async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) {
    // Not logged in — redirect to login page
    window.location.href = "login.html";
    return null;
  }
  return session;
}

// ── REDIRECT IF ALREADY LOGGED IN (call on login page) ───
async function redirectIfLoggedIn() {
  const session = await getCurrentSession();
  if (session) {
    window.location.href = "dashboard.html";
  }
}

window.loginRecruiter = loginRecruiter;
window.logoutRecruiter = logoutRecruiter;
window.getCurrentSession = getCurrentSession;
window.getCurrentUser = getCurrentUser;
window.sendPasswordReset = sendPasswordReset;
window.updatePassword = updatePassword;
window.inviteRecruiter = inviteRecruiter;
window.requireAuth = requireAuth;
window.redirectIfLoggedIn = redirectIfLoggedIn;
