const { chromium } = require("playwright");
const fs = require("fs");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const fixtures = JSON.parse(
    fs.readFileSync("qa/main-revision/placement-fixtures.json"),
  );
  await p.goto("http://127.0.0.1:4180");
  for (const width of [1366, 1920]) {
    await p.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    for (const room of ["storage", "laundry", "bathroom", "home", "workshop"])
      for (const phase of ["before", "after"]) {
        const f = structuredClone(
          fixtures.find((f) => f.db.active.room === room) || fixtures[0],
        );
        const s = f.db.active;
        s.room = room;
        s.tutorial = false;
        s.lessons = [];
        s.activeInstallations = [];
        s.installed = [];
        s.decisions = [];
        s.sorting = {};
        if (phase === "after") {
          const ids = {
            storage: [
              "rev-pack-lentil-return",
              "rev-pack-apple-mesh",
              "rev-pack-towel-kraft",
              "rev-pack-scarf-box",
            ],
            bathroom: ["rev-shower-compact"],
            home: ["rev-light-home-led"],
            workshop: ["rev-light-workshop-led"],
            laundry: [],
          }[room];
          s.activeInstallations = ids;
          s.installed = ids;
          s.round = 4;
          s.history = structuredClone(
            fixtures.find((f) => f.db.active.round === 4).db.active.history,
          );
          s.moves = ids.flatMap((id) =>
            fixtures
              .find((f) => f.id === id)
              .db.active.moves.filter((m) => m.id === id),
          );
          if (room === "laundry")
            s.sorting = {
              "laundry-sort": {
                placed: ["white", "color", "dark"],
                firstAnswers: { white: "white", color: "color", dark: "dark" },
              },
            };
        }
        await p.evaluate(
          (d) => localStorage.setItem("yesil-donusum-v1", JSON.stringify(d)),
          f.db,
        );
        await p.reload();
        await p.locator('[data-action="resume"]').click();
        await p.waitForTimeout(400);
        await p.screenshot({
          path: `qa/main-revision/states-${room}-${phase}-${width}.png`,
        });
      }
  }
  assert.deepEqual(errors, []);
  await b.close();
  console.log("BEFORE/AFTER: 20 scene screenshots, no page errors");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
