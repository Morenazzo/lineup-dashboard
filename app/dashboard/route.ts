import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import config from "@/lineup.config";
import { clientConfig, themeCss } from "@/lib/config";
import { getAdminSession } from "@/lib/db/auth";
import { coachAvailable, demoMode } from "@/lib/db/env";
import { dictionary } from "@/lib/i18n";
import { LINEUP_SHIM } from "@/lib/lineup/shim";
import { buildLineupPage } from "@/lib/lineup/page";

/**
 * The Lineup dashboard, for the admin only. The page is a single self-contained HTML
 * file (lib/lineup/lineup.html); this route checks the admin, then adds the config,
 * the strings of the chosen language and the script that connects the page to
 * /api/lineup, and sends it.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const demo = demoMode();
  const session = demo ? null : await getAdminSession();
  if (!demo && !session) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const html = await readFile(path.join(process.cwd(), "lib/lineup/lineup.html"), "utf8");
  const page = buildLineupPage(html, {
    title: config.appName,
    client: { config: clientConfig(config, !demo && coachAvailable()), strings: dictionary(config.lang) },
    themeCss: themeCss(config.theme),
    // In demo mode there is no shim: the page finds no window.claude and keeps its data in the browser.
    shim: demo ? "" : LINEUP_SHIM,
  });
  if (page === null) return new NextResponse("Lineup page is malformed", { status: 500 });

  return new NextResponse(page, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "same-origin",
    },
  });
}
