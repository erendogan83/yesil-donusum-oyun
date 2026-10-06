// Sorting and wrong-choice regression checks: hover stability, drag and drop,
// wrong-bag penalty, and a leak that keeps running after a wrong tap choice.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.GAME_URL || "http://127.0.0.1:4173";
const out = "qa/main-revision";
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
  const box = (sel) => page.locator(sel).first().boundingBox();
  await page.goto(base + "/?qa");
  await click("new");
  await page.locator("#organization").fill("QA Kooperatifi");
  await page.locator("#first").fill("Ayşe");
  await page.locator("#second").fill("Nisa");
  await page.locator('[type="submit"]').click();
  await click("tutorial-done");
  await click("room:kitchen");

  // Wrong tap choice: the drip must keep running (no particles needs the
  // scene, so check the unresolved state through the saved decision).
  await click("solve:kitchen:rev-tap");
  await click("product:rev-tap-aerator");
  await click("inspect:rev-tap-aerator");
  await click("buy:rev-tap-aerator");
  await click("place-ready");
  await click("lesson-ack");
  const s0 = (await state()).active;
  assert.equal(s0.decisions[0].choiceId, "rev-tap-aerator");
  const dripping = await page.evaluate(() => {
    const scene = window.__world;
    return scene
      ? scene.children.list.some(
          (c) =>
            c.type === "ParticleEmitter" ||
            (c.type === "Ellipse" && c.fillColor === 0x74ccdf),
        )
      : null;
  });
  console.log("drip emitter present after wrong choice:", dripping);
  assert.notEqual(dripping, false, "drip disappeared after a wrong choice");

  await click("solve:kitchen:rev-waste-sort");
  const budget0 = (await state()).active.budget;
  // 1. Hover must not move a piece.
  const piece = '[data-item="tissue"]';
  const before = await box(piece);
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.waitForTimeout(300);
  const hovered = await box(piece);
  assert(
    Math.abs(hovered.x - before.x) < 1.5,
    `piece moved on hover: ${before.x} -> ${hovered.x}`,
  );
  await page.screenshot({ path: `${out}/sort-hover.png` });

  // 2. Drag a wrong item onto a wrong bag: allowed, costs money, stays unplaced.
  const drag = async (item, target) => {
    const a = await box(`[data-item="${item}"]`);
    const b = await box(`[data-target="${target}"]`);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 20, {
      steps: 4,
    });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    const ghost = await box(".drag-ghost");
    const cx = b.x + b.width / 2,
      cy = b.y + b.height / 2;
    assert(
      Math.abs(ghost.x + ghost.width / 2 - cx) < 12 &&
        Math.abs(ghost.y + ghost.height / 2 - cy) < 12,
      `ghost is away from the cursor: ${ghost.x + ghost.width / 2},${ghost.y + ghost.height / 2} vs ${cx},${cy}`,
    );
    await page.screenshot({ path: `${out}/sort-dragging.png` });
    await page.mouse.up();
    await busy();
    await page.waitForTimeout(200);
  };
  await drag("tissue", "paper");
  let s = (await state()).active;
  assert.equal(s.sorting["waste-sort"].placed.length, 0);
  assert.equal(s.sorting["waste-sort"].firstAnswers.tissue, "paper");
  assert.equal(s.budget, budget0 - 50, "wrong bag must cost money");
  assert(await page.locator(".sort-feedback.bad").isVisible());
  await page.screenshot({ path: `${out}/sort-wrong.png` });
  // Retrying the same item wrongly does not charge again.
  await drag("tissue", "glass");
  assert.equal((await state()).active.budget, budget0 - 50);
  // 3. Correct drop places it.
  await drag("tissue", "other");
  s = (await state()).active;
  assert.deepEqual(s.sorting["waste-sort"].placed, ["tissue"]);
  assert.equal(s.budget, budget0 - 50);
  // 4. Tap select + tap target still works.
  await click("sort-select:organic");
  await click("sort-target:organic");
  assert.equal((await state()).active.sorting["waste-sort"].placed.length, 2);
  await page.screenshot({ path: `${out}/sort-progress.png` });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log("SORTING QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
