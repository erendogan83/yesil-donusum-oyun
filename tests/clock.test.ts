import { test } from "node:test";
import assert from "node:assert/strict";
import { start, validDatabase, emptyDatabase, type State } from "../src/model";
import { reconcile, settle, isTimed, clockView } from "../src/clock";
import { skipUnaffordable } from "../src/decisions";
import { opportunities } from "../src/decisions";
import { OVERTIME_COST, TIME_LIMIT_S } from "../src/economy";

const game = (mode: "practice" | "official" | "room" = "official"): State => ({
  ...start({ organization: "", first: "Eren", second: "", mode }),
  decisionVersion: 1,
  decisions: [],
  sorting: {},
  tutorial: false,
});
const T0 = 1_000_000;

test("only official and room games are timed", () => {
  assert(isTimed(game("official")));
  assert(isTimed(game("room")));
  assert(!isTimed(game("practice")));
  // A practice game never starts a clock.
  assert.equal(
    reconcile(game("practice"), T0, "kitchen").clockRunning ?? null,
    null,
  );
});

test("30 seconds are free, then every second costs money", () => {
  let s = reconcile(game(), T0, "kitchen");
  assert.equal(s.clockRunning?.room, "kitchen");
  // Check in every 10 s (a settle never credits more than a minute).
  for (let i = 1; i <= 3; i++) s = settle(s, T0 + i * 10_000);
  assert.equal(s.budget, 2500, "exactly 30 s: nothing charged");
  s = settle(s, T0 + 35_000);
  assert.equal(s.budget, 2500 - 5 * OVERTIME_COST, "5 s over the limit");
  // Settling again at the same moment never charges twice.
  assert.equal(settle(s, T0 + 35_000).budget, s.budget);
  s = settle(s, T0 + 36_000);
  assert.equal(s.budget, 2500 - 6 * OVERTIME_COST);
  assert.equal(s.timePenalty, 6 * OVERTIME_COST);
});

test("the clock is per room and period, and leaving a room pauses it", () => {
  let s = reconcile(game(), T0, "kitchen");
  s = reconcile(s, T0 + 20_000, null); // went to the map
  assert.equal(s.clockRunning ?? null, null);
  s = reconcile(s, T0 + 50_000, "kitchen"); // 30 s pass on the map without cost
  assert.equal(s.budget, 2500);
  s = reconcile(s, T0 + 60_000, "kitchen"); // 20 + 10 s used: exactly the limit
  assert.equal(s.budget, 2500);
  s = reconcile(s, T0 + 62_000, "kitchen");
  assert.equal(s.budget, 2500 - 2 * OVERTIME_COST);
  // Another room starts with a fresh 30 seconds.
  s = reconcile(s, T0 + 62_000, "bathroom");
  assert.equal(s.clockRunning?.room, "bathroom");
  const before = s.budget;
  s = reconcile(s, T0 + 80_000, "bathroom");
  assert.equal(s.budget, before);
});

test("money never goes below zero", () => {
  let s = { ...reconcile(game(), T0, "kitchen"), budget: 12 };
  for (let t = 1; t <= 12; t++) s = settle(s, T0 + t * 10_000);
  assert.equal(s.budget, 0);
  assert(validDatabase({ ...emptyDatabase(), active: s }));
});

test("a long gap (sleeping tab) is capped", () => {
  const s = settle(reconcile(game(), T0, "kitchen"), T0 + 3_600_000);
  assert(s.budget >= 2500 - 31 * OVERTIME_COST, "at most 60 s are counted");
});

test("the clock stops once the room has no required step left", () => {
  const core = opportunities.filter((o) => o.core && o.roomId === "kitchen");
  const s0 = reconcile(game(), T0, "kitchen");
  const done = {
    ...s0,
    decisions: core.map((o) => ({
      opportunityId: o.id,
      choiceId: "x",
      round: 1,
    })),
  };
  const s = reconcile(done, T0 + 10_000, "kitchen");
  assert.equal(s.clockRunning ?? null, null);
  // Coming back does not restart a finished room.
  assert.equal(reconcile(s, T0 + 20_000, "kitchen").clockRunning ?? null, null);
});

test("clockView counts down and then reports overtime", () => {
  const s = reconcile(game(), T0, "kitchen");
  assert.equal(clockView(s, T0 + 10_000)?.left, TIME_LIMIT_S - 10);
  const late = clockView(s, T0 + 40_000)!;
  assert.equal(late.left, -10);
  assert.equal(late.overtime, 10);
});

test("a required purchase can be skipped only when nothing is affordable", () => {
  const poor = { ...game(), budget: 10 };
  const next = skipUnaffordable(poor, "tap");
  assert.equal(next.decisions!.at(-1)!.choiceId, "skip-budget");
  assert(validDatabase({ ...emptyDatabase(), active: next }));
  assert.throws(
    () => skipUnaffordable({ ...game(), budget: 2500 }, "tap"),
    /yetiyor/,
  );
  assert.throws(() => skipUnaffordable(poor, "flush"), /atlanamaz/);
});
