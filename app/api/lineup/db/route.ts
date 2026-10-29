import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/db/auth";
import { parseCollection, parseRef, parseWrite } from "@/lib/lineup/validate";
import { sameOrigin } from "@/lib/same-origin";

/**
 * Storage for the Lineup page at /dashboard. Every call checks the admin on its own
 * and talks to Supabase as that admin, so row level security (public.is_admin) is a
 * second lock behind this one.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** One collection, whole. Reports are one per day, so this stays small for years. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return reply({ error: "unauthenticated" }, 401);

  const coll = parseCollection(request.nextUrl.searchParams.get("coll"));
  if (!coll) return reply({ error: "bad_request" }, 400);

  const { data, error } = await session.supabase
    .from("lineup_docs")
    .select("id, data")
    .eq("coll", coll)
    .order("id")
    .range(0, 4999);
  if (error) {
    console.error("lineup read failed:", error.code ?? "unknown");
    return reply({ error: "unavailable" }, error.code === "42501" ? 403 : 503);
  }
  return reply({ docs: data });
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "origin" }, 403);
  const session = await getAdminSession();
  if (!session) return reply({ error: "unauthenticated" }, 401);

  const write = parseWrite(await readJson(request));
  if (write === "too_large") return reply({ error: "too_large" }, 413);
  if (!write) return reply({ error: "bad_request" }, 400);

  const { error } = await session.supabase
    .from("lineup_docs")
    .upsert({ coll: write.coll, id: write.id, data: write.data, updated_at: new Date().toISOString() });
  if (error) {
    console.error("lineup write failed:", error.code ?? "unknown");
    return reply({ error: "unavailable" }, error.code === "42501" ? 403 : 503);
  }
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "origin" }, 403);
  const session = await getAdminSession();
  if (!session) return reply({ error: "unauthenticated" }, 401);

  const ref = parseRef(await readJson(request));
  if (!ref) return reply({ error: "bad_request" }, 400);

  const { error } = await session.supabase.from("lineup_docs").delete().eq("coll", ref.coll).eq("id", ref.id);
  if (error) {
    console.error("lineup delete failed:", error.code ?? "unknown");
    return reply({ error: "unavailable" }, error.code === "42501" ? 403 : 503);
  }
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}
