import {
  cleanName,
  cleanPlayerId,
  ensureSchema,
  fail,
  json,
  newRoomCode,
  readJson,
  roomState,
  type Env,
} from "../_lib";

/** Creates a room; the creator becomes its host and first player. */
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const read = await readJson(request);
  if (read.error) return read.error;
  const playerId = cleanPlayerId(read.body.playerId);
  const name = cleanName(read.body.name);
  if (!playerId || !name) return fail(400, "Adınızı yazın.");
  await ensureSchema(e.DB);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = newRoomCode();
    const taken = await e.DB.prepare("SELECT 1 AS x FROM rooms WHERE code = ?")
      .bind(code)
      .first();
    if (taken) continue;
    const now = Date.now();
    await e.DB.prepare(
      "INSERT INTO rooms (code, host_id, status, created_at) VALUES (?, ?, 'lobby', ?)",
    )
      .bind(code, playerId, now)
      .run();
    await e.DB.prepare(
      "INSERT INTO room_players (room_code, player_id, name, joined_at) VALUES (?, ?, ?, ?)",
    )
      .bind(code, playerId, name, now)
      .run();
    return json({ ok: true, room: await roomState(e.DB, code) }, 201);
  }
  return fail(503, "Oda kodu üretilemedi, tekrar deneyin.");
};
