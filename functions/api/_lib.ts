// Shared helpers for the leaderboard API (Cloudflare Pages Functions + D1).
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
  ASSETS?: { fetch(request: Request | string): Promise<Response> };
}
export type Mode = "official" | "practice";
export interface ResultRow {
  id: string;
  organization: string;
  first: string;
  second: string;
  mode: Mode;
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
    "CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, organization TEXT NOT NULL, first_name TEXT NOT NULL, second_name TEXT NOT NULL, mode TEXT NOT NULL CHECK (mode IN ('official','practice')), score INTEGER NOT NULL, bill REAL NOT NULL, budget REAL NOT NULL, saving_percent REAL NOT NULL, rules_version INTEGER NOT NULL, completed_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_official_org ON results(organization) WHERE mode = 'official'",
    "CREATE INDEX IF NOT EXISTS ix_results_rank ON results(mode, score DESC)",
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

/** Validates a client submission; returns the clean row or an error message. */
export function parseResult(body: unknown): ResultRow | string {
  if (!body || typeof body !== "object") return "Geçersiz veri.";
  const b = body as Record<string, unknown>;
  const id =
    typeof b.id === "string" && /^[\w-]{8,64}$/.test(b.id) ? b.id : null;
  const organization = text(b.organization, 180);
  const first = text(b.first, 80);
  const second = text(b.second, 80);
  const mode = b.mode === "official" || b.mode === "practice" ? b.mode : null;
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
    !organization ||
    !first ||
    !second ||
    !mode ||
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
    organization,
    first,
    second,
    mode,
    score,
    bill,
    budget,
    savingPercent,
    rulesVersion: 1,
    completedAt,
  };
}

export async function knownOrganization(
  env: Env,
  request: Request,
  name: string,
) {
  if (!env.ASSETS) return true;
  try {
    const res = await env.ASSETS.fetch(
      new URL("/organizations.json", request.url).toString(),
    );
    const list: unknown = await res.json();
    return Array.isArray(list) ? list.includes(name) : true;
  } catch {
    return true; // Never block a result because the list could not be read.
  }
}

/** Bearer token check; false when ADMIN_TOKEN is not configured. */
export function isAdmin(request: Request, env: Env) {
  const expected = env.ADMIN_TOKEN;
  const given = (request.headers.get("Authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!expected || !given) return false;
  let diff = expected.length ^ given.length;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ (given.charCodeAt(i) || 0);
  return diff === 0;
}
