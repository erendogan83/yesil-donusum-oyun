import { test } from "node:test";
import assert from "node:assert/strict";
import {
  start,
  purchase,
  install,
  endRound,
  continueRound,
  changeChoice,
  score,
  emptyDatabase,
  migrateDatabase,
  validDatabase,
  type State,
} from "../src/model";
import {
  opportunities,
  copy,
  details,
  points,
  recordChoice,
  skipOptional,
  revisable,
  maximumScore,
} from "../src/decisions";
import { productById } from "../src/data";
import { marketPrice } from "../src/data/market-prices";
import { isTimed } from "../src/clock";
import { INITIAL_BUDGET, SAVING_PAYOUT_RATE } from "../src/economy";

const game = (mode: "practice" | "official" | "room" = "practice"): State => ({
  ...start({ organization: "", first: "Eren", second: "", mode }),
  decisionVersion: 1,
  decisions: [],
  sorting: {},
  tutorial: false,
});
/** Buys, installs and records a product choice the way the game does. */
const pick = (s: State, id: string): State => {
  const p = productById(id);
  return recordChoice(install(purchase(s, id), id, p.room, p.zone), id);
};
const price = (id: string) => marketPrice(id).priceTL!;

test("a new game starts with 10 000 TL", () => {
  assert.equal(INITIAL_BUDGET, 10_000);
  assert.equal(game().budget, 10_000);
});

test("a correct item pays exactly what it saves, a useless one pays nothing", () => {
  const repaired = pick(game(), "rev-tap-repair");
  assert.equal(repaired.bill, 10_000 - 180);
  assert.equal(
    repaired.budget,
    INITIAL_BUDGET - price("rev-tap-repair") + 180 * SAVING_PAYOUT_RATE,
  );
  assert.equal(repaired.moves[0].reward, 180);
  // A bigger saving pays more: the compact shower saves 260.
  const shower = pick(game(), "rev-shower-compact");
  assert.equal(shower.moves[0].reward, 260);
  // An aerator does nothing for a leaking washer; a rain head raises the bill.
  const aerator = pick(game(), "rev-tap-aerator");
  assert.equal(aerator.moves[0].reward, undefined);
  assert.equal(aerator.budget, INITIAL_BUDGET - price("rev-tap-aerator"));
  const rain = pick(game(), "rev-shower-rain");
  assert.equal(rain.moves[0].reward, undefined);
  assert.equal(rain.budget, INITIAL_BUDGET - price("rev-shower-rain"));
});

test("a wrong item can be taken out: its price stays spent, the choice opens again", () => {
  const wrong = pick(game(), "rev-tap-aerator");
  assert.equal(wrong.decisions!.length, 1);
  assert.equal(revisable(wrong, "kitchen").length, 1);
  const open = changeChoice(wrong, "tap");
  assert.equal(open.decisions!.length, 0);
  assert.deepEqual(open.installed, []);
  assert.deepEqual(open.activeInstallations, []);
  assert.deepEqual(open.moves, []);
  assert.equal(open.bill, wrong.bill);
  assert.equal(open.budget, wrong.budget, "no refund");
  assert.equal(open.removedSpend, price("rev-tap-aerator"));
  assert.equal(score(open), 0);
  assert(validDatabase({ ...emptyDatabase(), active: open }));
  // Trying again until the right one is found costs a price each time.
  const right = pick(open, "rev-tap-repair");
  assert.equal(
    right.budget,
    INITIAL_BUDGET - price("rev-tap-aerator") - price("rev-tap-repair") + 180,
  );
  assert.equal(score(right), points["rev-tap-repair"].decisionScore);
  assert(validDatabase({ ...emptyDatabase(), active: right }));
});

test("taking out a paying item takes its saving money back too, so it cannot be farmed", () => {
  const good = pick(game(), "rev-tap-repair");
  const open = changeChoice(good, "tap");
  assert.equal(open.bill, 10_000);
  assert.equal(open.budget, INITIAL_BUDGET - price("rev-tap-repair"));
  // Buying and removing it over and over only ever loses money.
  let s = open;
  for (let i = 0; i < 3; i++)
    s = changeChoice(pick(s, "rev-tap-repair"), "tap");
  assert.equal(s.budget, INITIAL_BUDGET - 4 * price("rev-tap-repair"));
  assert.equal(s.removedSpend, 4 * price("rev-tap-repair"));
});

test("behaviour choices change for free and the score follows the final choice", () => {
  // The shower and the optional basin come before the flush question.
  const ready = skipOptional(pick(game(), "rev-shower-compact"), "basin");
  const scoreBefore = score(ready);
  const first = recordChoice(ready, "rev-flush-full");
  assert.equal(
    score(first) - scoreBefore,
    points["rev-flush-full"].decisionScore,
  );
  const second = recordChoice(changeChoice(first, "flush"), "rev-flush-half");
  assert.equal(second.budget, ready.budget);
  assert.equal(score(second) - scoreBefore, 100);
  assert.equal(second.decisions!.length, 3);
  assert.equal(
    second.lessons!.filter((l) => l.id.startsWith("rev-flush")).length,
    1,
  );
});

test("only this period's choices can change, never a closed one or a sorting step", () => {
  const s = pick(game(), "rev-tap-repair");
  const next = continueRound(endRound(s));
  assert.throws(() => changeChoice(next, "tap"), /Önceki dönemin/);
  assert.deepEqual(revisable(next, "kitchen"), []);
  assert.throws(() => changeChoice(game(), "tap"), /Değiştirilecek/);
  assert.throws(() => changeChoice(game(), "waste-sort"));
  // Old-style games have no choices to change.
  assert.throws(() =>
    changeChoice({ ...s, decisionVersion: undefined }, "tap"),
  );
});

test("the period reports the item payouts and removed items no longer count", () => {
  let s = pick(game(), "rev-tap-repair");
  s = pick(s, "rev-shower-compact");
  assert.equal(endRound(s).history[0].reward, 180 + 260);
  s = changeChoice(s, "shower");
  assert.equal(endRound(s).history[0].reward, 180);
});

test("every item has a plus and a minus the player can read", () => {
  for (const o of opportunities)
    for (const id of o.choices) {
      assert(copy[id], id);
      assert(details[id]?.pros.length > 10, `${id} has no plus`);
      assert(details[id]?.cons.length > 10, `${id} has no minus`);
    }
  for (const id of Object.keys(details)) assert(copy[id], `${id} is orphaned`);
});

test("the wash programme question is gone; old saves that answered it still load", () => {
  assert(!opportunities.some((o) => o.id === "laundry-program"));
  assert(!Object.keys(copy).some((id) => id.startsWith("rev-laundry-program")));
  assert.equal(maximumScore, 1700);
  const old: State = {
    ...game(),
    decisions: [
      {
        opportunityId: "laundry-program",
        choiceId: "rev-laundry-program-eco",
        round: 1,
      },
    ],
    lessons: [
      {
        id: "rev-laundry-program-eco",
        title: "x",
        result: "x",
        realLife: "",
        takeaway: "",
        memoryName: "x",
        asset: "",
        category: "Ev",
        billImpact: 0,
        comboImpact: 0,
        spent: 0,
        tone: "good",
        acknowledged: false,
        remind: false,
      },
    ],
  };
  const raw = { ...emptyDatabase(), active: old };
  assert(validDatabase(raw), "the old save is still readable");
  assert.equal(score(old), 0, "a retired decision never scores");
  const migrated = migrateDatabase(raw);
  assert.deepEqual(migrated.active!.decisions, []);
  assert.deepEqual(migrated.active!.lessons, []);
  assert.deepEqual(migrateDatabase(migrated), migrated);
});

test("rooms can be created without a clock", () => {
  const room = (timed?: boolean) =>
    ({
      ...start({
        organization: "",
        first: "Eren",
        second: "",
        mode: "room",
        room: "ABCDE",
        ...(timed === undefined ? {} : { timed }),
      }),
      decisionVersion: 1,
      decisions: [],
      sorting: {},
    }) as State;
  assert(isTimed(room()), "rooms are timed unless said otherwise");
  assert(isTimed(room(true)));
  assert(!isTimed(room(false)));
  assert(validDatabase({ ...emptyDatabase(), active: room(false) }));
});
