const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "no-preference",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const click = async (a) => {
    if (await page.locator("#learning-dialog[open]").count()) {
      await page.locator('[data-action="lesson-ack"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector("#stage").getAttribute("aria-busy") !== "true",
      );
    }

    const scope = (await page
      .locator(`#dialog[open] [data-action="${a}"]`)
      .count())
      ? page.locator("#dialog")
      : page;
    await scope.locator(`[data-action="${a}"]`).first().click();
    await page.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
    if (a.startsWith("product:")) {
      await page.locator(`[data-action="inspect:${a.split(":")[1]}"]`).click();
      await page.waitForFunction(
        () =>
          document.querySelector("#stage").getAttribute("aria-busy") !== "true",
      );
    }
    if (
      a.startsWith("buy:") &&
      (await page
        .locator(`[data-action="buy-confirm:${a.split(":")[1]}"]`)
        .count())
    ) {
      await page
        .locator(`[data-action="buy-confirm:${a.split(":")[1]}"]`)
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector("#stage").getAttribute("aria-busy") !== "true",
      );
    }
    if (a === "install-selected" || a.startsWith("free:"))
      await page.locator("#learning-dialog[open]").waitFor();
  };
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:5174");
  await click("new");
  await page.locator("#organization").fill("Animasyon Denemesi");
  await page.locator("#first").fill("Test");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await click("tutorial-done");
  await click("market");
  await click("product:tap-a");
  await click("buy:tap-a");
  await click("take:kitchen");
  await click("select:tap-a");
  await page.evaluate(() => {
    window.counterSamples = [];
    window.sampling = true;
    const sample = () => {
      window.counterSamples.push(
        document.querySelector("#bill-value")?.textContent,
      );
      if (window.sampling) requestAnimationFrame(sample);
    };
    sample();
  });
  await click("install-selected");
  await page.waitForFunction(
    () => document.querySelector("#bill-value").textContent === "₺9.820",
  );
  const samples = await page.evaluate(() => {
    window.sampling = false;
    return [...new Set(window.counterSamples)];
  });
  assert(samples.length > 2);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "qa/25-motion.png" });
  fs.writeFileSync(
    "qa/motion.json",
    JSON.stringify({ passed: true, errors, counterSamples: samples }, null, 2),
  );
  console.log(
    "PASS: default motion, snap particles, real intermediate bill counter values",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
