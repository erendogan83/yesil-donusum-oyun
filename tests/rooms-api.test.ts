// Room API against an in-memory SQLite database standing in for Cloudflare D1.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { D1, D1Prepared, Env } from "../functions/api/_lib";
import { DEFAULT_HOST_START_MS, HOST_EXTEND_MS } from "../functions/api/_lib";
import { onRequestPost as create } from "../functions/api/rooms/index";
import { onRequestPost as join } from "../functions/api/rooms/[code]/join";
import { onRequestPost as extend } from "../functions/api/rooms/[code]/extend";
import { onRequestPost as startGame } from "../functions/api/rooms/[code]/start";

type Sqlite = {
  prepare(sql: string): {
    run(...v: unknown[]): { changes: number | bigint };
    all(...v: unknown[]): unknown[];
    get(...v: unknown[]): unknown;
  };
};
// ensureSchema remembers it ran, so every test shares one database.
let shared: Promise<D1 | null> | undefined;
const memoryDb = () => (shared ??= openMemoryDb());
async function openMemoryDb(): Promise<D1 | null> {
  let sqlite: Sqlite;
  try {
    const { DatabaseSync } = await import("node:sqlite");
    sqlite = new DatabaseSync(":memory:") as unknown as Sqlite;
  } catch {
    return null; // Older Node without node:sqlite: skip.
  }
  const prepared = (sql: string, values: unknown[] = []): D1Prepared => ({
    bind: (...v) => prepared(sql, v),
    run: async () => ({
      meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) },
    }),
    all: async <T>() => ({
      results: sqlite.prepare(sql).all(...values) as T[],
    }),
    first: async <T>() =>
      (sqlite.prepare(sql).get(...values) ?? null) as T | null,
  });
  return { prepare: (sql) => prepared(sql) };
}

const call = async (
  handler: unknown,
  env: Env,
  body: Record<string, unknown>,
  code?: string,
) => {
  const res = await (
    handler as (c: {
      request: Request;
      env: Env;
      params: Record<string, string>;
    }) => Promise<Response>
  )({
    request: new Request("https://x.test/api", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    env,
    params: { code: code ?? "" },
  });
  return { status: res.status, data: (await res.json()) as any };
};
const HOST = "host-0000-0001";
const GUEST = "guest-0000-0002";

test("rooms give the host two minutes and are timed unless the creator says otherwise", async (t) => {
  const DB = await memoryDb();
  if (!DB) return t.skip("node:sqlite is not available");
  const env: Env = { DB };
  const timed = await call(create, env, {
    playerId: HOST,
    name: "Ece",
    room: "Zamanli",
  });
  assert.equal(timed.status, 201);
  assert.equal(timed.data.room.timed, true);
  assert.equal(timed.data.room.hostStartMs, 120_000);
  assert.equal(DEFAULT_HOST_START_MS, 120_000);

  const untimed = await call(create, env, {
    playerId: HOST,
    name: "Ece",
    room: "Suresiz",
    timed: false,
  });
  assert.equal(untimed.data.room.timed, false);
  // Everyone who joins sees the same kind of room.
  const guest = await call(
    join,
    env,
    { playerId: GUEST, name: "Can" },
    "SURESIZ",
  );
  assert.equal(guest.data.room.timed, false);
});

test("only the host can add time, in minute steps, up to a ceiling", async (t) => {
  const DB = await memoryDb();
  if (!DB) return t.skip("node:sqlite is not available");
  const env: Env = { DB };
  const made = await call(create, env, {
    playerId: HOST,
    name: "Ece",
    room: "Uzat",
  });
  const before = made.data.room;
  await call(join, env, { playerId: GUEST, name: "Can" }, "UZAT");

  const refused = await call(extend, env, { playerId: GUEST }, "UZAT");
  assert.equal(refused.status, 403);

  const more = await call(extend, env, { playerId: HOST }, "UZAT");
  assert.equal(more.status, 200);
  const deadline = (r: { hostSince: number; hostStartMs: number }) =>
    r.hostSince + r.hostStartMs;
  assert.equal(
    deadline(more.data.room) - deadline(before),
    HOST_EXTEND_MS,
    "one press adds a minute",
  );
  assert.equal(more.data.room.hostId, HOST, "the host keeps the role");

  // Pressing again and again never pushes the deadline past ten minutes from now.
  let last = more.data.room;
  for (let i = 0; i < 30; i++)
    last = (await call(extend, env, { playerId: HOST }, "UZAT")).data.room;
  assert(deadline(last) - Date.now() <= 10 * 60_000 + 1000);
  assert(deadline(last) - Date.now() > 9 * 60_000);

  // Once the game has started there is nothing left to extend.
  await call(startGame, env, { playerId: HOST }, "UZAT");
  const late = await call(extend, env, { playerId: HOST }, "UZAT");
  assert.equal(late.status, 409);
});
