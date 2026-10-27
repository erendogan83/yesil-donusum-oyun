import {
  cleanPlayerId,
  ensureSchema,
  fail,
  json,
  readJson,
  roomState,
  HOST_EXTEND_MS,
  MAX_HOST_WAIT_MS,
  ROOM_PATTERN,
  roomFromParam,
  type Env,
} from "../../_lib";

/** Host only: gives the host more time to start the game while the room is still in the lobby. */
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
  await ensureSchema(e.DB);
  const room = await roomState(e.DB, code, e, playerId);
  if (!room) return fail(404, "Oda bulunamadı.");
  if (!playerId || room.hostId !== playerId)
    return fail(403, "Süreyi yalnızca odayı kuran uzatabilir.");
  if (room.status !== "lobby") return fail(409, "Oyun zaten başladı.");
  const now = Date.now();
  // The deadline moves forward, but never further than MAX_HOST_WAIT_MS from now.
  const deadline = Math.min(
    room.hostSince + room.hostStartMs + HOST_EXTEND_MS,
    now + MAX_HOST_WAIT_MS,
  );
  const hostSince = Math.max(room.hostSince, deadline - room.hostStartMs);
  await e.DB.prepare(
    "UPDATE rooms SET host_since = ? WHERE code = ? AND status = 'lobby' AND host_id = ?",
  )
    .bind(hostSince, code, playerId)
    .run();
  return json({ ok: true, room: await roomState(e.DB, code, e, playerId) });
};
