import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { demoMode, isAdminEmail, supabasePublishableKey, supabaseUrl } from "@/lib/db/env";

/**
 * Guards /dashboard. Next 16 calls this file "proxy" (it was "middleware").
 *
 * It does two jobs: keep the Supabase session fresh on every dashboard request, and
 * send anyone who is not a signed-in admin to the login page. It is the first
 * line, not the only one: the dashboard route and every /api/lineup handler check
 * the admin again on their own (lib/db/auth.ts), because a proxy matcher can be
 * changed or bypassed by moving code around.
 */
export async function proxy(request: NextRequest) {
  if (demoMode()) return NextResponse.next();

  const toLogin = (reason?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = reason ? `?error=${reason}` : "";
    return NextResponse.redirect(url);
  };

  const url = supabaseUrl();
  const key = supabasePublishableKey();
  // Supabase is not configured: nothing to sign in to, so the dashboard stays closed.
  if (!url || !key) return toLogin("config");

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() validates the token with Supabase Auth and refreshes it when it is close to expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return toLogin();
  if (!isAdminEmail(user.email)) return toLogin("not_admin");
  return response;
}

export const config = {
  matcher: ["/dashboard"],
};
