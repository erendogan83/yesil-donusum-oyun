// Timed (official) play: a minute per room (shortened here with ?qa&limit=N), then 5 TL per
// second until the room is done; finishing early pays 5 TL per second left; the clock pauses
// outside rooms; a practice game has no clock; a player who can no longer afford a required
// purchase can skip it.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.GAME_URL || "http://127.0.0.1:4180";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const busy = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#stage")?.getAttribute("aria-busy") !== "true",
    );
  const click = async (a) => {
    await page.locator(`[data-action="${a}"]:visible`).first().click();
    await busy();
  };
  const state = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem("yesil-donusum-v1")).active,
    );
  const clockText = () => page.locator("#clock-value").innerText();
  const shownBudget = async () =>
    Number(
      (await page.locator("#budget-value").innerText()).replace(/[^\d]/g, ""),
    );
  const url = (limit) => `${base}/?qa&limit=${limit}`;
  const begin = async (mode) => {
    await click("new");
    await page.locator("#first").fill("Süreli");
    await page.locator(`[value="${mode}"]`).check();
    await page.locator('[type="submit"]').click();
    await click("tutorial-done");
  };

  // ---- a practice game is not timed
  await page.goto(url(8));
  await begin("practice");
  assert.equal(
    await page.locator("#clock-meter").count(),
    0,
    "practice has no clock",
  );

  // ---- an official game is
  await page.goto(url(8));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await begin("official");
  assert.equal((await state()).team.mode, "official");
  assert.match(await clockText(), /8 sn/, "the limit is announced on the map");
  await click("room:kitchen");
  await page.waitForFunction(() =>
    /^0:\d\d$/.test(document.querySelector("#clock-value")?.textContent ?? ""),
  );
  const first = await clockText();
  assert(
    Number(first.slice(2)) <= 8 && Number(first.slice(2)) >= 5,
    "counting down from 8: " + first,
  );
  await page.waitForTimeout(1500);
  assert(
    Number((await clockText()).slice(2)) <= Number(first.slice(2)) - 1,
    "the countdown moves",
  );

  // After the limit the room is overdue: money drains.
  await page.waitForFunction(
    () =>
      document.querySelector("#clock-meter")?.classList.contains("overtime"),
    null,
    {
      timeout: 20000,
    },
  );
  const overtimeBudget = await shownBudget();
  await page.waitForTimeout(4000);
  const later = await shownBudget();
  assert(
    overtimeBudget - later >= 15,
    `about 5 TL per second: ${overtimeBudget} -> ${later}`,
  );
  assert.match(await clockText(), /^\+\d+ sn/);
  const saved = await state();
  assert(
    saved.budget < 10000 && saved.timePenalty > 0,
    "the penalty is saved, not only shown",
  );
  assert(saved.budget >= 0);

  // Leaving the room pauses the clock: no further cost on the map.
  await click("map");
  await page.waitForTimeout(1200);
  const atMap = (await state()).budget;
  await page.waitForTimeout(3500);
  assert.equal((await state()).budget, atMap, "no cost while outside a room");
  assert.match(await clockText(), /8 sn/);

  // ---- cannot afford a required purchase: it can be skipped
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("yesil-donusum-v1"));
    db.active.budget = 10;
    db.revision += 1;
    localStorage.setItem("yesil-donusum-v1", JSON.stringify(db));
  });
  await page.reload();
  await click("resume");
  await click("room:kitchen");
  await click("solve:kitchen:rev-tap");
  await page.locator('[data-action="skip-budget:tap"]').waitFor();
  await click("skip-budget:tap");
  const after = await state();
  assert.equal(after.decisions.at(-1).choiceId, "skip-budget");
  assert.equal(after.decisions.at(-1).opportunityId, "tap");
  await page.locator('[data-action="solve:kitchen:rev-waste-sort"]').waitFor();

  // ---- finishing a room early pays 5 TL for every second left
  await page.goto(url(120));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await begin("official");
  await click("room:kitchen");
  await click("solve:kitchen:rev-tap");
  await click("product:rev-tap-repair");
  await click("inspect:rev-tap-repair");
  await click("buy:rev-tap-repair");
  await click("place-ready");
  await click("lesson-ack");
  await click("solve:kitchen:rev-waste-sort");
  for (const [i, tg] of [
    ["organic", "organic"],
    ["metal", "metal"],
    ["paper", "paper"],
    ["tissue", "other"],
    ["glass", "glass"],
    ["plastic", "plastic"],
  ]) {
    await click(`sort-select:${i}`);
    await click(`sort-target:${tg}`);
  }
  await click("lesson-ack");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("yesil-donusum-v1")).active.timeBonus > 0,
    null,
    { timeout: 10000 },
  );
  const early = await state();
  assert(
    early.timeBonus >= 5 * 90 && early.timeBonus <= 5 * 120,
    "a quick room earns a big bonus: " + early.timeBonus,
  );
  assert.equal(early.timeBonus % 5, 0, "5 TL per whole second");
  assert(!early.timePenalty, "no overtime was charged");
  await page.waitForFunction(() =>
    /Erken bitirdin/.test(document.querySelector("#status")?.textContent ?? ""),
  );
  // Going back and forth does not pay a second time.
  await click("continue-room");
  await page.waitForTimeout(1500);
  assert.equal((await state()).timeBonus, early.timeBonus);

  assert.deepEqual(errors, []);
  await browser.close();
  console.log("TIMED QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
