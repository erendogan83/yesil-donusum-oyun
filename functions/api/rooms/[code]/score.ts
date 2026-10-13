import {
  cleanPlayerId,
  ensureSchema,
  fail,
  json,
  readJson,
  ROOM_PATTERN,
  type Env,
} from "../../_lib";

/** A player reports their current score (and finishing) so everyone sees a live ranking. */
export const onRequestPost: PagesFunction = async ({
  request,
  env,
  params,
}) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const code = String(params.code).toUpperCase();
  if (!ROOM_PATTERN.test(code)) return fail(400, "Oda kodu geçersiz.");
  const read = await readJson(request);
  if (read.error) return read.error;
  const playerId = cleanPlayerId(read.body.playerId);
  const score = read.body.score;
  const round = read.body.round;
  if (
    !playerId ||
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 2000 ||
    typeof round !== "number" ||
    !Number.isInteger(round) ||
    round < 1 ||
    round > 4
  )
    return fail(400, "Geçersiz puan bilgisi.");
  await ensureSchema(e.DB);
  const finished = read.body.finished === true ? 1 : 0;
  const res = await e.DB.prepare(
    "UPDATE room_players SET score = ?, round = ?, finished = CASE WHEN finished = 1 THEN 1 ELSE ? END, finished_at = CASE WHEN finished = 0 AND ? = 1 THEN ? ELSE finished_at END, last_seen = ? WHERE room_code = ? AND player_id = ?",
  )
    .bind(
      score,
      round,
      finished,
      finished,
      Date.now(),
      Date.now(),
      code,
      playerId,
    )
    .run();
  return res.meta.changes
    ? json({ ok: true })
    : fail(404, "Oyuncu odada değil.");
};
