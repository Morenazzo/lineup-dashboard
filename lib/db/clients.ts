import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/db/env";

export class NotConfiguredError extends Error {
  constructor(what: string) {
    super(`${what} is not configured`);
    this.name = "NotConfiguredError";
  }
}

/**
 * Asks Supabase to email a sign-in link that works in any browser or device.
 *
 * The default (PKCE) link only works in the browser that asked for it, which fails when
 * the email opens in a mail app or on a phone. This client uses the implicit flow: the
 * link brings the tokens back in the address fragment, and /login/confirm hands them
 * to /login/session. Used for nothing else: it holds no session of its own.
 */
export function createLinkRequestClient() {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) throw new NotConfiguredError("Supabase auth");
  return createClient(url, key, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * The signed-in visitor's own client, bound to the request cookies. It obeys row
 * level security, so only a row in public.admins can read or write the dashboard data.
 */
export async function createSessionClient() {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) throw new NotConfiguredError("Supabase auth");
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read only.
          // proxy.ts refreshes the session on every dashboard request instead.
        }
      },
    },
  });
}
