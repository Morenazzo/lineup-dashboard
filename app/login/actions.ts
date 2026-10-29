"use server";

import { headers } from "next/headers";
import { createLinkRequestClient } from "@/lib/db/clients";
import { isAdminEmail, siteUrl, supabaseAuthConfigured } from "@/lib/db/env";
import { createRateLimiter } from "@/lib/rate-limit";

export interface LoginState {
  sent: boolean;
  /** The text was not an email address. */
  invalid?: boolean;
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

// A handful of attempts per address and per network is plenty for one admin.
const allowPerIp = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 8 });
const allowPerEmail = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 3 });

/** The origin the sign-in link should return to: this deployment, else NEXT_PUBLIC_SITE_URL. */
function originFrom(requestHeaders: Headers): string {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return siteUrl();
  const forwarded = requestHeaders.get("x-forwarded-proto");
  const proto = forwarded ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Emails a sign-in link. The answer is the same whether or not the address is an
 * admin, so the form cannot be used to find out who the admins are.
 */
export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { sent: false, invalid: true };

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowPerIp(ip) || !allowPerEmail(email)) return { sent: true };
  if (!supabaseAuthConfigured() || !isAdminEmail(email)) return { sent: true };

  try {
    const supabase = createLinkRequestClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${originFrom(requestHeaders)}/login/confirm`,
        // First sign-in creates the Supabase user. Safe because only addresses in
        // ADMIN_EMAILS reach this line, and the database checks public.admins anyway.
        shouldCreateUser: true,
      },
    });
    if (error) console.error("sign-in link failed:", error.code ?? error.status ?? "unknown");
  } catch (error) {
    console.error("sign-in link failed:", error instanceof Error ? error.name : "unknown");
  }
  return { sent: true };
}
