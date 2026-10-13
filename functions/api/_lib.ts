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
    "CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, host_id TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, started_at INTEGER)",
    "CREATE TABLE IF NOT EXISTS room_players (room_code TEXT NOT NULL, player_id TEXT NOT NULL, name TEXT NOT NULL, joined_at INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0, round INTEGER NOT NULL DEFAULT 1, finished INTEGER NOT NULL DEFAULT 0, finished_at INTEGER, PRIMARY KEY (room_code, player_id))",
  ])
    await db.prepare(sql).run();
  ready = true;
}

const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : null;
export const ID_PATTERN = /^[\w-]{8,64}$/;
export const ROOM_PATTERN = /^[A-Z0-9]{4,8}$/;

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
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newRoomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
};
export interface RoomPlayerRow {
  player_id: string;
  name: string;
  score: number;
  round: number;
  finished: number;
}
export const STALE_ROOM_MS = 24 * 3600 * 1000;

/** Public view of a room; "finished" once every player has finished. */
export async function roomState(db: D1, code: string) {
  const room = await db
    .prepare("SELECT * FROM rooms WHERE code = ?")
    .bind(code)
    .first<{
      code: string;
      host_id: string;
      status: string;
      created_at: number;
      started_at: number | null;
    }>();
  if (!room || Date.now() - room.created_at > STALE_ROOM_MS) return null;
  const { results } = await db
    .prepare(
      "SELECT player_id, name, score, round, finished FROM room_players WHERE room_code = ? ORDER BY score DESC, joined_at ASC",
    )
    .bind(code)
    .all<RoomPlayerRow>();
  const everyoneDone = results.length > 0 && results.every((p) => p.finished);
  return {
    code: room.code,
    hostId: room.host_id,
    status:
      room.status === "playing" && everyoneDone ? "finished" : room.status,
    startedAt: room.started_at,
    now: Date.now(),
    players: results.map((p) => ({
      id: p.player_id,
      name: p.name,
      score: p.score,
      round: p.round,
      finished: !!p.finished,
    })),
  };
}
