// Shared leaderboard client (Cloudflare Pages Functions + D1, see functions/).
// Everything degrades gracefully: without the backend (local server, offline)
// results stay in an outbox on this device and the old per-device board is used.
export interface RemoteResult {
  id: string;
  organization: string;
  first: string;
  second: string;
  mode: "official" | "practice";
  score: number;
  bill: number;
  budget: number;
  savingPercent: number;
  rulesVersion: 1;
  completedAt: string;
}
export type SubmitStatus = "sent" | "downgraded" | "queued" | "unavailable";
const OUTBOX = "yesil-donusum-outbox";
const TOKEN = "yesil-admin-token";

async function call(
  path: string,
  init: RequestInit = {},
  timeout = 7000,
): Promise<{ status: number; data: any } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(path, { ...init, signal: controller.signal });
    // A static host answers unknown paths with index.html: that means "no backend".
    if (!(res.headers.get("content-type") ?? "").includes("json"))
      return { status: 404, data: null };
    return { status: res.status, data: await res.json() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** All stored results, or null when the shared board cannot be reached. */
export async function fetchResults(): Promise<RemoteResult[] | null> {
  const res = await call("./api/results");
  return res?.status === 200 && Array.isArray(res.data?.results)
    ? (res.data.results as RemoteResult[])
    : null;
}

export function remoteRanking(
  list: RemoteResult[],
  mode: "official" | "practice",
) {
  return list
    .filter((r) => r.mode === mode && r.rulesVersion === 1)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.savingPercent - a.savingPercent ||
        a.completedAt.localeCompare(b.completedAt),
    );
}

const readOutbox = (): RemoteResult[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(OUTBOX) ?? "[]");
    return Array.isArray(value) ? (value as RemoteResult[]) : [];
  } catch {
    return [];
  }
};
const writeOutbox = (list: RemoteResult[]) => {
  try {
    localStorage.setItem(OUTBOX, JSON.stringify(list.slice(-200)));
  } catch {
    /* Storage full or blocked: the result is still in the local database. */
  }
};
export const pendingCount = () => readOutbox().length;

async function sendOne(r: RemoteResult): Promise<SubmitStatus | "rejected"> {
  const res = await call("./api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(r),
  });
  if (!res) return "queued";
  if (res.status === 404) return "unavailable";
  if (res.status === 200 || res.status === 201)
    return res.data?.downgraded ? "downgraded" : "sent";
  return res.status >= 500 ? "queued" : "rejected";
}

/** Sends everything waiting in the outbox; maps each game id to its outcome. */
export async function flushOutbox(): Promise<Map<string, SubmitStatus>> {
  const outcomes = new Map<string, SubmitStatus>();
  const keep: RemoteResult[] = [];
  for (const r of readOutbox()) {
    const status = await sendOne(r);
    if (status === "queued" || status === "unavailable") keep.push(r);
    // A result the server rejects as invalid is dropped, never retried.
    outcomes.set(r.id, status === "rejected" ? "unavailable" : status);
  }
  writeOutbox(keep);
  return outcomes;
}

/** Queues a finished game and tries to send it right away. */
export async function submitResult(r: RemoteResult): Promise<SubmitStatus> {
  writeOutbox([...readOutbox().filter((x) => x.id !== r.id), r]);
  return (await flushOutbox()).get(r.id) ?? "queued";
}

export const storedToken = () => {
  try {
    return sessionStorage.getItem(TOKEN) ?? "";
  } catch {
    return "";
  }
};
export const storeToken = (token: string) => {
  try {
    if (token) sessionStorage.setItem(TOKEN, token);
    else sessionStorage.removeItem(TOKEN);
  } catch {
    /* Token only lives for this tab; ignore storage errors. */
  }
};
// HTTP headers only carry Latin-1: encode, the server decodes (see functions/api/_lib.ts).
const bearer = (token: string) => ({
  Authorization: `Bearer ${encodeURIComponent(token.trim())}`,
});

/** null: unreachable, string: server message when rejected, true: valid. */
export async function adminCheck(token: string): Promise<true | string | null> {
  const res = await call("./api/admin", { headers: bearer(token) });
  if (!res) return null;
  return res.status === 200 ? true : String(res.data?.error ?? "Reddedildi.");
}
export async function adminDelete(id: string, token: string) {
  const res = await call(`./api/results/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: bearer(token),
  });
  if (res?.status === 200) return true as const;
  throw Error(String(res?.data?.error ?? "Sunucuya ulaşılamadı."));
}
export async function adminBulkDelete(mode: "practice" | "all", token: string) {
  const res = await call(`./api/results?mode=${mode}`, {
    method: "DELETE",
    headers: bearer(token),
  });
  if (res?.status === 200) return Number(res.data?.deleted ?? 0);
  throw Error(String(res?.data?.error ?? "Sunucuya ulaşılamadı."));
}
