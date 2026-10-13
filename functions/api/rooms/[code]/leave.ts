import {
  cleanPlayerId,
  ensureSchema,
  fail,
  json,
  readJson,
  roomState,
  ROOM_PATTERN,
  roomFromParam,
  type Env,
} from "../../_lib";

/**
 * A player leaves. In the lobby the seat is freed; during a game the player stays in the
 * ranking but counts as gone. The host role passes on, and an empty room is deleted.
 */
export const onRequestPost: PagesFunction = async ({
  request,
  env,
  params,
}) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const code = roomFromParam(params.code);
  if (!ROOM_PATTERN.test(code)) return fail(400, "Oda adı geçersiz.");
  const read = await readJson(request);
  if (read.error) return read.error;
  const playerId = cleanPlayerId(read.body.playerId);
  if (!playerId) return fail(400, "Oyuncu bilgisi eksik.");
  await ensureSchema(e.DB);
  const room = await roomState(e.DB, code, e);
  if (!room) return json({ ok: true });
  if (room.status === "lobby")
    await e.DB.prepare(
      "DELETE FROM room_players WHERE room_code = ? AND player_id = ?",
    )
      .bind(code, playerId)
      .run();
  else
    await e.DB.prepare(
      "UPDATE room_players SET last_seen = 0 WHERE room_code = ? AND player_id = ?",
    )
      .bind(code, playerId)
      .run();
  const after = await roomState(e.DB, code, e);
  if (after && after.players.length === 0) {
    await e.DB.prepare("DELETE FROM rooms WHERE code = ?").bind(code).run();
    return json({ ok: true });
  }
  return json({ ok: true, room: after });
};
