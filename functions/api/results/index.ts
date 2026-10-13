import {
  ensureSchema,
  fail,
  isAdmin,
  json,
  parseGame,
  readJson,
  type Env,
  type GameRow,
} from "../_lib";

interface Row {
  id: string;
  name: string;
  mode: "official" | "practice" | "room";
  room: string | null;
  score: number;
  bill: number;
  budget: number;
  saving_percent: number;
  rules_version: number;
  completed_at: string;
}
const toGame = (r: Row): GameRow => ({
  id: r.id,
  name: r.name,
  mode: r.mode,
  room: r.room,
  score: r.score,
  bill: r.bill,
  budget: r.budget,
  savingPercent: r.saving_percent,
  rulesVersion: r.rules_version,
  completedAt: r.completed_at,
});

export const onRequestGet: PagesFunction = async ({ env }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  await ensureSchema(e.DB);
  const { results } = await e.DB.prepare(
    "SELECT * FROM games ORDER BY score DESC, saving_percent DESC, completed_at ASC LIMIT 3000",
  ).all<Row>();
  return json({ ok: true, results: results.map(toGame) });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const read = await readJson(request, 4096);
  if (read.error) return read.error;
  const row = parseGame(read.body);
  if (typeof row === "string") return fail(400, row);
  await ensureSchema(e.DB);
  const existing = await e.DB.prepare("SELECT mode FROM games WHERE id = ?")
    .bind(row.id)
    .first<{ mode: string }>();
  // Idempotent: a retried submission reports what was stored the first time.
  if (existing) return json({ ok: true, mode: existing.mode, duplicate: true });
  await e.DB.prepare(
    "INSERT INTO games (id, name, mode, room, score, bill, budget, saving_percent, rules_version, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      row.id,
      row.name,
      row.mode,
      row.room,
      row.score,
      row.bill,
      row.budget,
      row.savingPercent,
      row.rulesVersion,
      row.completedAt,
    )
    .run();
  return json({ ok: true, mode: row.mode }, 201);
};

/** Admin only: DELETE /api/results?mode=practice | all */
export const onRequestDelete: PagesFunction = async ({ request, env }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  if (!isAdmin(request, e)) return fail(401, "Yönetim anahtarı geçersiz.");
  await ensureSchema(e.DB);
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode !== "practice" && mode !== "all")
    return fail(400, "mode=practice veya mode=all gerekli.");
  const res =
    mode === "all"
      ? await e.DB.prepare("DELETE FROM games").run()
      : await e.DB.prepare("DELETE FROM games WHERE mode = 'practice'").run();
  if (mode === "all") {
    // A full reset also clears the rooms.
    await e.DB.prepare("DELETE FROM room_players").run();
    await e.DB.prepare("DELETE FROM rooms").run();
  }
  return json({ ok: true, deleted: res.meta.changes });
};
