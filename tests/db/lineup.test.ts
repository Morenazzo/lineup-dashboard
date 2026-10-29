import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

/**
 * Runs the migrations in Postgres (PGlite) with Supabase's roles stubbed, then checks who
 * can touch public.lineup_docs: the admin, and nobody else.
 */

const read = (file: string) => readFileSync(path.join(process.cwd(), "supabase/migrations", file), "utf8");

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.jwt() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;

  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

const ADMIN = "admin@example.com";
const STRANGER = "someone@example.com";

type Role = "anon" | "authenticated";

let db: PGlite;

async function as<T>(role: Role, email: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    email ? JSON.stringify({ email, role }) : "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

const upsert = (coll: string, id: string, data: unknown) =>
  db.query(
    `insert into public.lineup_docs (coll, id, data) values ($1, $2, $3::jsonb)
     on conflict (coll, id) do update set data = excluded.data`,
    [coll, id, JSON.stringify(data)],
  );

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(read("20260101000000_admins.sql"));
  await db.exec(read("20260101000001_lineup.sql"));
  await db.query("insert into public.admins (email) values ($1)", [ADMIN]);
});

after(async () => {
  await db.close();
});

describe("public.admins", () => {
  test("is not readable or writable by signed-in users, even admins", async () => {
    await as("authenticated", ADMIN, async () => {
      await assert.rejects(db.query("select 1 from public.admins"), /permission denied/);
      await assert.rejects(db.query("insert into public.admins (email) values ('x@example.com')"), /permission denied/);
    });
  });

  test("emails must be lowercase", async () => {
    await assert.rejects(db.query("insert into public.admins (email) values ('Mixed@Example.com')"), /check constraint/);
  });

  test("is_admin matches the signed-in email case-insensitively, and only for listed admins", async () => {
    const check = async (email: string | null, role: Role) =>
      as(role, email, async () => (await db.query<{ ok: boolean }>("select public.is_admin() as ok")).rows[0].ok);
    assert.equal(await check(ADMIN, "authenticated"), true);
    assert.equal(await check(ADMIN.toUpperCase(), "authenticated"), true);
    assert.equal(await check(STRANGER, "authenticated"), false);
  });
});

describe("public.lineup_docs", () => {
  test("an admin can save, update, read and delete a document", async () => {
    await as("authenticated", ADMIN, async () => {
      await upsert("reports", "2026-10-20", { date: "2026-10-20", mrr: 3500 });
      await upsert("reports", "2026-10-20", { date: "2026-10-20", mrr: 8500 });
      const rows = (await db.query<{ data: { mrr: number } }>("select data from public.lineup_docs where coll = 'reports'")).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].data.mrr, 8500);
      await db.query("delete from public.lineup_docs where coll = 'reports' and id = '2026-10-20'");
      const left = await db.query("select 1 from public.lineup_docs");
      assert.equal(left.rows.length, 0);
    });
  });

  test("a signed-in stranger sees nothing and cannot write", async () => {
    await as("authenticated", ADMIN, () => upsert("game", "config", { startMRR: 0 }));
    await as("authenticated", STRANGER, async () => {
      const rows = await db.query("select 1 from public.lineup_docs");
      assert.equal(rows.rows.length, 0);
      await assert.rejects(upsert("game", "config", { startMRR: 999999 }), /row-level security/);
      await db.query("delete from public.lineup_docs");
    });
    const still = await db.query("select 1 from public.lineup_docs where coll = 'game'");
    assert.equal(still.rows.length, 1);
  });

  test("an anonymous visitor has no access at all", async () => {
    await as("anon", null, async () => {
      await assert.rejects(db.query("select 1 from public.lineup_docs"), /permission denied/);
      await assert.rejects(upsert("game", "config", {}), /permission denied/);
    });
  });

  test("only the six known collections and tidy ids are accepted", async () => {
    await as("authenticated", ADMIN, async () => {
      await upsert("deals", "d1", { name: "Ana", stage: "prospecto" });
      await assert.rejects(upsert("secrets", "x", {}), /check constraint/);
      await assert.rejects(upsert("reports", "has space", {}), /check constraint/);
      await assert.rejects(upsert("reports", "ok", [] as unknown), /check constraint/);
    });
  });
});
