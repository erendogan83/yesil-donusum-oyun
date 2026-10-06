import { marketPrice, existingFixture } from "../src/data/market-prices";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  start,
  purchase,
  migrateDatabase,
  install,
  endRound,
  continueRound,
  score,
  validDatabase,
  emptyDatabase,
  finish,
  ranking,
  type State,
} from "../src/model";
import {
  opportunities,
  points,
  copy,
  economy,
  assets,
  recordChoice,
  sortItem,
  skipOptional,
  zoneFor,
  decisionProducts,
} from "../src/decisions";
import { placements } from "../src/placements";
import { SORT_MISTAKE_PENALTY } from "../src/economy";
import { activeOpportunity } from "../src/navigation";
const fresh = (): State => ({
  ...start(
    { organization: "Test", first: "Ayşe", second: "Nisa", mode: "practice" },
    [],
    [],
  ),
  decisionVersion: 1,
  decisions: [],
  sorting: {},
  tutorial: false,
});
function commit(s: State, id: string) {
  const o = opportunities.find((o) => o.choices.includes(id))!;
  return recordChoice(
    o.kind === "product" && !existingFixture(id)
      ? install(purchase(s, id), id, o.roomId, zoneFor(o))
      : s,
    id,
  );
}
function valid(s: State) {
  assert(
    validDatabase({ ...emptyDatabase(), active: s }),
    JSON.stringify(s.decisions),
  );
  return s;
}
function ack(s: State): State {
  return {
    ...s,
    lessons: s.lessons?.map((l) => ({ ...l, acknowledged: true })),
  };
}
test("all core decisions offer at least three choices or sorting destinations; no missing assets, placement, copy or score reason", () => {
  assert.equal(opportunities.filter((o) => o.core).length, 18);
  for (const o of opportunities) {
    assert(
      !o.core ||
        (o.kind === "sorting" ? o.targets!.length : o.choices.length) >= 3,
      o.id,
    );
    for (const id of o.choices) {
      assert(copy[id].resultText && points[id].reason, id);
      assert(Number.isFinite(economy[id].priceTL));
      if (o.kind === "product") assert(assets[id].asset && placements[id], id);
    }
  }
  assert.equal(decisionProducts.length, 34);
});
test("every offered choice applies once with deterministic points, valid persisted state and unchanged old rules", () => {
  let s = fresh();
  for (let round = 1; round <= 4; round++) {
    for (const o of opportunities.filter((o) => o.round === round)) {
      if (o.kind === "sorting") {
        for (const i of o.items!) s = valid(sortItem(s, o.id, i.id, i.target));
      } else {
        for (const id of o.choices) {
          if (marketPrice(id)?.priceTL === null) {
            assert.throws(() => purchase(s, id), /fiyatı inceleniyor/);
            continue;
          }
          // Isolate consequence checks from real-price affordability.
          const candidate = valid(commit({ ...s, budget: 20000 }, id));
          assert.equal(
            score(candidate) - score(s),
            o.core ? points[id].decisionScore : 0,
            id,
          );
          assert.throws(() => commit(candidate, id));
          assert.equal(
            score(candidate),
            score({ ...candidate, budget: 0, bill: 0 }),
          );
        }
        if (!o.core) {
          s = valid(skipOptional(s, o.id));
          continue;
        }
        const id = o.choices
          .filter((id) => marketPrice(id)?.priceTL !== null)
          .sort((a, b) => points[b].decisionScore - points[a].decisionScore)[0];
        s = valid(commit(s, id));
      }
      s = ack(s);
    }
    s = valid(continueRound(endRound(s)));
  }
  assert.equal(score(s), 1800);
  assert.equal(s.phase, "finished");
  assert.equal(s.decisions!.length, 22);
  const orgs = Array.from({ length: 26 }, (_, i) => `Kurum ${i}`);
  s = { ...s, team: { ...s.team, organization: orgs[0], mode: "official" } };
  const db = finish({ ...emptyDatabase(), active: s });
  assert.equal(db.results[0].score, 1800);
  assert.equal(db.results[0].rulesVersion, 1);
  assert.equal(finish(db).results.length, 1);
});
test("sorting permits recovery but first answers determine points and survive refresh", () => {
  let s = ack(commit(fresh(), "rev-tap-repair"));
  const o = opportunities.find((o) => o.id === "waste-sort")!;
  s = valid(sortItem(s, o.id, "tissue", "paper"));
  assert.equal(s.sorting![o.id].placed.length, 0);
  s = JSON.parse(JSON.stringify(s));
  for (const item of o.items!)
    s = valid(sortItem(s, o.id, item.id, item.target));
  assert.equal(score(s), 183);
  assert.throws(() => sortItem(s, o.id, "tissue", "other"));
});
test("a wrong first sorting answer costs money once and never goes below zero", () => {
  let s = ack(commit(fresh(), "rev-tap-repair"));
  const o = opportunities.find((o) => o.id === "waste-sort")!;
  const budget = s.budget;
  s = valid(sortItem(s, o.id, "tissue", "paper"));
  assert.equal(s.budget, budget - SORT_MISTAKE_PENALTY);
  s = valid(sortItem(s, o.id, "tissue", "glass"));
  assert.equal(s.budget, budget - SORT_MISTAKE_PENALTY, "retry is free");
  s = valid(sortItem(s, o.id, "tissue", "other"));
  assert.equal(s.budget, budget - SORT_MISTAKE_PENALTY);
  s = valid(sortItem(s, o.id, "metal", "metal"));
  assert.equal(
    s.budget,
    budget - SORT_MISTAKE_PENALTY,
    "correct costs nothing",
  );
  const poor = valid(sortItem({ ...s, budget: 30 }, o.id, "glass", "plastic"));
  assert.equal(poor.budget, 0);
});
test("new navigation holds the installed decision until its learning card is acknowledged", () => {
  const s = commit(fresh(), "rev-tap-repair");
  assert.equal(activeOpportunity(s, "kitchen")?.id, "rev-tap");
  assert.equal(activeOpportunity(ack(s), "kitchen")?.id, "rev-waste-sort");
});
test("new rankings prioritize score; malformed and repeated decisions are rejected", () => {
  const s = commit(fresh(), "rev-tap-repair");
  assert(
    !validDatabase({
      ...emptyDatabase(),
      active: { ...s, decisions: [...s.decisions!, ...s.decisions!] },
    }),
  );
  const base = {
    id: "a",
    team: s.team,
    bill: 9000,
    budget: 1000,
    score: 100,
    savingPercent: 10,
    completedAt: "2026-10-05T10:00:00Z",
    rulesVersion: 1 as const,
  };
  assert.equal(
    ranking([base, { ...base, id: "b", score: 200, savingPercent: 0 }])[0].id,
    "b",
  );
});

test("new product learning history can be recovered without legacy copy lookup", () => {
  const s = commit(fresh(), "rev-tap-repair");
  const repaired = migrateDatabase({
    ...emptyDatabase(),
    active: { ...s, lessons: [] },
  });
  assert.equal(repaired.active!.lessons![0].id, "rev-tap-repair");
  assert(validDatabase(repaired));
});
