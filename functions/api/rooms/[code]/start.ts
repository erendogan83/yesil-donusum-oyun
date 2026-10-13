import {
  cleanPlayerId,
  ensureSchema,
  fail,
  json,
  readJson,
  roomState,
  ROOM_PATTERN,
  type Env,
} from "../../_lib";

/** The countdown everyone sees before the timed game begins, in milliseconds. */
const COUNTDOWN_MS = 5000;

/** Host only: starts the game for everyone at the same server time. */
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
  await ensureSchema(e.DB);
  // Reading the state first hands the host role on if the host was too slow or is gone.
  const room = await roomState(e.DB, code, e, playerId);
  if (!room) return fail(404, "Oda bulunamadı.");
  if (!playerId || room.hostId !== playerId)
    return fail(403, "Oyunu yalnızca odayı kuran başlatabilir.");
  if (room.status === "lobby")
    await e.DB.prepare(
      "UPDATE rooms SET status = 'playing', started_at = ? WHERE code = ? AND status = 'lobby'",
    )
      .bind(Date.now() + COUNTDOWN_MS, code)
      .run();
  return json({ ok: true, room: await roomState(e.DB, code, e, playerId) });
};
