/**
 * Environment access for Supabase and the admin list, in one place.
 *
 * Supabase renamed its keys in 2025. Both names work here:
 *   publishable key  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (legacy: NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * Nothing here prints a value.
 */

type Env = Record<string, string | undefined>;

function pick(env: Env, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function supabaseUrl(env: Env = process.env): string | undefined {
  return pick(env, "NEXT_PUBLIC_SUPABASE_URL");
}

export function supabasePublishableKey(env: Env = process.env): string | undefined {
  return pick(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Enough to sign the admin in and to read and write as that admin. */
export function supabaseAuthConfigured(env: Env = process.env): boolean {
  return Boolean(supabaseUrl(env) && supabasePublishableKey(env));
}

/** ADMIN_EMAILS is a comma or space separated list. Compared case-insensitively. */
export function adminEmails(env: Env = process.env): string[] {
  return (env.ADMIN_EMAILS ?? "")
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, env: Env = process.env): boolean {
  if (!email) return false;
  return adminEmails(env).includes(email.trim().toLowerCase());
}

/** The coach talks to OpenRouter. Without a key the dashboard still works, and the coach is off. */
export function coachAvailable(env: Env = process.env): boolean {
  return Boolean(pick(env, "OPENROUTER_API_KEY"));
}

/** Where sign-in links return to when the request carries no host. */
export function siteUrl(env: Env = process.env): string {
  return pick(env, "NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
}

/**
 * Try-it mode: LINEUP_DEMO=1 opens /dashboard without Supabase or sign-in, and the page keeps
 * its data in this browser only (localStorage). Never active in a production build.
 */
export function demoMode(env: Env = process.env): boolean {
  return env.LINEUP_DEMO === "1" && env.NODE_ENV !== "production";
}
