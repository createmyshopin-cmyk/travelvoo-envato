/** User-facing copy when Supabase returns generic invalid-credential errors. */
export function loginFailureDescription(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("invalid login") ||
    m.includes("invalid_credentials") ||
    m.includes("invalid_grant") ||
    m.includes("invalid email or password")
  ) {
    return "Wrong email/password, or this Supabase project was not seeded. Run supabase/seed_admin_saas_stays.sql. If you already ran an older seed, run supabase/manual_fix_seeded_auth_users_instance.sql, then try again.";
  }
  return message || "Could not sign in.";
}
