import {
  cleanName,
  cleanPlayerId,
  ensureSchema,
  fail,
  json,
  readJson,
  roomSlug,
  roomState,
  type Env,
} from "../_lib";

/** Creates a room named by the creator, who becomes its host and first player. */
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const read = await readJson(request);
  if (read.error) return read.error;
  const playerId = cleanPlayerId(read.body.playerId);
  const name = cleanName(read.body.name);
  const title =
    typeof read.body.room === "string"
      ? read.body.room.trim().slice(0, 30)
      : "";
  const code = roomSlug(title);
  if (!playerId || !name) return fail(400, "Oyuncu adını yazın.");
  if (code.length < 2)
    return fail(400, "Oda adı en az 2 harf ya da rakam içermeli.");
  await ensureSchema(e.DB);
  const taken = await e.DB.prepare("SELECT 1 AS x FROM rooms WHERE code = ?")
    .bind(code)
    .first();
  if (taken) {
    // A room nobody is in any more (or that went stale) frees its name.
    const live = await roomState(e.DB, code, e);
    if (live && live.players.some((p) => p.present))
      return fail(
        409,
        "Bu adla açık bir oda var. Başka bir ad seç ya da ODAYA GİR ile katıl.",
      );
    await e.DB.prepare("DELETE FROM room_players WHERE room_code = ?")
      .bind(code)
      .run();
    await e.DB.prepare("DELETE FROM rooms WHERE code = ?").bind(code).run();
  }
  const now = Date.now();
  await e.DB.prepare(
    "INSERT INTO rooms (code, title, host_id, status, created_at, host_since) VALUES (?, ?, ?, 'lobby', ?, ?)",
  )
    .bind(code, title, playerId, now, now)
    .run();
  await e.DB.prepare(
    "INSERT INTO room_players (room_code, player_id, name, joined_at, last_seen) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(code, playerId, name, now, now)
    .run();
  return json(
    { ok: true, room: await roomState(e.DB, code, e, playerId) },
    201,
  );
};
