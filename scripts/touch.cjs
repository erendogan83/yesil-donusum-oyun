const prepareNavigation = require("./navigation-helper.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const tap = async (a) => {
    await prepareNavigation(page, a);
    await page.locator(`[data-action="${a}"]`).first().tap();
    await page.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
  };
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await tap("new");
  await page.locator("#organization").fill("Tablet Denemesi");
  await page.locator("#first").fill("Test");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).tap();
  await tap("tutorial-done");
  await tap("solve:kitchen:tap");
  await tap("product:tap-a");
  assert(!(await page.locator("#dialog").isVisible()));
  await tap("inspect:tap-a");
  await tap("buy:tap-a");

  await tap("place-ready");
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("yesil-donusum-v1")).active.bill,
    ),
    9820,
  );
  await page.locator("#learning-dialog[open]").waitFor();
  await tap("lesson-ack");
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "qa/26-touch.png" });
  fs.writeFileSync(
    "qa/touch.json",
    JSON.stringify(
      { passed: true, errors, viewport: "1024x768", input: "touch emulation" },
      null,
      2,
    ),
  );
  console.log("PASS: tablet touch purchase and click-to-install");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
