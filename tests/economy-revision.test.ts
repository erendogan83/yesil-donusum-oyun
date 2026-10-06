import { test } from "node:test";
import assert from "node:assert/strict";
import {
  start,
  endRound,
  continueRound,
  acknowledgeSales,
  purchase,
  install,
  score,
  emptyDatabase,
  migrateDatabase,
  validDatabase,
  type State,
} from "../src/model";
import { recordChoice } from "../src/decisions";
import { marketPrice } from "../src/data/market-prices";
const fresh = (): State => ({
  ...start(
    { organization: "Test", first: "Bir", second: "İki", mode: "practice" },
    [],
    [],
  ),
  decisionVersion: 1,
  decisions: [],
  sorting: {},
  tutorial: false,
});
test("800 saves 200; 3000 saves capped 500; unchanged period yields zero", () => {
  for (const [saving, reward] of [
    [800, 200],
    [3000, 500],
    [0, 0],
  ]) {
    const s = endRound({ ...fresh(), bill: 10000 - saving });
    assert.equal(s.history[0].reward, reward);
    assert.equal(s.budget, 2500 + reward);
    assert.throws(() => endRound(s));
    assert.equal(endRound(continueRound(s)).history[1].reward, 0);
  }
});
test("round four sales are fixed, persisted and acknowledged without double payment", () => {
  for (const remaining of [900, 3400]) {
    let s = fresh();
    for (let i = 0; i < 2; i++) s = continueRound(endRound(s));
    s = endRound({ ...s, budget: remaining });
    s = continueRound(s);
    assert.equal(s.budget, remaining + 7500);
    assert(s.salesIncomeGranted);
    assert.equal(s.salesIncomeAcknowledged, false);
    const d = migrateDatabase(
      JSON.parse(JSON.stringify({ ...emptyDatabase(), active: s })),
    );
    assert(validDatabase(d));
    assert.equal(d.active!.budget, s.budget);
    s = acknowledgeSales(d.active!);
    assert.equal(acknowledgeSales(s).budget, remaining + 7500);
    assert.throws(() => continueRound(s));
    assert.equal(score(s), 0);
  }
});
test("panel 8475: shortfall 75 blocks purchase; 10900 leaves 2425; locked until four", () => {
  let s = fresh();
  assert.throws(() =>
    purchase({ ...s, budget: 10900 }, "rev-roof-bonus-solar"),
  );
  for (let i = 0; i < 3; i++) s = continueRound(endRound(s));
  assert.throws(() => purchase({ ...s, budget: 8400 }, "rev-roof-bonus-solar"));
  const bought = purchase({ ...s, budget: 10900 }, "rev-roof-bonus-solar");
  assert.equal(bought.budget, 2425);
  const done = recordChoice(
    install(bought, "rev-roof-bonus-solar", "roof", "rev-roof-bonus"),
    "rev-roof-bonus-solar",
  );
  assert.equal(score(done), score(s));
});
test("existing bulb costs nothing and survives validation; LED and halogen have independent prices and scores", () => {
  const s = continueRound(endRound(fresh()));
  const keep = recordChoice(s, "rev-light-home-incandescent");
  assert.equal(keep.budget, s.budget);
  assert.equal(keep.inventory.length, 0);
  assert.equal(keep.installed.length, 0);
  assert(validDatabase({ ...emptyDatabase(), active: keep }));
  assert.throws(() => purchase(s, "rev-light-home-incandescent"));
  assert.equal(marketPrice("rev-light-home-led").priceTL, 50);
  assert.equal(marketPrice("rev-light-home-halogen").priceTL, 175);
  const bought = purchase(s, "rev-light-home-led");
  assert.equal(bought.bill, s.bill);
  const done = recordChoice(
    install(bought, "rev-light-home-led", "home", "rev-light-home"),
    "rev-light-home-led",
  );
  assert.equal(done.lessons!.at(-1)!.spent, 50);
  assert.equal(score({ ...done, budget: 1 }), score(done));
});
test("historical pending purchases retain their paid cost after catalog update", () => {
  const s = continueRound(endRound(fresh()));
  const raw = {
    ...emptyDatabase(),
    active: { ...s, budget: 2360, inventory: ["rev-light-home-led"] },
  };
  const migrated = migrateDatabase(raw);
  assert.equal(migrated.active!.purchaseCosts!["rev-light-home-led"], 140);
  assert.equal(
    install(migrated.active!, "rev-light-home-led", "home", "rev-light-home")
      .moves[0].cost,
    140,
  );
  assert.deepEqual(migrateDatabase(migrated), migrated);
});
