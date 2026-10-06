import { test } from "node:test";
import assert from "node:assert/strict";
import {
  start,
  emptyDatabase,
  validDatabase,
  migrateDatabase,
  score,
} from "../src/model";
import { decisionLesson, recordChoice } from "../src/decisions";
test("rollback reads saved keep-existing bulb without charging, installing or resetting progress", () => {
  for (const id of [
    "rev-light-home-incandescent",
    "rev-light-workshop-incandescent",
  ]) {
    const s = {
      ...start(
        {
          organization: "Uyumluluk testi",
          first: "Bir",
          second: "İki",
          mode: "practice",
        },
        [],
        [],
      ),
      decisionVersion: 1 as const,
      round: 4,
      history: [1, 2, 3].map((round) => ({
        round,
        before: 10000,
        after: 10000,
        saving: 0,
        reward: 0,
      })),
      decisions: [
        {
          opportunityId: id.includes("workshop")
            ? "light-workshop"
            : "light-home",
          choiceId: id,
          round: 4,
        },
      ],
      sorting: {},
      lessons: [
        {
          ...decisionLesson(id),
          title: "Mevcut ampulle devam ettin.",
          spent: 0,
          billImpact: 0,
          acknowledged: true,
        },
      ],
    };
    const db = { ...emptyDatabase(), active: s };
    assert(validDatabase(db));
    const snapshot = JSON.stringify(db),
      n = migrateDatabase(db);
    assert.equal(JSON.stringify(db), snapshot);
    assert.equal(n.active!.budget, s.budget);
    assert.equal(n.active!.bill, s.bill);
    assert.equal(score(n.active!), score(s));
    assert.deepEqual(n.active!.installed, []);
    assert.deepEqual(n.active!.moves, []);
    assert.deepEqual(migrateDatabase(n), n);
    const bad = structuredClone(db);
    bad.active.lessons[0].spent = 1;
    assert(!validDatabase(bad));
  }
});
test("compatibility exception does not accept arbitrary product decisions without installation", () => {
  const s = {
    ...start(
      { organization: "Test", first: "Bir", second: "İki", mode: "practice" },
      [],
      [],
    ),
    decisionVersion: 1 as const,
    decisions: [],
    sorting: {},
  };
  assert.throws(() => recordChoice(s, "rev-tap-repair"), /yerleştir/);
  assert(
    !validDatabase({
      ...emptyDatabase(),
      active: {
        ...s,
        decisions: [
          { opportunityId: "tap", choiceId: "rev-tap-repair", round: 1 },
        ],
      },
    }),
  );
});
