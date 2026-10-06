import { ensureSchema, fail, isAdmin, json, type Env } from "../_lib";

/** Admin only: remove one result (for example a test game). */
export const onRequestDelete: PagesFunction = async ({
  request,
  env,
  params,
}) => {
  const e = env as Env;
  if (!e.DB) return fail(503, "Veritabanı bağlı değil.");
  if (!isAdmin(request, e)) return fail(401, "Yönetim anahtarı geçersiz.");
  await ensureSchema(e.DB);
  const res = await e.DB.prepare("DELETE FROM results WHERE id = ?")
    .bind(String(params.id))
    .run();
  return res.meta.changes
    ? json({ ok: true, deleted: res.meta.changes })
    : fail(404, "Kayıt bulunamadı.");
};
