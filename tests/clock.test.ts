import { test } from "node:test";
import assert from "node:assert/strict";
import { start, validDatabase, emptyDatabase, type State } from "../src/model";
import { reconcile, settle, isTimed, clockView } from "../src/clock";
import { skipUnaffordable, opportunities } from "../src/decisions";
import {
  EARLY_BONUS,
  INITIAL_BUDGET,
  OVERTIME_COST,
  TIME_LIMIT_S,
} from "../src/economy";

const L = TIME_LIMIT_S;
const sec = (n: number) => n * 1000;
const game = (mode: "practice" | "official" | "room" = "official"): State => ({
  ...start({ organization: "", first: "Eren", second: "", mode }),
  decisionVersion: 1,
  decisions: [],
  sorting: {},
  tutorial: false,
});
const T0 = 1_000_000;
const kitchenCore = opportunities.filter(
  (o) => o.core && o.roomId === "kitchen",
);
const kitchenDone = (s: State): State => ({
  ...s,
  decisions: kitchenCore.map((o) => ({
    opportunityId: o.id,
    choiceId: "x",
    round: 1,
  })),
});

test("the limit is a minute and early finishing pays 5 TL a second", () => {
  assert.equal(TIME_LIMIT_S, 60);
  assert.equal(EARLY_BONUS, 5);
  assert.equal(OVERTIME_COST, 5);
});

test("only official and room games are timed", () => {
  assert(isTimed(game("official")));
  assert(isTimed(game("room")));
  assert(!isTimed(game("practice")));
  assert.equal(
    reconcile(game("practice"), T0, "kitchen").clockRunning ?? null,
    null,
  );
});

test("the whole limit is free, then every second costs money", () => {
  let s = reconcile(game(), T0, "kitchen");
  assert.equal(s.clockRunning?.room, "kitchen");
  // A single settle never credits more than a minute, so check in every 10 s.
  for (let t = 10; t <= L; t += 10) s = settle(s, T0 + sec(t));
  assert.equal(s.budget, INITIAL_BUDGET, "exactly the limit: nothing charged");
  s = settle(s, T0 + sec(L + 5));
  assert.equal(s.budget, INITIAL_BUDGET - 5 * OVERTIME_COST);
  assert.equal(
    settle(s, T0 + sec(L + 5)).budget,
    s.budget,
    "never charged twice",
  );
  s = settle(s, T0 + sec(L + 6));
  assert.equal(s.budget, INITIAL_BUDGET - 6 * OVERTIME_COST);
  assert.equal(s.timePenalty, 6 * OVERTIME_COST);
});

test("finishing a room early earns 5 TL for every second left", () => {
  let s = reconcile(game(), T0, "kitchen");
  s = reconcile(kitchenDone(s), T0 + sec(L - 10), "kitchen"); // 10 s early
  assert.equal(
    s.budget,
    INITIAL_BUDGET + 10 * EARLY_BONUS,
    "10 s early = 50 TL",
  );
  assert.equal(s.timeBonus, 50);
  assert.equal(s.clockRunning ?? null, null);
  // Checking again, or coming back, never pays twice.
  const again = reconcile(s, T0 + sec(L + 30), "kitchen");
  assert.equal(again.budget, s.budget);
  assert.equal(again.timeBonus, 50);
});

test("no bonus after the limit; the fastest possible room pays the whole limit", () => {
  let late = reconcile(game(), T0, "kitchen");
  for (let t = 10; t <= L + 10; t += 10) late = settle(late, T0 + sec(t));
  late = reconcile(kitchenDone(late), T0 + sec(L + 10), "kitchen");
  assert.equal(late.timeBonus ?? 0, 0);
  assert(late.budget < INITIAL_BUDGET, "overtime was charged");
  const fast = reconcile(
    kitchenDone(reconcile(game(), T0, "kitchen")),
    T0,
    "kitchen",
  );
  assert.equal(fast.timeBonus, L * EARLY_BONUS);
});

test("practice games get no bonus", () => {
  const practice = reconcile(kitchenDone(game("practice")), T0, "kitchen");
  assert.equal(practice.timeBonus ?? 0, 0);
  assert.equal(practice.budget, INITIAL_BUDGET);
});

test("the clock is per room and period, and leaving a room pauses it", () => {
  let s = reconcile(game(), T0, "kitchen");
  s = reconcile(s, T0 + sec(20), null); // went to the map
  assert.equal(s.clockRunning ?? null, null);
  s = reconcile(s, T0 + sec(50), "kitchen"); // time on the map is free
  assert.equal(s.budget, INITIAL_BUDGET);
  s = reconcile(s, T0 + sec(50 + L - 20), "kitchen"); // 20 + (L-20) s: the limit
  assert.equal(s.budget, INITIAL_BUDGET);
  s = reconcile(s, T0 + sec(50 + L - 18), "kitchen");
  assert.equal(s.budget, INITIAL_BUDGET - 2 * OVERTIME_COST);
  // Another room starts with a fresh limit.
  s = reconcile(s, T0 + sec(50 + L - 18), "bathroom");
  assert.equal(s.clockRunning?.room, "bathroom");
  const before = s.budget;
  s = reconcile(s, T0 + sec(50 + L - 18 + 20), "bathroom");
  assert.equal(s.budget, before);
});

test("money never goes below zero", () => {
  let s = { ...reconcile(game(), T0, "kitchen"), budget: 12 };
  for (let t = 1; t <= 20; t++) s = settle(s, T0 + t * sec(10));
  assert.equal(s.budget, 0);
  assert(validDatabase({ ...emptyDatabase(), active: s }));
});

test("a long gap (sleeping tab) is capped at a minute", () => {
  const s = settle(reconcile(game(), T0, "kitchen"), T0 + 3_600_000);
  assert.equal(s.budget, INITIAL_BUDGET, "a minute is still within the limit");
});

test("the clock stops once the room has no required step left", () => {
  const s = reconcile(
    kitchenDone(reconcile(game(), T0, "kitchen")),
    T0 + sec(10),
    "kitchen",
  );
  assert.equal(s.clockRunning ?? null, null);
  assert.equal(
    reconcile(s, T0 + sec(20), "kitchen").clockRunning ?? null,
    null,
  );
});

test("clockView counts down and then reports overtime", () => {
  const s = reconcile(game(), T0, "kitchen");
  assert.equal(clockView(s, T0 + sec(10))?.left, L - 10);
  // The game settles every few seconds; a minute later the view shows overtime.
  const later = settle(s, T0 + sec(L));
  const late = clockView(later, T0 + sec(L + 10))!;
  assert.equal(late.left, -10);
  assert.equal(late.overtime, 10);
});

test("a required purchase can be skipped only when nothing is affordable", () => {
  const poor = { ...game(), budget: 10 };
  const next = skipUnaffordable(poor, "tap");
  assert.equal(next.decisions!.at(-1)!.choiceId, "skip-budget");
  assert(validDatabase({ ...emptyDatabase(), active: next }));
  assert.throws(
    () => skipUnaffordable({ ...game(), budget: INITIAL_BUDGET }, "tap"),
    /yetiyor/,
  );
  assert.throws(() => skipUnaffordable(poor, "flush"), /atlanamaz/);
});
