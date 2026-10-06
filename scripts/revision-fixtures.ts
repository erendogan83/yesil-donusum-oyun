import {
  start,
  endRound,
  continueRound,
  purchase,
  install,
  emptyDatabase,
  validDatabase,
} from "../src/model";
import { decisionProducts, opportunityFor } from "../src/decisions";
import { existingFixture } from "../src/data/market-prices";
import { writeFileSync } from "node:fs";
const fixtures = decisionProducts
  .filter((p) => !existingFixture(p.id))
  .map((p) => {
    let s = start(
      {
        organization: "Görsel QA",
        first: "Test",
        second: "İki",
        mode: "practice",
      },
      [],
      [],
    );
    while (s.round < opportunityFor(p.id)!.round)
      s = continueRound(endRound(s));
    // Prices exceed the starting budget for a few products; this only renders scenes.
    s = { ...s, budget: 1_000_000 };
    s = install(purchase(s, p.id), p.id, p.room, p.zone);
    s = {
      ...s,
      room: p.room,
      tutorial: false,
      decisionVersion: 1,
      decisions: [
        {
          opportunityId: opportunityFor(p.id)!.id,
          choiceId: p.id,
          round: s.round,
        },
      ],
      sorting: {},
    };
    const db = { ...emptyDatabase(), active: s };
    if (!validDatabase(db)) throw Error(p.id);
    return { id: p.id, db };
  });
writeFileSync(
  "qa/main-revision/placement-fixtures.json",
  JSON.stringify(fixtures),
);
