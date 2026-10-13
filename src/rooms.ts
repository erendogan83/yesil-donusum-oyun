// Room play: create or join a room by code, wait in a lobby, then every player plays the same
// timed game at the same moment and a live ranking is shown. Needs the shared backend.
import { call } from "./remote";

export interface RoomPlayer {
  id: string;
  name: string;
  score: number;
  round: number;
  finished: boolean;
}
export interface RoomState {
  code: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  /** Server time (ms) when play begins; null while in the lobby. */
  startedAt: number | null;
  /** Server time when this answer was produced, to correct for clock differences. */
  now: number;
  players: RoomPlayer[];
}
export interface RoomSession {
  code: string;
  playerId: string;
  name: string;
}
const SESSION = "yesil-room-session";
const PLAYER = "yesil-player-id";

export const newPlayerId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** A stable id for this browser so a reload keeps the same seat in a room. */
export function playerId(): string {
  try {
    let id = localStorage.getItem(PLAYER);
    if (!id) {
      id = newPlayerId();
      localStorage.setItem(PLAYER, id);
    }
    return id;
  } catch {
    return newPlayerId();
  }
}
export const loadSession = (): RoomSession | null => {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION) ?? "null");
    return value && typeof value.code === "string" ? value : null;
  } catch {
    return null;
  }
};
export const saveSession = (session: RoomSession | null) => {
  try {
    if (session) localStorage.setItem(SESSION, JSON.stringify(session));
    else localStorage.removeItem(SESSION);
  } catch {
    /* A reload simply starts from the menu. */
  }
};

type Result = { room: RoomState } | { error: string };
const fromResponse = async (
  res: Awaited<ReturnType<typeof call>>,
): Promise<Result> => {
  if (!res)
    return { error: "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin." };
  if (res.status === 404 && !res.data)
    return { error: "Oda sistemi bu adreste kurulu değil." };
  if (res.data?.ok && res.data.room)
    return { room: res.data.room as RoomState };
  return { error: String(res.data?.error ?? "İşlem yapılamadı.") };
};
const post = (path: string, body: unknown) =>
  call(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const createRoom = async (name: string) =>
  fromResponse(await post("./api/rooms", { playerId: playerId(), name }));
export const joinRoom = async (code: string, name: string) =>
  fromResponse(
    await post(`./api/rooms/${code.trim().toUpperCase()}/join`, {
      playerId: playerId(),
      name,
    }),
  );
export const fetchRoom = async (code: string) =>
  fromResponse(await call(`./api/rooms/${code}`));
export const startRoom = async (code: string) =>
  fromResponse(
    await post(`./api/rooms/${code}/start`, { playerId: playerId() }),
  );
export const reportScore = async (
  code: string,
  score: number,
  round: number,
  finished: boolean,
) =>
  post(`./api/rooms/${code}/score`, {
    playerId: playerId(),
    score,
    round,
    finished,
  });

/** Milliseconds from now until the game starts, corrected for the server's clock. */
export function msUntilStart(
  room: RoomState,
  receivedAt: number,
): number | null {
  if (room.startedAt === null) return null;
  const offset = room.now - receivedAt; // server clock minus our clock
  return room.startedAt - offset - Date.now();
}

/** Ranking order used everywhere: score, then finished players first. */
export const rankPlayers = (players: RoomPlayer[]) =>
  [...players].sort(
    (a, b) => b.score - a.score || Number(b.finished) - Number(a.finished),
  );
