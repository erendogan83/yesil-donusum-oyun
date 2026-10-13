import {
  cleanName,
  cleanPlayerId,
  ensureSchema,
  fail,
  json,
  readJson,
  roomState,
  ROOM_PATTERN,
  type Env,
} from "../../_lib";

const MAX_PLAYERS = 100;

/** Joins a room that is still in its lobby; rejoining with the same player id is allowed. */
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
  const name = cleanName(read.body.name);
  if (!playerId || !name) return fail(400, "Adınızı yazın.");
  await ensureSchema(e.DB);
  const room = await roomState(e.DB, code);
  if (!room) return fail(404, "Oda bulunamadı. Kodu kontrol edin.");
  const known = room.players.some((p) => p.id === playerId);
  if (!known) {
    if (room.status !== "lobby")
      return fail(409, "Bu odada oyun başladı; yeni oyuncu katılamaz.");
    if (room.players.length >= MAX_PLAYERS) return fail(409, "Oda dolu.");
    await e.DB.prepare(
      "INSERT INTO room_players (room_code, player_id, name, joined_at) VALUES (?, ?, ?, ?)",
    )
      .bind(code, playerId, name, Date.now())
      .run();
  } else {
    await e.DB.prepare(
      "UPDATE room_players SET name = ? WHERE room_code = ? AND player_id = ?",
    )
      .bind(name, code, playerId)
      .run();
  }
  return json({ ok: true, room: await roomState(e.DB, code) });
};
