import { test } from "node:test";
import assert from "node:assert/strict";
import {
  start,
  purchase,
  install,
  freeMove,
  discover,
  consider,
  endRound,
  continueRound,
  finish,
  score,
  ranking,
  emptyDatabase,
  validDatabase,
  migrateDatabase,
  setPledges,
  type State,
} from "../src/model";
import { miniGoals, ideas, solutions } from "../src/journey";
import { productLesson } from "../src/learning";
import { productById } from "../src/data";
const fresh = () =>
  start(
    { organization: "TEST", first: "Ayşe", second: "Fatma", mode: "practice" },
    [],
    [],
  );
const put = (s: State, id: string): State => {
  const p = productById(id),
    n = install(purchase(s, id), id, p.room, p.zone);
  return {
    ...n,
    lessons: [
      ...(s.lessons || []),
      productLesson(p, n.moves.at(-1)!.impact, n.bill - s.bill, true),
    ],
  };
};
test("three goals advance on discovery, installation and habit, once per round", () => {
  let s = fresh();
  assert.equal(miniGoals(s).filter((g) => g.done).length, 0);
  s = discover(s, "kitchen", "tap");
  s = discover(s, "kitchen", "tap");
  assert.equal(s.discoveries!.length, 1);
  assert.equal(miniGoals(s).filter((g) => g.done).length, 1);
  s = put(s, "tap-a");
  s = freeMove(s, "stock");
  assert(miniGoals(s).every((g) => g.done));
  s = continueRound(endRound(s));
  assert(miniGoals(s).every((g) => !g.done));
  assert.equal(s.discoveries!.length, 1);
  assert.throws(() => discover(s, "roof", "solar"));
  s = discover(s, "workshop", "power");
  s = put(s, "meter");
  s = freeMove(s, "off");
  assert(miniGoals(s).every((g) => g.done));
});
test("contextual shower shelf offers alternatives without outcome metadata filtering", () => {
  assert.deepEqual(
    solutions("bathroom", "shower", 1).map((p) => p.id),
    ["shower-b", "shower-a"],
  );
  assert.equal(solutions("roof", "solar", 1).length, 0);
});
test("idea bag and new fields survive autosave and migration is idempotent", () => {
  let s = put(fresh(), "tap-a");
  s = consider(discover(s, "kitchen", "tap"), "repair");
  const db = { ...emptyDatabase(), active: s },
    saved = JSON.parse(JSON.stringify(db));
  assert(validDatabase(saved));
  assert(ideas(saved.active!).some((i) => i.id === "tap-a"));
  assert.deepEqual(
    migrateDatabase(migrateDatabase(saved)),
    migrateDatabase(saved),
  );
  assert.equal(saved.active!.lessons![0].acknowledged, false);
  assert(
    !validDatabase({
      ...db,
      active: {
        ...s,
        discoveries: [{ room: "roof", zone: "solar", round: 1 }],
      },
    }),
  );
});
test("legacy saves retain paid rewards, budget, installed products and result ranks", () => {
  const old = put(fresh(), "tap-a");
  delete old.journeyVersion;
  delete old.discoveries;
  delete old.considered;
  delete old.lessons;
  old.team.second = "";
  const oldSummary = endRound({
    ...old,
    team: { ...old.team, second: "Legacy" },
  });
  oldSummary.team.second = "";
  oldSummary.history[0] = {
    round: 1,
    before: 10000,
    after: 9820,
    saving: 180,
    reward: 900,
  };
  oldSummary.budget = 3250;
  const raw = { ...emptyDatabase(), active: oldSummary };
  const next = migrateDatabase(raw);
  assert.equal(next.active!.budget, 3250);
  assert.equal(next.active!.history[0].reward, 900);
  assert(next.active!.lessons![0].acknowledged);
  assert.equal(next.active!.team.second, "");
  assert.deepEqual(raw.active.lessons, undefined);
  assert(validDatabase(next));
});
test("exactly three pledges persist without changing score or official ranking", () => {
  let s = put(fresh(), "tap-a");
  for (let i = 0; i < 4; i++) s = continueRound(endRound(s));
  s.team.mode = "official";
  let db = finish({ ...emptyDatabase(), active: s });
  const previous = score(s),
    rank = ranking(db.results).map((r) => [r.id, r.score, r.savingPercent]);
  const ids = ideas(s)
    .slice(0, 3)
    .map((i) => i.id);
  for (const invalid of [
    [],
    ids.slice(0, 2),
    [ids[0], ids[0], ids[1]],
    [...ids, "unknown"],
    ["unknown", ids[0], ids[1]],
  ])
    assert.throws(() => setPledges(db, invalid));
  db = setPledges(db, ids);
  assert.equal(db.active!.realLifePledges!.length, 3);
  assert.equal(score(db.active!), previous);
  assert.deepEqual(
    ranking(db.results).map((r) => [r.id, r.score, r.savingPercent]),
    rank,
  );
  assert.deepEqual(db.results[0].realLifePledges, db.active!.realLifePledges);
  assert(validDatabase(JSON.parse(JSON.stringify(db))));
  const practice = setPledges(
    {
      ...emptyDatabase(),
      active: { ...s, team: { ...s.team, mode: "practice" } },
    },
    ids,
  );
  assert.equal(practice.results.length, 0);
});
