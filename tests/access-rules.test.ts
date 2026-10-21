import type { PGlite, Transaction } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDatabase, failure, rows, run } from "./support/database";

/**
 * These tests talk to a real Postgres and check the rules where they actually live:
 * in the Row Level Security policies, grants and triggers from supabase/migrations.
 */

let db: PGlite;
const ids = {} as {
  workspace: string;
  admin: string;
  team: string;
  client: string;
  lumenClient: string;
  outsider: string;
  northwind: string;
  lumen: string;
  websiteProject: string;
  portalProject: string;
  menuTicket: string;
};

async function one<T>(sql: string, params: unknown[] = []) {
  const result = await db.query<T>(sql, params);
  return result.rows[0];
}

async function createUser(email: string, fullName: string, demo: boolean) {
  const user = await one<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify({ full_name: fullName, demo })],
  );
  return user.id;
}

beforeAll(async () => {
  db = await createDatabase();

  ids.admin = await createUser("demo-admin@example.com", "Ana Ribeiro", true);
  ids.team = await createUser("demo-team@example.com", "Theo Martins", true);
  ids.client = await createUser("demo-client@example.com", "Clara Nunes", true);
  ids.workspace = (await one<{ id: string }>("select private.seed_demo_workspace() as id")).id;

  // A second client user, from another client company of the same agency.
  ids.lumenClient = await createUser("marta@lumendental.example.com", "Marta Lima", true);
  ids.lumen = (await one<{ id: string }>("select id from public.clients where name = 'Lumen Dental'")).id;
  await db.query(
    "insert into public.memberships (workspace_id, user_id, role, client_id) values ($1, $2, 'client', $3)",
    [ids.workspace, ids.lumenClient, ids.lumen],
  );

  // Somebody who signed up on their own: they get a separate agency workspace.
  ids.outsider = await createUser("owner@another-agency.example.com", "Rui Costa", false);

  ids.northwind = (await one<{ id: string }>("select id from public.clients where name = 'Northwind Coffee'")).id;
  ids.websiteProject = (await one<{ id: string }>("select id from public.projects where name = 'Website redesign'")).id;
  ids.portalProject = (await one<{ id: string }>("select id from public.projects where name = 'Patient booking portal'")).id;
  ids.menuTicket = (
    await one<{ id: string }>("select id from public.tickets where title like 'Menu prices%'")
  ).id;
});

describe("client users", () => {
  it("only see their own company's projects and requests", async () => {
    const result = await run(db, as.user(ids.client), async (tx) => ({
      projects: await rows<{ name: string }>(tx, "select name from projects order by name"),
      clients: await rows<{ name: string }>(tx, "select name from clients"),
      requests: await rows<{ client_id: string }>(tx, "select client_id from tickets"),
    }));

    expect(result.projects.map((p) => p.name)).toEqual(["Online ordering", "Website redesign"]);
    expect(result.clients.map((c) => c.name)).toEqual(["Northwind Coffee"]);
    expect(result.requests).toHaveLength(4);
    expect(new Set(result.requests.map((r) => r.client_id))).toEqual(new Set([ids.northwind]));
  });

  it("never see internal notes", async () => {
    const messages = await run(db, as.user(ids.client), (tx) =>
      rows<{ is_internal: boolean }>(tx, "select is_internal from ticket_comments where ticket_id = $1", [
        ids.menuTicket,
      ]),
    );
    expect(messages).toHaveLength(2);
    expect(messages.every((m) => !m.is_internal)).toBe(true);
  });

  it("see agency staff and their own colleagues, but not people from other client companies", async () => {
    const names = await run(db, as.user(ids.client), (tx) =>
      rows<{ full_name: string }>(tx, "select full_name from profiles order by full_name"),
    );
    expect(names.map((n) => n.full_name)).toEqual(["Ana Ribeiro", "Clara Nunes", "Theo Martins"]);
  });

  it("can open a request on their own project, filed under their company whatever they send", async () => {
    const created = await run(db, as.user(ids.client), (tx) =>
      rows<{ client_id: string; workspace_id: string; status: string }>(
        tx,
        `insert into tickets (project_id, title, description, created_by)
         values ($1, 'Add our Instagram link', 'Bottom of every page, please.', $2)
         returning client_id, workspace_id, status`,
        [ids.websiteProject, ids.client],
      ),
    );
    expect(created[0]).toEqual({ client_id: ids.northwind, workspace_id: ids.workspace, status: "open" });
  });

  it("cannot open a request on another company's project", async () => {
    const error = await failure(db, as.user(ids.client), (tx) =>
      tx.query("insert into tickets (project_id, title, created_by) values ($1, 'Sneaky request', $2)", [
        ids.portalProject,
        ids.client,
      ]),
    );
    expect(error).toMatch(/row-level security/);
  });

  it("cannot open a request that is already resolved or assigned", async () => {
    const error = await failure(db, as.user(ids.client), (tx) =>
      tx.query(
        "insert into tickets (project_id, title, created_by, status) values ($1, 'Closed already', $2, 'resolved')",
        [ids.websiteProject, ids.client],
      ),
    );
    expect(error).toMatch(/row-level security/);
  });

  it("cannot change the status of a request", async () => {
    const changed = await run(db, as.user(ids.client), async (tx) => {
      const update = await tx.query("update tickets set status = 'resolved' where id = $1", [ids.menuTicket]);
      return update.affectedRows;
    });
    expect(changed).toBe(0);
  });

  it("cannot post internal notes", async () => {
    const error = await failure(db, as.user(ids.client), (tx) =>
      tx.query("insert into ticket_comments (ticket_id, author_id, body, is_internal) values ($1, $2, 'psst', true)", [
        ids.menuTicket,
        ids.client,
      ]),
    );
    expect(error).toMatch(/row-level security/);
  });

  it("can reply on their own requests", async () => {
    const reply = await run(db, as.user(ids.client), (tx) =>
      rows<{ workspace_id: string }>(
        tx,
        "insert into ticket_comments (ticket_id, author_id, body) values ($1, $2, 'Photo sent by email!') returning workspace_id",
        [ids.menuTicket, ids.client],
      ),
    );
    expect(reply[0].workspace_id).toBe(ids.workspace);
  });

  it("cannot reply on another company's requests", async () => {
    const lumenTicket = await one<{ id: string }>("select id from tickets where client_id = $1 limit 1", [ids.lumen]);
    const error = await failure(db, as.user(ids.client), (tx) =>
      tx.query("insert into ticket_comments (ticket_id, author_id, body) values ($1, $2, 'hello')", [
        lumenTicket.id,
        ids.client,
      ]),
    );
    expect(error).toMatch(/row-level security/);
  });
});

describe("agency team", () => {
  it("sees every project, request and message in the workspace", async () => {
    const counts = await run(db, as.user(ids.team), async (tx) => ({
      projects: (await rows(tx, "select id from projects")).length,
      requests: (await rows(tx, "select id from tickets")).length,
      messages: (await rows(tx, "select id from ticket_comments")).length,
      internal: (await rows(tx, "select id from ticket_comments where is_internal")).length,
    }));
    expect(counts).toEqual({ projects: 4, requests: 7, messages: 9, internal: 3 });
  });

  it("can move a request forward", async () => {
    const status = await run(db, as.user(ids.team), (tx) =>
      rows<{ status: string }>(tx, "update tickets set status = 'in_progress' where id = $1 returning status", [
        ids.menuTicket,
      ]),
    );
    expect(status[0].status).toBe("in_progress");
  });

  it("cannot add clients or read billing", async () => {
    const insertError = await failure(db, as.user(ids.team), (tx) =>
      tx.query("insert into clients (workspace_id, name) values ($1, 'New Client Co')", [ids.workspace]),
    );
    expect(insertError).toMatch(/row-level security/);

    const billing = await run(db, as.user(ids.team), (tx) => rows(tx, "select * from subscriptions"));
    expect(billing).toHaveLength(0);
  });

  it("needs the Pro plan for internal notes", async () => {
    const insertNote = (tx: Transaction) =>
      tx.query(
        "insert into ticket_comments (ticket_id, author_id, body, is_internal) values ($1, $2, 'Team only', true)",
        [ids.menuTicket, ids.team],
      );

    expect(await failure(db, as.user(ids.team), insertNote)).toMatch(/row-level security/);

    const onPro = await run(db, as.user(ids.team), insertNote, {
      setup: `update public.workspaces set plan = 'pro' where id = '${ids.workspace}'`,
    });
    expect(onPro.affectedRows).toBe(1);
  });

  it("can only assign requests to agency staff", async () => {
    const error = await failure(db, as.user(ids.team), (tx) =>
      tx.query("update tickets set assignee_id = $1 where id = $2", [ids.client, ids.menuTicket]),
    );
    expect(error).toMatch(/only be assigned to people on the agency team/);
  });
});

describe("admins", () => {
  it("are limited to 3 clients on the Free plan", async () => {
    const error = await failure(db, as.user(ids.admin), (tx) =>
      tx.query("insert into clients (workspace_id, name) values ($1, 'Fourth Client')", [ids.workspace]),
    );
    expect(error).toMatch(/Free plan includes up to 3 clients/);
  });

  it("can add more clients on Pro", async () => {
    const added = await run(
      db,
      as.user(ids.admin),
      (tx) =>
        rows<{ name: string }>(
          tx,
          "insert into clients (workspace_id, name) values ($1, 'Fourth Client') returning name",
          [ids.workspace],
        ),
      { setup: `update public.workspaces set plan = 'pro' where id = '${ids.workspace}'` },
    );
    expect(added[0].name).toBe("Fourth Client");
  });

  it("cannot upgrade their own plan without paying", async () => {
    const error = await failure(db, as.user(ids.admin), (tx) =>
      tx.query("update workspaces set plan = 'pro' where id = $1", [ids.workspace]),
    );
    expect(error).toMatch(/permission denied/);
  });

  it("cannot change their own role", async () => {
    const changed = await run(db, as.user(ids.admin), async (tx) => {
      const update = await tx.query("update memberships set role = 'team' where user_id = $1", [ids.admin]);
      return update.affectedRows;
    });
    expect(changed).toBe(0);
  });
});

describe("isolation between agencies", () => {
  it("someone from another agency sees none of this workspace", async () => {
    const seen = await run(db, as.user(ids.outsider), async (tx) => ({
      workspaces: await rows<{ name: string }>(tx, "select name from workspaces"),
      projects: (await rows(tx, "select id from projects")).length,
      requests: (await rows(tx, "select id from tickets")).length,
      people: (await rows(tx, "select id from profiles")).length,
    }));
    expect(seen).toEqual({ workspaces: [{ name: "Rui Costa's agency" }], projects: 0, requests: 0, people: 1 });
  });

  it("signed-out visitors can't read any table", async () => {
    const error = await failure(db, as.anon, (tx) => tx.query("select * from projects"));
    expect(error).toMatch(/permission denied/);
  });

  it("signed-out visitors can still call the health check", async () => {
    const health = await run(db, as.anon, (tx) => rows<{ ok: boolean }>(tx, "select public.healthcheck() as ok"));
    expect(health[0].ok).toBe(true);
  });
});

describe("billing sync", () => {
  it("turns Pro on and off from Stripe subscription statuses", async () => {
    const plans = await run(db, as.service, async (tx) => {
      const sync = (status: string) =>
        rows<{ plan: string }>(
          tx,
          `select public.sync_subscription($1, 'cus_test', 'sub_test', 'price_test', $2,
             now() + interval '30 days', false) as plan`,
          [ids.workspace, status],
        );
      const active = (await sync("active"))[0].plan;
      const pastDue = (await sync("past_due"))[0].plan;
      const workspace = await rows<{ stripe_customer_id: string }>(
        tx,
        "select stripe_customer_id from workspaces where id = $1",
        [ids.workspace],
      );
      return { active, pastDue, customer: workspace[0].stripe_customer_id };
    });
    expect(plans).toEqual({ active: "pro", pastDue: "free", customer: "cus_test" });
  });

  it("can't be called by signed-in users", async () => {
    const error = await failure(db, as.user(ids.admin), (tx) =>
      tx.query(
        "select public.sync_subscription($1, 'cus_x', 'sub_x', null, 'active', null, false)",
        [ids.workspace],
      ),
    );
    expect(error).toMatch(/permission denied/);
  });
});

describe("demo reset", () => {
  it("rebuilds the demo workspace from scratch", async () => {
    await db.query("update tickets set title = 'Vandalized title' where id = $1", [ids.menuTicket]);
    await db.query("select private.reset_demo()");

    const titles = await db.query<{ title: string }>(
      "select t.title from tickets t join workspaces w on w.id = t.workspace_id where w.is_demo",
    );
    expect(titles.rows).toHaveLength(7);
    expect(titles.rows.map((t) => t.title)).not.toContain("Vandalized title");
  });
});
