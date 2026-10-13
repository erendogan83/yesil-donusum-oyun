import {
  ensureSchema,
  fail,
  json,
  roomState,
  ROOM_PATTERN,
  type Env,
} from "../../_lib";

/** Room state: players, scores and status. Clients poll this every couple of seconds. */
export const onRequestGet: PagesFunction = async ({ env, params }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const code = String(params.code).toUpperCase();
  if (!ROOM_PATTERN.test(code)) return fail(400, "Oda kodu geçersiz.");
  await ensureSchema(e.DB);
  const room = await roomState(e.DB, code);
  return room ? json({ ok: true, room }) : fail(404, "Oda bulunamadı.");
};
