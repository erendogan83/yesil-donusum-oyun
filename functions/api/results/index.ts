import {
  ensureSchema,
  fail,
  isAdmin,
  json,
  knownOrganization,
  parseResult,
  type Env,
  type ResultRow,
} from "../_lib";

interface Row {
  id: string;
  organization: string;
  first_name: string;
  second_name: string;
  mode: "official" | "practice";
  score: number;
  bill: number;
  budget: number;
  saving_percent: number;
  rules_version: number;
  completed_at: string;
}
const toResult = (r: Row): ResultRow => ({
  id: r.id,
  organization: r.organization,
  first: r.first_name,
  second: r.second_name,
  mode: r.mode,
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
    "SELECT * FROM results ORDER BY score DESC, saving_percent DESC, completed_at ASC LIMIT 2000",
  ).all<Row>();
  return json({ ok: true, results: results.map(toResult) });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const raw = await request.text();
  if (raw.length > 4096) return fail(413, "Veri çok büyük.");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Geçersiz JSON.");
  }
  const row = parseResult(body);
  if (typeof row === "string") return fail(400, row);
  await ensureSchema(e.DB);
  const existing = await e.DB.prepare("SELECT mode FROM results WHERE id = ?")
    .bind(row.id)
    .first<{ mode: string }>();
  // Idempotent: a retried submission reports what was stored the first time.
  if (existing) return json({ ok: true, mode: existing.mode, duplicate: true });
  let mode = row.mode;
  // Only listed cooperatives can compete officially.
  if (
    mode === "official" &&
    !(await knownOrganization(e, request, row.organization))
  )
    mode = "practice";
  const insert = (m: string) =>
    e
      .DB!.prepare(
        "INSERT INTO results (id, organization, first_name, second_name, mode, score, bill, budget, saving_percent, rules_version, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        row.id,
        row.organization,
        row.first,
        row.second,
        m,
        row.score,
        row.bill,
        row.budget,
        row.savingPercent,
        row.rulesVersion,
        row.completedAt,
      )
      .run();
  await insert(mode);
  return json({ ok: true, mode, downgraded: mode !== row.mode }, 201);
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
      ? await e.DB.prepare("DELETE FROM results").run()
      : await e.DB.prepare("DELETE FROM results WHERE mode = 'practice'").run();
  return json({ ok: true, deleted: res.meta.changes });
};
