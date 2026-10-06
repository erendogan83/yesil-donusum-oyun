const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("fs");
const assert = require("node:assert/strict");
const base = process.env.GAME_URL || "http://127.0.0.1:4180";
const out = "qa/main-revision";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
    hasTouch: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const click = async (a) => {
    await page.locator(`[data-action="${a}"]`).first().tap();
    await page.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
  };
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("yesil-donusum-v1")));
  await page.goto(base);
  await page.locator('[data-action="new"]').waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", r, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await click("new");
  await page.locator('[value="official"]').check();
  const orgs = JSON.parse(fs.readFileSync("public/organizations.json", "utf8"));
  assert.equal(orgs.length, 26);
  await page.locator("#organization").fill(orgs[0]);
  await page.locator("#first").fill("QA Deniz");
  await page.locator("#second").fill("QA Ece");
  await page.locator('[type="submit"]').tap();
  await click("tutorial-done");
  await click("room:kitchen");
  await click("solve:kitchen:rev-tap");
  await click("product:rev-tap-aerator");
  await click("inspect:rev-tap-aerator");
  await click("buy:rev-tap-aerator");
  await click("place-ready");
  await page.locator("#learning-dialog[open]").waitFor();
  await page.keyboard.press("Escape");
  assert(await page.locator("#learning-dialog").evaluate((d) => d.open));
  await click("lesson-ack");
  await click("solve:kitchen:rev-waste-sort");
  const violations = (
    await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()
  ).violations;
  fs.writeFileSync(
    `${out}/axe-sorting.json`,
    JSON.stringify(violations, null, 2),
  );
  for (const [width, height] of [
    [844, 390],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    await page.screenshot({ path: `${out}/touch-sort-${width}.png` });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await click("sort-select:tissue");
  await click("sort-target:other");
  assert(
    (await state()).active.sorting["waste-sort"].placed.includes("tissue"),
  );
  await click("close");
  await page.setViewportSize({ width: 1366, height: 768 });
  await click("help");
  await click("map");
  for (let i = 0; i < 4; i++) {
    if (i === 3) await click("sales-start");
    await click("end");
    // The confirmation only appears while steps are still unfinished.
    if (await page.locator("[data-action=end-confirm]").count())
      await click("end-confirm");
    await click("continue");
  }
  assert.equal((await state()).results.length, 1);
  assert.equal((await state()).results[0].score, 20);
  assert.equal((await state()).results[0].team.second, "QA Ece");
  await click("pledges");
  for (let i = 0; i < 3; i++)
    await page.locator('input[name="pledge"]').nth(i).check();
  await click("pledges-save");
  await click("leaderboard");
  assert(
    (await page.locator(".podium").innerText()).includes("QA Deniz & QA Ece"),
  );
  await page.screenshot({ path: `${out}/official-leaderboard.png` });
  await page.goto(base + "/#admin");
  await page.locator('[data-action="backup"]').waitFor();
  let promise = page.waitForEvent("download");
  await click("backup");
  await (await promise).saveAs(`${out}/official-backup.json`);
  promise = page.waitForEvent("download");
  await click("csv");
  await (await promise).saveAs(`${out}/official-results.csv`);
  assert(
    fs
      .readFileSync(`${out}/official-results.csv`, "utf8")
      .includes("Karar puanı v1"),
  );
  const id = (await state()).results[0].id;
  await click("delete:" + id);
  await click("delete-confirm:" + id);
  assert.equal((await state()).results.length, 0);
  await page
    .locator("#restore-file")
    .setInputFiles(`${out}/official-backup.json`);
  await click("restore-confirm");
  assert.equal((await state()).results.length, 1);
  const assetPaths = fs
    .readdirSync("public/assets/sprites/generated")
    .map((f) => "assets/sprites/generated/" + f);
  const loaded = await page.evaluate(
    async (paths) =>
      Promise.all(
        paths.map(async (path) => {
          const r = await fetch(path);
          return r.ok;
        }),
      ),
    assetPaths,
  );
  assert(loaded.every(Boolean));
  assert.deepEqual(errors, []);
  assert.equal(violations.length, 0);
  fs.writeFileSync(
    `${out}/offline-touch-report.json`,
    JSON.stringify(
      {
        passed: true,
        offlineAssets: loaded.length,
        errors,
        axeViolations: violations.length,
        officialResult: true,
        csv: true,
        restore: true,
        touch: [844, 390],
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log("OFFLINE TOUCH OFFICIAL CSV RESTORE AXE PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
