import { marketPrice, existingFixture } from "../src/data/market-prices";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  start,
  purchase,
  install,
  freeMove,
  endRound,
  continueRound,
  finish,
  score,
  ranking,
  csv,
  validDatabase,
  emptyDatabase,
  type State,
  type Team,
} from "../src/model";
import { products, rooms, combos, freeActions } from "../src/data";
import { existsSync } from "node:fs";
const team: Team = {
  organization: "TEST KURUMU — gerçek kurum değildir",
  first: "Nisa",
  second: "Ayşe",
  mode: "practice",
};
const orgs = Array.from({ length: 26 }, (_, i) => `Test kurumu ${i + 1}`);
const fresh = () => start(team, [], []);
function put(s: State, id: string) {
  const p = products.find((p) => p.id === id)!;
  return install(purchase(s, id), id, p.room, p.zone);
}
test("starts at 10000 bill / 2500 budget and retains both participant names", () => {
  const s = fresh();
  assert.equal(s.bill, 10000);
  assert.equal(s.budget, 2500);
  assert.deepEqual(s.team, team);
});
test("registration rejects blanks and unknown official organizations", () => {
  assert.throws(() => start({ ...team, first: " " }, [], []));
  assert.throws(() => start({ ...team, mode: "official" }, [], orgs));
  assert.throws(() =>
    start({ ...team, mode: "official", organization: orgs[0] }, [], []),
  );
});
test("purchase charges once, creates inventory, reveals no effect", () => {
  const s = purchase(fresh(), "tap-a");
  assert.equal(s.budget, 2350);
  assert.equal(s.bill, 10000);
  assert.deepEqual(s.inventory, ["tap-a"]);
  assert.throws(() => purchase(s, "tap-a"));
});
test("insufficient funds and locked-round products leave state untouched", () => {
  const s = { ...fresh(), budget: 10 };
  assert.throws(() => purchase(s, "tap-a"));
  assert.equal(s.budget, 10);
  assert.throws(() => purchase(fresh(), "solar"));
});
test("wrong installation zone / room costs nothing and keeps product", () => {
  const s = purchase(fresh(), "tap-a");
  assert.throws(() => install(s, "tap-a", "kitchen", "food"));
  assert.throws(() => install(s, "tap-a", "bathroom", "shower"));
  assert.equal(s.bill, 10000);
  assert.equal(s.budget, 2350);
  assert.deepEqual(s.inventory, ["tap-a"]);
});
test("installation is single-use and applies exact impact", () => {
  const s = put(fresh(), "tap-a");
  assert.equal(s.bill, 9820);
  assert.equal(s.inventory.length, 0);
  assert(s.installed.includes("tap-a"));
  assert.throws(() => install(s, "tap-a", "kitchen", "tap"));
});
test("bad and neutral choices produce distinct outcomes", () => {
  assert.equal(put(fresh(), "shower-b").bill, 10240);
  const s = { ...fresh(), round: 2 };
  assert.equal(put(s, "meter").bill, 10000);
  assert.equal(put(s, "basic-strip").bill, 10000);
});
test("conditional tank requires rain connection", () => {
  const s = { ...fresh(), round: 3 };
  assert.equal(put(s, "tank").bill, 10000);
  assert.equal(put(put(s, "rain"), "tank").bill, 9500);
});
test("combination applied exactly once regardless of action order", () => {
  let s = put(put(fresh(), "repair"), "tap-a");
  assert.equal(s.bill, 9320);
  assert.deepEqual(s.combos, ["water"]);
  s = freeMove(s, "stock");
  assert.equal(s.bill, 9120);
  const b = { ...fresh(), round: 2 };
  const a = put(freeMove(b, "off"), "meter"),
    c = freeMove(put(b, "meter"), "off");
  assert.equal(a.bill, c.bill);
  assert.equal(a.bill, 9580);
});
test("four free actions total, no duplicates, unavailable areas rejected", () => {
  assert.throws(() => freeMove(fresh(), "dawn"));
  let s = { ...fresh(), round: 4 };
  for (const a of freeActions.slice(0, 4)) s = freeMove(s, a.id);
  assert.equal(s.actions.length, 4);
  assert.throws(() => freeMove(s, "dawn"));
  assert.throws(() => freeMove(s, "lights"));
  assert.equal(s.budget, 2500);
});
test("round reward is 25% of new period saving, cannot be collected twice", () => {
  const s = endRound(put(fresh(), "tap-a"));
  assert.equal(s.budget, 2395);
  assert.equal(s.history[0].reward, 45);
  assert.throws(() => endRound(s));
  assert.throws(() => purchase(s, "repair"));
  assert.equal(continueRound(s).round, 2);
});
test("all four rounds complete, final score deterministic, practice excluded", () => {
  let s = put(fresh(), "tap-a");
  for (let i = 1; i <= 4; i++) {
    assert.equal(s.round, i);
    s = continueRound(endRound(s));
  }
  assert.equal(s.phase, "finished");
  assert.equal(s.history.length, 4);
  assert.equal(score(s), 360 + (235 + 4.5) * 2);
  const db = finish({ ...emptyDatabase(), active: s });
  assert.equal(db.results.length, 0);
});
test("official result is idempotent, ranked by saving and locks institution", () => {
  let s = start({ ...team, organization: orgs[0], mode: "official" }, [], orgs);
  s = put(s, "tap-a");
  for (let i = 0; i < 4; i++) s = continueRound(endRound(s));
  const db = finish({ ...emptyDatabase(), active: s });
  assert.equal(db.results.length, 1);
  assert.equal(finish(db).results.length, 1);
  assert.equal(db.results[0].team.second, "Ayşe");
  assert.equal(db.results[0].savingPercent, 1.8);
  assert.throws(() => start(s.team, db.results, orgs));
  assert.equal(
    start({ ...s.team, mode: "practice" }, db.results, orgs).bill,
    10000,
  );
  const r = db.results[0];
  assert.equal(
    ranking([{ ...r, id: "low", savingPercent: 1, score: 99999 }, r])[0].id,
    r.id,
  );
});
test("JSON autosave roundtrip and invalid save rejection", () => {
  const db = { ...emptyDatabase(), active: put(fresh(), "tap-a") };
  const saved = JSON.parse(JSON.stringify(db));
  assert(validDatabase(saved));
  assert.equal(saved.active!.bill, 9820);
  assert(!validDatabase({ version: 4 }));
  assert(
    !validDatabase({ ...db, active: { ...db.active, inventory: ["unknown"] } }),
  );
});
test("CSV retains names, escapes quotes and neutralizes spreadsheet formulas", () => {
  let s = {
    ...fresh(),
    phase: "finished" as const,
    team: { ...team, organization: "=TEST", mode: "official" as const },
  };
  const results = finish({ ...emptyDatabase(), active: s }).results;
  const out = csv(results);
  assert(out.includes("'=TEST"));
  assert(out.includes("Ayşe"));
  assert(out.startsWith("\uFEFF"));
});
test("every marketed product can be bought and installed in its named snap zone", () => {
  for (const p of products) {
    const s = { ...fresh(), round: 4, budget: 9999 };
    const r = rooms.find((r) => r.id === p.room)!;
    assert(r.zones.some((z) => z.id === p.zone));
    if (existingFixture(p.id) || marketPrice(p.id)?.priceTL === null) { assert.throws(() => purchase(s,p.id)); continue; }
    const next = put(s, p.id);
    assert(next.installed.includes(p.id));
    assert.equal(next.budget, 9999 - p.price);
  }
});
test("asset catalog references existing local assets and has no external runtime URLs", () => {
  for (const key of new Set([
    ...rooms.map((r) => r.asset),
    "bg_main_overview_base",
    "bg_market_base",
    ...products.flatMap((p) => [
      p.asset,
      ...(p.installedAsset ? [p.installedAsset] : []),
    ]),
    ...freeActions.map((a) => a.asset),
  ]))
    assert(existsSync(`public/assets/${key}.webp`), key);
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
  for (const c of combos)
    assert(c.products.every((id) => products.some((p) => p.id === id)));
});

test("period reward only uses new savings and caps at 500", () => {
  let s = endRound({ ...fresh(), bill: 9000 });
  assert.equal(s.history[0].reward, 250);
  assert.equal(s.history[0].saving, 1000);
  s = continueRound(s);
  const next = endRound({ ...s, bill: 8700 });
  assert.equal(next.history[1].saving, 300);
  assert.equal(next.history[1].reward, 75);
  const unchanged = endRound(s);
  assert.equal(unchanged.history[1].saving, 0);
  assert.equal(unchanged.history[1].reward, 0);
  assert.equal(endRound({ ...s, bill: 9500 }).history[1].reward, 0);
  assert.equal(endRound({ ...fresh(), bill: 6000 }).history[0].reward, 500);
});

test("both participants are mandatory, including whitespace names", () => {
  for (const names of [
    { first: "", second: "Ayşe" },
    { first: "Nisa", second: "" },
    { first: "Nisa", second: "  " },
  ])
    assert.throws(
      () => start({ ...team, ...names }, [], []),
      /Kooperatifi ve iki katılımcının adını da yazın/,
    );
  assert.equal(
    start({ ...team, second: " Ayşe " }, [], []).team.second,
    "Ayşe",
  );
});
