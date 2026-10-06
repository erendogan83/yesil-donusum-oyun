import { fail, isAdmin, json, type Env } from "./_lib";

/** Lets the admin page verify its token before showing delete buttons. */
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const e = env as Env;
  if (!e.ADMIN_TOKEN) return fail(503, "ADMIN_TOKEN tanımlı değil.");
  return isAdmin(request, e)
    ? json({ ok: true })
    : fail(401, "Yönetim anahtarı geçersiz.");
};
