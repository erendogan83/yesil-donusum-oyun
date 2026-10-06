const { chromium } = require("playwright");
const fs = require("fs");
const assert = require("node:assert/strict");
const path = require("path");
const ops = JSON.parse(
  fs.readFileSync("src/decisions/opportunities.json", "utf8"),
);
const pts = JSON.parse(fs.readFileSync("src/decisions/scores.json", "utf8"));
const out = "qa/main-revision";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const busy = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#stage")?.getAttribute("aria-busy") !== "true",
    );
  const click = async (a) => {
    await page.locator(`[data-action="${a}"]`).first().click();
    await busy();
  };
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("yesil-donusum-v1")));
  const shot = async (name) => {
    await page.waitForTimeout(500);
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    for (const [width, height] of [
      [1366, 768],
      [1536, 864],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${out}/${name}-${width}.png` });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await page.setViewportSize({ width: 1366, height: 768 });
  };
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:5175");
  await click("new");
  await page.locator("#organization").fill("QA Kooperatifi");
  await page.locator("#first").fill("Ayşe");
  await page.locator("#second").fill("Nisa");
  await page.locator('[type="submit"]').click();
  await click("tutorial-done");
  assert.equal((await state()).active.room, "map");
  await shot("map");
  for (let round = 1; round <= 4; round++) {
    for (const o of ops.filter((o) => o.round === round)) {
      const current = (await state()).active;
      if (current.room !== o.roomId) {
        if (current.room !== "map") {
          await click("help");
          await page.locator('#dialog [data-action="map"]').click();
          await busy();
        }
        await click(`room:${o.roomId}`);
      }
      // The leğen precedes core bathroom steps and must be skipped first.
      if (!o.core && o.id !== "basin" && process.env.LEAVE_OPTIONAL) {
        console.log("LEAVE OPTIONAL", o.id);
        continue;
      }
      if (!o.core) {
        await click(`optional-skip:${o.id}`);
        console.log("SKIP OPTIONAL", o.id);
        continue;
      }
      if (o.kind === "sorting") {
        await click(`solve:${o.roomId}:rev-${o.id}`);
        await shot(o.id);
        if (o.id === "waste-sort") {
          await click("sort-select:tissue");
          await click("sort-target:paper");
          assert.equal((await state()).active.sorting[o.id].placed.length, 0);
        }
        for (const i of o.items) {
          if (o.id === "laundry-sort") {
            // Drag and drop with the mouse, as a player would.
            const from = await page
              .locator(`[data-item="${i.id}"]`)
              .boundingBox();
            const to = await page
              .locator(`[data-target="${i.target}"]`)
              .boundingBox();
            await page.mouse.move(
              from.x + from.width / 2,
              from.y + from.height / 2,
            );
            await page.mouse.down();
            await page.mouse.move(
              from.x + from.width / 2 + 15,
              from.y + from.height / 2 + 15,
              { steps: 3 },
            );
            await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
              steps: 8,
            });
            await page.mouse.up();
            await busy();
            continue;
          }
          await click(`sort-select:${i.id}`);
          await click(`sort-target:${i.target}`);
        }
      } else if (o.kind === "product") {
        await click(`solve:${o.roomId}:rev-${o.id}`);
        if (
          [
            "tap",
            "shower",
            "light-workshop",
            "irrigation",
            "pack-towel",
          ].includes(o.id)
        )
          await shot(`market-${o.id}`);
        const id = [...o.choices].sort(
          (a, b) => pts[b].decisionScore - pts[a].decisionScore,
        )[0];
        await click(`product:${id}`);
        await click(`inspect:${id}`);
        await click(`buy:${id}`);
        await click("place-ready");
      } else {
        await click(`solve:${o.roomId}:rev-${o.id}`);
        await shot(o.id);
        const id = [...o.choices].sort(
          (a, b) => pts[b].decisionScore - pts[a].decisionScore,
        )[0];
        if (o.kind === "load") {
          await click(`load-select:${id}`);
          await shot("load-full");
        }
        await click(`choose:${id}`);
      }
      await page.locator("#learning-dialog[open]").waitFor();
      if (o.id === "tap") {
        await page.waitForTimeout(4200);
        assert(await page.locator("#learning-dialog").evaluate((d) => d.open));
        await shot("learning");
      }
      await click("lesson-ack");
      if (
        [
          "tap",
          "shower",
          "basin",
          "light-home",
          "light-workshop",
          "office-power",
          "irrigation",
          "irrigation-timer",
          "pack-towel",
          "roof-bonus",
        ].includes(o.id)
      )
        await shot(`installed-${o.id}`);
      if (o.id === "toothbrush") {
        const before = (await state()).active;
        await page.reload();
        await click("resume");
        assert.deepEqual((await state()).active.decisions, before.decisions);
      }
      console.log("PASS", round, o.id);
    }
    if (!(await page.locator("[data-action=end]").count())) {
      // A room with an optional offer shows "Şimdilik geç"; leave through the map.
      await click("help");
      await page.locator('#dialog [data-action="map"]').click();
      await busy();
    }
    await click("end");
    // The confirmation only appears while steps are still unfinished.
    const confirm = await page.locator("[data-action=end-confirm]").count();
    // Unvisited optional opportunities must not trigger the unfinished-steps warning.
    if (process.env.LEAVE_OPTIONAL) assert.equal(confirm, 0);
    if (confirm) await click("end-confirm");
    await click("continue");
    if (round === 3) {
      await shot("sales-income");
      await click("sales-start");
    }
  }
  await shot("final");
  const final = await state();
  assert.equal(final.active.phase, "finished");
  assert.equal(
    final.active.decisions.length,
    process.env.LEAVE_OPTIONAL ? 19 : 22,
  );
  assert.equal(final.active.team.second, "Nisa");
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${out}/state.json`, JSON.stringify(final, null, 2));
  fs.writeFileSync(
    `${out}/report.json`,
    JSON.stringify(
      {
        errors,
        decisions: final.active.decisions.length,
        viewports: [1366, 1536, 1920],
        expectedScore: 1783,
      },
      null,
      2,
    ),
  );
  console.log("FULL FLOW PASSED");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
