// Room end vs period end: leaving a finished room never warns about other rooms,
// and the period warning lists exactly the rooms with required steps left.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.GAME_URL || "http://127.0.0.1:4173";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await (
    await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: "reduce",
    })
  ).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const busy = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#stage")?.getAttribute("aria-busy") !== "true",
    );
  const click = async (a) => {
    await page.locator(`[data-action="${a}"]`).first().click();
    await busy();
  };
  const has = (a) => page.locator(`[data-action="${a}"]`).count();
  await page.goto(base);
  await click("new");
  await page.locator("#organization").fill("QA");
  await page.locator("#first").fill("A");
  await page.locator("#second").fill("B");
  await page.locator('[type="submit"]').click();
  await click("tutorial-done");
  await click("room:kitchen");
  // Kitchen still has work: no end button, only a way back to the map.
  assert.equal(await has("end"), 0);
  assert.equal(await has("map"), 1);
  await click("solve:kitchen:rev-tap");
  await click("product:rev-tap-repair");
  await click("inspect:rev-tap-repair");
  await click("buy:rev-tap-repair");
  await click("place-ready");
  await click("lesson-ack");
  await click("solve:kitchen:rev-waste-sort");
  for (const [i, t] of [
    ["organic", "organic"],
    ["metal", "metal"],
    ["paper", "paper"],
    ["tissue", "other"],
    ["glass", "glass"],
    ["plastic", "plastic"],
  ]) {
    await click(`sort-select:${i}`);
    await click(`sort-target:${t}`);
  }
  await click("lesson-ack");
  // Kitchen done: the primary button finishes the room, no dialog, no period end.
  assert.equal(
    (await page.locator('[data-action="continue-room"]').innerText()).trim(),
    "BÖLÜMÜ BİTİR",
  );
  assert.equal(await has("end"), 0);
  await click("continue-room");
  assert.equal(await page.locator("#dialog").evaluate((d) => d.open), false);
  // Map: other rooms still need work, so the period end asks and names exactly them.
  await click("end");
  const text = await page.locator("#dialog").innerText();
  assert(text.includes("1. dönemi bitirelim mi?"), text);
  assert(text.includes("Banyo") && text.includes("Oturma odası"), text);
  assert(
    !text.includes("Mutfak"),
    "finished kitchen must not be listed: " + text,
  );
  await click("close");
  assert.deepEqual(errors, []);
  await browser.close();
  console.log("SECTION QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
