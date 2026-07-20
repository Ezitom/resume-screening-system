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

// ── LOGIN ────────────────────────────────────────────────
async function loginRecruiter(email, password) {
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) throw new Error(error.message);
  return data;
}

// ── LOGOUT ───────────────────────────────────────────────
async function logoutRecruiter() {
  const { error } = await window.supabaseClient.auth.signOut();
  if (error) throw new Error(error.message);
  window.location.href = "login.html";
}

// ── GET CURRENT SESSION ──────────────────────────────────
async function getCurrentSession() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  return session;
}

// ── GET CURRENT USER ─────────────────────────────────────
async function getCurrentUser() {
  const { data: { user } } = await window.supabaseClient.auth.getUser();
  return user;
}

// ── FORGOT PASSWORD ──────────────────────────────────────
async function sendPasswordReset(email) {
  const { error } = await window.supabaseClient.auth.resetPasswordForEmail(
    email.trim(),
    { redirectTo: window.location.origin + "/reset-password.html" }
  );
  if (error) throw new Error(error.message);
}

// ── RESET PASSWORD (after clicking email link) ───────────
async function updatePassword(newPassword) {
  const { error } = await window.supabaseClient.auth.updateUser({
    password: newPassword
  });
  if (error) throw new Error(error.message);
}

// ── INVITE RECRUITER (admin only) ────────────────────────
async function inviteRecruiter(email, fullName) {
  const { data, error } = await window.supabaseClient.auth.admin.inviteUserByEmail(email);
  if (error) throw new Error(error.message);

  // Save recruiter profile to recruiters table
  await window.supabaseClient.from("recruiters").insert([{
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
