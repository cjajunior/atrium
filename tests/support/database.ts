import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Spins up a real Postgres (PGlite, in-process) with the small part of Supabase
 * the migrations rely on: the anon/authenticated/service_role roles, auth.users
 * and auth.uid(). Then it runs every migration in supabase/migrations, except the
 * pg_cron schedule, which only exists on Supabase.
 */
const SUPABASE_STUBS = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create schema extensions;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    encrypted_password text
  );

  create function auth.uid() returns uuid
  language sql stable
  as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;

  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;

  -- Supabase grants these by default on everything created in the public schema.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "supabase", "migrations");

export async function createDatabase() {
  const db = await PGlite.create();
  await db.exec(SUPABASE_STUBS);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes("schedule"))
    .sort();

  for (const file of files) {
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }

  return db;
}

export type Actor = { kind: "user"; id: string } | { kind: "anon" } | { kind: "service" };

export const as = {
  user: (id: string): Actor => ({ kind: "user", id }),
  anon: { kind: "anon" } as Actor,
  service: { kind: "service" } as Actor,
};

const ROLLBACK = Symbol("rollback");

type Options = {
  /** SQL run as the database owner before switching to the actor (still rolled back). */
  setup?: string;
};

/**
 * Runs `work` inside a transaction as the given actor, exactly like a request coming
 * through Supabase's API would, then rolls everything back so tests stay independent.
 */
export async function run<T>(
  db: PGlite,
  actor: Actor,
  work: (tx: Transaction) => Promise<T>,
  options: Options = {},
): Promise<T> {
  let result: T | undefined;
  try {
    await db.transaction(async (tx) => {
      if (options.setup) await tx.exec(options.setup);

      if (actor.kind === "user") {
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: actor.id, role: "authenticated" }),
        ]);
        await tx.exec("set local role authenticated");
      } else if (actor.kind === "anon") {
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ role: "anon" }),
        ]);
        await tx.exec("set local role anon");
      } else {
        await tx.exec("set local role service_role");
      }

      result = await work(tx);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }
  return result as T;
}

/** Like `run`, but expects the work to fail and returns the database error message. */
export async function failure(
  db: PGlite,
  actor: Actor,
  work: (tx: Transaction) => Promise<unknown>,
  options: Options = {},
): Promise<string> {
  try {
    await run(db, actor, work, options);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected the database to reject this, but it succeeded.");
}

export async function rows<T>(tx: Transaction, sql: string, params: unknown[] = []) {
  const response = await tx.query<T>(sql, params);
  return response.rows;
}
