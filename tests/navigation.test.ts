import { test } from "node:test";
import assert from "node:assert/strict";
import {
  futureInteractions,
  offeredProduct,
  returnLabels,
  activeOpportunity,
} from "../src/navigation";
import { productById } from "../src/data";
import {
  start,
  purchase,
  emptyDatabase,
  migrateDatabase,
  validDatabase,
  install,
} from "../src/model";
import { solutions } from "../src/journey";

test("origin survives save migration without altering money; legacy origin is optional", () => {
  const active = start(
    { organization: "QA", first: "Ayşe", second: "Fatma", mode: "practice" },
    [],
    [],
  );
  const db = { ...emptyDatabase(), active };
  assert(validDatabase(db));
  active.originScene = "bathroom";
  active.originZone = "shower";
  active.room = "market";
  const restored = migrateDatabase(JSON.parse(JSON.stringify(db))).active!;
  assert.equal(restored.originScene, "bathroom");
  assert.equal(restored.originZone, "shower");
  assert.equal(restored.bill, active.bill);
  assert.equal(restored.budget, active.budget);
  assert.equal(returnLabels[restored.originScene!], "BANYOYA DÖN");
  assert(
    !validDatabase({ ...db, active: { ...active, originScene: "invalid" } }),
  );
});

test("one opportunity advances after a choice, including a bad choice; pending inventory stays first", () => {
  let s = start(
    { organization: "QA", first: "Ayşe", second: "Fatma", mode: "practice" },
    [],
    [],
  );
  assert.equal(activeOpportunity(s, "kitchen")?.id, "tap");
  s = purchase(s, "tap-a");
  assert.equal(activeOpportunity(s, "kitchen")?.id, "tap");
  s = install(s, "tap-a", "kitchen", "tap");
  assert.equal(activeOpportunity(s, "kitchen")?.id, "food");
  s = install(purchase(s, "wrap"), "wrap", "kitchen", "food");
  assert.equal(activeOpportunity(s, "kitchen"), undefined);
});
test("future slots are unique and inert; legacy curtain remains data but is not offered", () => {
  assert.equal(futureInteractions.length, 13);
  assert.equal(new Set(futureInteractions.map((s) => s.id)).size, 13);
  assert(futureInteractions.every((s) => !s.enabled));
  assert(
    futureInteractions
      .find((s) => s.id === "office-light")
      ?.compatibleProducts?.includes("led"),
  );
  assert(!offeredProduct(productById("curtain")));
  assert(!offeredProduct(productById("sort")));
  assert(!solutions("home", "window", 4).some((p) => p.id === "curtain"));
  assert(productById("curtain").price > 0);
});

import { opportunities } from "../src/decisions";
import { nextRoom, pendingRooms, optionalLeft } from "../src/navigation";
import type { State } from "../src/model";
const withDecisions = (round: number, done: string[]): State => ({
  ...start(
    { organization: "QA", first: "Ayşe", second: "Fatma", mode: "practice" },
    [],
    [],
  ),
  decisionVersion: 1,
  round,
  sorting: {},
  decisions: done.map((id) => ({
    opportunityId: id,
    choiceId: "x",
    round,
  })),
});
for (const round of [1, 2, 3, 4]) {
  const upTo = opportunities.filter((o) => o.round <= round);
  test(`round ${round}: section counters agree on required vs optional steps`, () => {
    const core = upTo.filter((o) => o.core).map((o) => o.id);
    // Every required step done: nothing pending, even though optional ones remain.
    const coreDone = withDecisions(round, core);
    assert.equal(nextRoom(coreDone), undefined);
    assert.deepEqual(pendingRooms(coreDone), []);
    assert.equal(
      optionalLeft(coreDone),
      upTo.some((o) => !o.core),
    );
    // Everything done: no optional left either.
    const allDone = withDecisions(
      round,
      upTo.map((o) => o.id),
    );
    assert.equal(nextRoom(allDone), undefined);
    assert.equal(optionalLeft(allDone), false);
    // Leave exactly one required step open: exactly its room is pending,
    // even when an optional step in that room comes first.
    for (const o of upTo.filter((o) => o.core)) {
      const s = withDecisions(
        round,
        core.filter((id) => id !== o.id),
      );
      assert.deepEqual(
        pendingRooms(s).map((r) => r.id),
        [o.roomId],
        `${o.id} should keep ${o.roomId} pending`,
      );
    }
  });
}
