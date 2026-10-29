import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import config from "@/lineup.config";
import { createSessionClient } from "@/lib/db/clients";
import { isAdminEmail, supabaseAuthConfigured } from "@/lib/db/env";
import { t } from "@/lib/i18n";

/**
 * What the emailed link shows while the browser hands its tokens to /login/session.
 * Supabase puts them in the address fragment (#access_token=...), which never reaches a
 * server, so a page has to read it. The script removes them from the address bar first,
 * so they are not left in history, then sends them over and moves on.
 */
function fragmentPage(): string {
  const lang = config.lang;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<title>${t(lang, "Entrar")}</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#001639;color:#fff;font:16px/1.5 system-ui,sans-serif}</style>
</head>
<body>
<p id="msg" role="status">${t(lang, "Entrando...")}</p>
<noscript><p>${t(lang, "Se necesita JavaScript para terminar de entrar.")}</p></noscript>
<script>
(function () {
  var params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, "", location.pathname);
  function go(reason) { location.replace("/login?error=" + reason); }
  var access = params.get("access_token");
  var refresh = params.get("refresh_token");
  if (!access || !refresh) { go("link"); return; }
  fetch("/login/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ access_token: access, refresh_token: refresh })
  })
    .then(function (r) { return r.json(); })
    .then(function (j) { if (j.ok) location.replace("/dashboard"); else go(j.reason || "link"); })
    .catch(function () { go("link"); });
})();
</script>
</body>
</html>`;
}

/**
 * Where the emailed sign-in link lands. Three link shapes are accepted:
 *   #access_token=...&refresh_token=...  the link the login form asks for (implicit flow):
 *                                        works in any browser or device, see fragmentPage
 *   ?code=...                            a PKCE link (only works in the browser that asked)
 *   ?token_hash=...&type=email           the custom email template variant (see README)
 * Whichever one, the person must then be in ADMIN_EMAILS, or the session is dropped.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url));

  if (!supabaseAuthConfigured()) return fail("config");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!code && !tokenHash) {
    return new Response(fragmentPage(), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" },
    });
  }

  const supabase = await createSessionClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && (type === "email" || type === "magiclink")) {
    ok = !(await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash })).error;
  }
  if (!ok) return fail("link");

  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return fail("not_admin");
  }
  return NextResponse.redirect(new URL("/dashboard", url));
}
