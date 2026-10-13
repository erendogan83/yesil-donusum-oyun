// Timed play: 30 seconds per room and period. After that every second costs money while the
// room still has required steps. Pure functions on State so they are easy to test.
import { OVERTIME_COST, TIME_LIMIT_S } from "./economy";
import { pendingRooms } from "./navigation";
import type { State } from "./model";

/** A single settle never credits more than this, so a sleeping tab cannot ruin a game. */
const MAX_GAP_MS = 60_000;
const key = (room: string, round: number) => `${room}@${round}`;

export const isTimed = (s: State) =>
  s.decisionVersion === 1 && s.team.mode !== "practice";

/** Adds the time since the clock was last looked at and charges overtime. */
export function settle(s: State, now: number): State {
  const run = s.clockRunning;
  if (!run || !isTimed(s)) return s;
  const k = key(run.room, s.round);
  const entry = s.clock?.[k] ?? { ms: 0, charged: 0 };
  const ms = entry.ms + Math.max(0, Math.min(now - run.at, MAX_GAP_MS));
  const due = Math.max(0, Math.floor(ms / 1000) - TIME_LIMIT_S) - entry.charged;
  const penalty = due > 0 ? Math.min(s.budget, due * OVERTIME_COST) : 0;
  return {
    ...s,
    budget: s.budget - penalty,
    timePenalty: (s.timePenalty ?? 0) + penalty,
    clock: {
      ...s.clock,
      [k]: { ...entry, ms, charged: entry.charged + Math.max(0, due) },
    },
    clockRunning: { room: run.room, at: now },
  };
}

const roomIsDone = (s: State, room: string) =>
  !pendingRooms(s).some((r) => r.id === room);

/**
 * Brings the clock in line with where the player is. \`wanted\` is the room being played
 * (room or market view) or null when the player is elsewhere or reading a learning card.
 */
export function reconcile(s: State, now: number, wanted: string | null): State {
  if (!isTimed(s) || s.phase !== "playing") {
    return s.clockRunning ? { ...settle(s, now), clockRunning: null } : s;
  }
  let next = settle(s, now);
  const run = next.clockRunning;
  if (run && roomIsDone(next, run.room)) {
    const k = key(run.room, next.round);
    next = {
      ...next,
      clock: {
        ...next.clock,
        [k]: { ...(next.clock?.[k] ?? { ms: 0, charged: 0 }), done: true },
      },
      clockRunning: null,
    };
  }
  const current = next.clockRunning;
  if (wanted && !roomIsDone(next, wanted)) {
    if (current?.room !== wanted)
      return { ...next, clockRunning: { room: wanted, at: now } };
    return next;
  }
  return current ? { ...next, clockRunning: null } : next;
}

/** What the HUD shows: seconds left (negative once overtime has started) for the running room. */
export function clockView(s: State, now: number) {
  if (!isTimed(s) || !s.clockRunning) return null;
  const run = s.clockRunning;
  const entry = s.clock?.[key(run.room, s.round)] ?? { ms: 0, charged: 0 };
  const ms = entry.ms + Math.max(0, Math.min(now - run.at, MAX_GAP_MS));
  const used = Math.floor(ms / 1000);
  const left = TIME_LIMIT_S - used;
  return { left, overtime: Math.max(0, -left), cost: OVERTIME_COST };
}
