import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/db/clients";
import { isAdminEmail, supabaseAuthConfigured } from "@/lib/db/env";
import { sameOrigin } from "@/lib/same-origin";

/**
 * Last step of the emailed sign-in link. /login/confirm receives the tokens in the
 * address fragment (the server never sees a fragment), so a tiny script there posts them
 * here. We start the session, and keep it only if the person is in ADMIN_EMAILS.
 */
export const dynamic = "force-dynamic";

function reply(body: { ok: boolean; reason?: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!supabaseAuthConfigured()) return reply({ ok: false, reason: "config" }, 503);
  if (!sameOrigin(request)) return reply({ ok: false, reason: "origin" }, 403);

  let tokens: { access_token?: unknown; refresh_token?: unknown };
  try {
    tokens = await request.json();
  } catch {
    return reply({ ok: false, reason: "link" }, 400);
  }
  const { access_token, refresh_token } = tokens;
  if (typeof access_token !== "string" || typeof refresh_token !== "string" || !access_token || !refresh_token) {
    return reply({ ok: false, reason: "link" }, 400);
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) return reply({ ok: false, reason: "link" }, 401);

  // getUser() asks Supabase Auth to validate the token, instead of trusting the one we were sent.
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return reply({ ok: false, reason: "not_admin" }, 403);
  }
  return reply({ ok: true });
}
