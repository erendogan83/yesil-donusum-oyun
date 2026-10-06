import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_BILL,
  INITIAL_BUDGET,
  MONEY_SCALE,
  ROUND_REWARD_CAP,
  fmtMoney,
  signedMoney,
} from "../src/economy";
import {
  start,
  purchase,
  install,
  endRound,
  continueRound,
  score,
  savingPercent,
  zoneResolved,
  emptyDatabase,
  validDatabase,
  migrateDatabase,
  ranking,
  type State,
} from "../src/model";
import { products, productById } from "../src/data";
import { productLesson } from "../src/learning";
const fresh = () =>
  start(
    { organization: "Test", first: "Ayşe", second: "Fatma", mode: "practice" },
    [],
    [],
  );
const put = (s: State, id: string) => {
  const p = productById(id);
  return install(purchase(s, id), id, p.room, p.zone);
};
test("TL constants, signed display, savings and normalized score", () => {
  assert.equal(INITIAL_BILL, 10000);
  assert.equal(INITIAL_BUDGET, 2500);
  assert.equal(ROUND_REWARD_CAP, 500);
  assert.equal(fmtMoney(10000), "₺10.000");
  assert.equal(fmtMoney(2500), "₺2.500");
  assert.equal(fmtMoney(-180), "-₺180");
  assert.equal(signedMoney(240), "+₺240");
  assert.equal(fmtMoney(380.2), "₺380");
  const s = put(fresh(), "tap-a");
  assert.equal(s.bill, 9820);
  assert.equal(s.budget, 2350);
  assert.equal(savingPercent(s), 1.8);
  assert.equal(score(s), 830);
  assert.equal(score(continueRound(endRound(s))), 839);
});
test("all exclusive choices replace only the active contribution, never refund either purchase", () => {
  for (const [oldId, newId] of [
    ["shower-b", "shower-a"],
    ["bulb", "led"],
    ["basic-strip", "strip"],
    ["bin", "sort"],
    ["solar-lamp", "solar"],
    ["solar", "portable-solar"],
  ]) {
    const initial = { ...fresh(), round: 4, budget: 10000 };
    const old = productById(oldId),
      p = productById(newId);
    const first = put(initial, oldId),
      next = put(first, newId);
    assert.equal(next.bill, INITIAL_BILL + p.impact);
    assert.equal(next.budget, 10000 - old.price - p.price);
    assert.deepEqual(next.activeInstallations, [newId]);
    assert.deepEqual(next.replacedInstallations, [oldId]);
    assert.equal(next.moves.length, 2);
    assert.equal(next.moves[0].replacedBy, newId);
    assert.equal(next.moves[1].reversalImpact, -old.impact || 0);
    assert.deepEqual(next.installed, [oldId, newId]);
    assert.throws(() => purchase(next, oldId));
  }
});
test("replacing an improvement with a worse choice reopens the opportunity", () => {
  const better = put(fresh(), "shower-a");
  assert(zoneResolved(better, "bathroom", "shower"));
  const worse = put(better, "shower-b");
  assert.equal(worse.bill, 10240);
  assert(!zoneResolved(worse, "bathroom", "shower"));
});
test("complementary products and one-time combo bonuses coexist", () => {
  for (const ids of [
    ["repair", "tap-a"],
    ["curtain", "seal"],
    ["meter", "strip"],
    ["rain", "tank"],
    ["rain", "drip"],
  ]) {
    let s = { ...fresh(), round: 4 };
    for (const id of ids) s = put(s, id);
    assert.deepEqual(s.activeInstallations, ids);
    assert.deepEqual(s.replacedInstallations, []);
  }
  const s = put(
    put(put({ ...fresh(), round: 4 }, "meter"), "strip"),
    "basic-strip",
  );
  assert.deepEqual(s.activeInstallations, ["meter", "basic-strip"]);
  assert.equal(s.bill, INITIAL_BILL);
});
test("v1 money migrates once, including cards/history/results; ranking and original raw data survive", () => {
  let s = put(fresh(), "shower-b");
  s = put(s, "shower-a");
  s = endRound(s);
  s.lessons = [productLesson(productById("shower-a"), -320, -320, true)];
  const raw: any = { ...emptyDatabase(), active: s };
  raw.version = 1;
  raw.active.version = 1;
  // Real v1 used cumulative impacts for alternatives. Preserve that recorded amount.
  raw.active.bill = 992;
  raw.active.budget = 184;
  raw.active.moves.forEach((m: any) => {
    m.cost /= MONEY_SCALE;
    m.impact /= MONEY_SCALE;
    delete m.replacedBy;
    delete m.reversalImpact;
  });
  raw.active.history = [
    { round: 1, before: 1000, after: 992, saving: 8, reward: 4 },
  ];
  raw.active.lessons.forEach((l: any) => {
    l.spent /= MONEY_SCALE;
    l.billImpact /= MONEY_SCALE;
    l.comboImpact /= MONEY_SCALE;
  });
  delete raw.active.activeInstallations;
  delete raw.active.replacedInstallations;
  raw.results = [
    {
      id: "old",
      team: { ...s.team, mode: "official" },
      bill: 850,
      budget: 112,
      score: 4000,
      savingPercent: 15,
      completedAt: "2026-10-03T12:00:00Z",
    },
  ];
  const next = migrateDatabase(raw);
  assert.equal(next.version, 2);
  assert.equal(next.active!.version, 2);
  assert.equal(next.active!.bill, 9920);
  assert.equal(next.active!.budget, 1840);
  assert.equal(next.active!.history[0].reward, 40);
  assert.equal(next.active!.moves[0].cost, 380);
  assert.equal(next.active!.lessons![0].spent, 280);
  assert.equal(next.active!.lessons![0].billImpact, -320);
  assert.deepEqual(next.active!.activeInstallations, ["shower-a"]);
  assert.equal(next.active!.legacyAdjustment, 240);
  assert.equal(next.results[0].bill, 8500);
  assert.equal(next.results[0].budget, 1120);
  assert.equal(next.results[0].score, 4000);
  assert.deepEqual(
    ranking(next.results).map((r) => r.id),
    ranking(raw.results).map((r) => r.id),
  );
  assert.equal(raw.active.bill, 992);
  assert(validDatabase(next));
  assert.deepEqual(migrateDatabase(next), next);
  const malformed = structuredClone(next);
  malformed.active!.activeInstallations.push("shower-b");
  assert(!validDatabase(malformed));
});
test("all thirty market descriptions are short and do not reveal consequence", () => {
  assert.equal(products.filter((p) => !p.id.startsWith("rev-")).length, 30);
  for (const p of products.filter((p) => !p.id.startsWith("rev-"))) {
    const words = p.feature.trim().split(/\s+/).length;
    assert(words >= 2 && words <= 6, p.id);
    assert(p.description.length < 90, p.id);
    assert(
      !/tasarruf|verimsiz|fatura|doğru seçim|yanlış seçim|azaltır|artırır/i.test(
        p.feature + " " + p.description,
      ),
      p.id,
    );
  }
  assert.equal(productById("shower-a").name, "Kompakt Duş Başlığı");
  assert.equal(productById("led").name, "Mat Gövdeli Ampul");
  assert(
    products.indexOf(productById("shower-b")) <
      products.indexOf(productById("shower-a")),
  );
});
