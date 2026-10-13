import {
  ensureSchema,
  fail,
  json,
  roomState,
  ROOM_PATTERN,
  roomFromParam,
  type Env,
} from "../../_lib";

/** Room state: players, scores and status. Clients poll this every couple of seconds. */
export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  const code = roomFromParam(params.code);
  if (!ROOM_PATTERN.test(code)) return fail(400, "Oda adı geçersiz.");
  await ensureSchema(e.DB);
  // ?p=<player id> marks that player as still present in the room.
  const viewer = new URL(request.url).searchParams.get("p");
  const room = await roomState(e.DB, code, e, viewer);
  return room ? json({ ok: true, room }) : fail(404, "Oda bulunamadı.");
};
