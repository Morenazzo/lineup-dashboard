import "server-only";
import { cache } from "react";
import { createSessionClient } from "@/lib/db/clients";
import { isAdminEmail, supabaseAuthConfigured } from "@/lib/db/env";

export interface AdminSession {
  email: string;
  /** The admin's own client. It obeys row level security. */
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
}

/**
 * The signed-in admin, or null. The token is checked with Supabase Auth on every
 * call (getUser), not just read from the cookie, and the email must be in
 * ADMIN_EMAILS. The database applies its own check on top (public.admins).
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!supabaseAuthConfigured()) return null;
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !isAdminEmail(email)) return null;
  return { email, supabase };
});
