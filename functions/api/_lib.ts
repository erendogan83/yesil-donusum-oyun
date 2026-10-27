// Shared helpers for the API (Cloudflare Pages Functions + D1): shared leaderboard and rooms.
// Minimal structural types keep the project free of @cloudflare/workers-types.
export interface D1Prepared {
  bind(...values: unknown[]): D1Prepared;
  run(): Promise<{ meta: { changes: number } }>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}
export interface D1 {
  prepare(query: string): D1Prepared;
}
export interface Env {
  DB?: D1;
  ADMIN_TOKEN?: string;
  /** Test overrides (milliseconds) for the host start deadline and the "still here" window. */
  HOST_START_MS?: string;
  PRESENT_MS?: string;
}
export type Mode = "official" | "practice" | "room";
export interface GameRow {
  id: string;
  name: string;
  mode: Mode;
  room: string | null;
  score: number;
  bill: number;
  budget: number;
  savingPercent: number;
  rulesVersion: number;
  completedAt: string;
}
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
export const fail = (status: number, error: string) =>
  json({ ok: false, error }, status);

let ready = false;
export async function ensureSchema(db: D1) {
  if (ready) return;
  for (const sql of [
    // Cooperatives are gone: the old table is dropped together with its data.
    "DROP TABLE IF EXISTS results",
    "CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, name TEXT NOT NULL, mode TEXT NOT NULL, room TEXT, score INTEGER NOT NULL, bill REAL NOT NULL, budget REAL NOT NULL, saving_percent REAL NOT NULL, rules_version INTEGER NOT NULL, completed_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE INDEX IF NOT EXISTS ix_games_rank ON games(mode, score DESC)",
    "CREATE INDEX IF NOT EXISTS ix_games_room ON games(room)",
    "CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', host_id TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, started_at INTEGER, host_since INTEGER NOT NULL DEFAULT 0, timed INTEGER NOT NULL DEFAULT 1)",
    "CREATE TABLE IF NOT EXISTS room_players (room_code TEXT NOT NULL, player_id TEXT NOT NULL, name TEXT NOT NULL, joined_at INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0, round INTEGER NOT NULL DEFAULT 1, finished INTEGER NOT NULL DEFAULT 0, finished_at INTEGER, last_seen INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (room_code, player_id))",
  ])
    await db.prepare(sql).run();
  // Tables created by an earlier deployment lack the newer columns.
  for (const sql of [
    "ALTER TABLE rooms ADD COLUMN host_since INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE rooms ADD COLUMN title TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE rooms ADD COLUMN timed INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE room_players ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0",
  ])
    try {
      await db.prepare(sql).run();
    } catch {
      /* The column already exists. */
    }
  ready = true;
}

const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : null;
export const ID_PATTERN = /^[\w-]{8,64}$/;
export const ROOM_PATTERN = /^[A-Z0-9]{2,24}$/;
const TURKISH: Record<string, string> = {
  ç: "C",
  Ç: "C",
  ğ: "G",
  Ğ: "G",
  ı: "I",
  İ: "I",
  ö: "O",
  Ö: "O",
  ş: "S",
  Ş: "S",
  ü: "U",
  Ü: "U",
};
/** A room is found by its name: "Muhasebe 3" and "muhasebe3" are the same room. */
export const roomSlug = (name: string) =>
  name
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => TURKISH[c] ?? c)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24);

/** Validates a finished game sent by a client; returns the clean row or an error. */
export function parseGame(body: unknown): GameRow | string {
  if (!body || typeof body !== "object") return "Geçersiz veri.";
  const b = body as Record<string, unknown>;
  const id = typeof b.id === "string" && ID_PATTERN.test(b.id) ? b.id : null;
  const name = text(b.name, 80);
  const mode =
    b.mode === "official" || b.mode === "practice" || b.mode === "room"
      ? b.mode
      : null;
  const room =
    typeof b.room === "string" && ROOM_PATTERN.test(b.room) ? b.room : null;
  const score = num(b.score, 0, 2000);
  const bill = num(b.bill, 0, 1_000_000);
  const budget = num(b.budget, 0, 10_000_000);
  const savingPercent = num(b.savingPercent, -1000, 1000);
  const completedAt =
    typeof b.completedAt === "string" &&
    Number.isFinite(Date.parse(b.completedAt)) &&
    Date.parse(b.completedAt) < Date.now() + 86_400_000
      ? b.completedAt
      : null;
  if (
    !id ||
    !name ||
    !mode ||
    (mode === "room" && !room) ||
    score === null ||
    !Number.isInteger(score) ||
    bill === null ||
    budget === null ||
    savingPercent === null ||
    b.rulesVersion !== 1 ||
    !completedAt
  )
    return "Eksik veya geçersiz alan.";
  return {
    id,
    name,
    mode,
    room: mode === "room" ? room : null,
    score,
    bill,
    budget,
    savingPercent,
    rulesVersion: 1,
    completedAt,
  };
}

export async function readJson(request: Request, limit = 2048) {
  const raw = await request.text();
  if (raw.length > limit) return { error: fail(413, "Veri çok büyük.") };
  try {
    return { body: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { error: fail(400, "Geçersiz JSON.") };
  }
}
export const cleanName = (v: unknown) => text(v, 40);
export const cleanPlayerId = (v: unknown) =>
  typeof v === "string" && ID_PATTERN.test(v) ? v : null;

/** Bearer token check; false when ADMIN_TOKEN is not configured. */
export function isAdmin(request: Request, env: Env) {
  const expected = env.ADMIN_TOKEN?.trim();
  const raw = (request.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  let given = raw;
  try {
    // The client percent-encodes the token so non-Latin-1 characters survive.
    given = decodeURIComponent(raw);
  } catch {
    /* Not encoded: compare as sent. */
  }
  if (!expected || !given) return false;
  let diff = expected.length ^ given.length;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ (given.charCodeAt(i) || 0);
  return diff === 0;
}

// ---- rooms
/** The room named in a URL path; "" when it cannot be decoded. */
export const roomFromParam = (value: unknown) => {
  try {
    return roomSlug(decodeURIComponent(String(value)));
  } catch {
    return "";
  }
};
export interface RoomPlayerRow {
  player_id: string;
  name: string;
  score: number;
  round: number;
  finished: number;
  joined_at: number;
  last_seen: number;
}
export const STALE_ROOM_MS = 24 * 3600 * 1000;
/** A host who has not started the game within two minutes loses the role to the next player. */
export const DEFAULT_HOST_START_MS = 120_000;
/** One "add time" press gives the host this much more, never more than MAX_HOST_WAIT_MS in all. */
export const HOST_EXTEND_MS = 60_000;
export const MAX_HOST_WAIT_MS = 10 * 60_000;
/** A player who has not been heard from for this long is treated as gone. */
export const DEFAULT_PRESENT_MS = 20_000;
const ms = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

interface RoomRow {
  code: string;
  title: string;
  host_id: string;
  status: string;
  created_at: number;
  started_at: number | null;
  host_since: number;
  /** 0 when the room was created without a clock. */
  timed: number;
}

/**
 * Public view of a room. Along the way it hands the host role on: when the host has left,
 * has gone silent, or did not start the game in time, the next present player (in join
 * order) becomes the host. "finished" once every present player has finished.
 * `viewer` marks the asking player as present.
 */
export async function roomState(
  db: D1,
  code: string,
  env: Env = {},
  viewer?: string | null,
) {
  const now = Date.now();
  const hostStartMs = ms(env.HOST_START_MS, DEFAULT_HOST_START_MS);
  const presentMs = ms(env.PRESENT_MS, DEFAULT_PRESENT_MS);
  const room = await db
    .prepare("SELECT * FROM rooms WHERE code = ?")
    .bind(code)
    .first<RoomRow>();
  if (!room || now - room.created_at > STALE_ROOM_MS) return null;
  if (viewer)
    await db
      .prepare(
        "UPDATE room_players SET last_seen = ? WHERE room_code = ? AND player_id = ?",
      )
      .bind(now, code, viewer)
      .run();
  const { results } = await db
    .prepare(
      "SELECT player_id, name, score, round, finished, joined_at, last_seen FROM room_players WHERE room_code = ? ORDER BY joined_at ASC",
    )
    .bind(code)
    .all<RoomPlayerRow>();
  const present = (p: RoomPlayerRow) => now - p.last_seen <= presentMs;

  let hostId = room.host_id;
  let hostSince = room.host_since || room.created_at;
  if (room.status === "lobby") {
    const host = results.find((p) => p.player_id === hostId);
    const overdue = now - hostSince > hostStartMs;
    if (!host || !present(host) || overdue) {
      // The next present player after the current host, wrapping around.
      const order = results.filter((p) => present(p) && p.player_id !== hostId);
      const after = host
        ? order.find((p) => p.joined_at >= host.joined_at)
        : undefined;
      const next = after ?? order[0];
      if (next) {
        hostId = next.player_id;
        hostSince = now;
        await db
          .prepare(
            "UPDATE rooms SET host_id = ?, host_since = ? WHERE code = ?",
          )
          .bind(hostId, hostSince, code)
          .run();
      }
    }
  }
  const waiting = results.filter((p) => !p.finished && present(p));
  const everyoneDone = results.some((p) => p.finished) && waiting.length === 0;
  const ranked = [...results].sort(
    (a, b) => b.score - a.score || a.joined_at - b.joined_at,
  );
  return {
    code: room.code,
    title: room.title || room.code,
    hostId,
    hostSince,
    hostStartMs,
    timed: room.timed !== 0,
    status:
      room.status === "playing" && everyoneDone ? "finished" : room.status,
    startedAt: room.started_at,
    now,
    players: ranked.map((p) => ({
      id: p.player_id,
      name: p.name,
      score: p.score,
      round: p.round,
      finished: !!p.finished,
      present: present(p),
    })),
  };
}
