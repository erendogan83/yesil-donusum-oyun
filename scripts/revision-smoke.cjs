const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  page.on("pageerror", (e) => console.log("ERROR", e.message));
  await page.goto("http://127.0.0.1:5175");
  await page.locator('[data-action="new"]').first().click();
  await page.locator("#organization").fill("Test");
  await page.locator("#first").fill("Ayşe");
  await page.locator("#second").fill("Nisa");
  await page.locator('[type="submit"]').first().click();
  await page.locator('[data-action="tutorial-done"]').first().click();
  await page.locator('[data-action="room:kitchen"]').first().click();
  await page.locator('[data-action="solve:kitchen:rev-tap"]').first().click();
  await page.screenshot({ path: "qa/revision-market.png" });
  await page.locator('[data-action="product:rev-tap-repair"]').first().click();
  await page.locator('[data-action="inspect:rev-tap-repair"]').first().click();
  await page.locator('[data-action="buy:rev-tap-repair"]').first().click();
  await page.locator('[data-action="place-ready"]').first().click();
  await page.locator("#learning-dialog[open]").waitFor();
  await page.screenshot({ path: "qa/revision-lesson.png" });
  await page.locator('[data-action="lesson-ack"]').first().click();
  await page
    .locator('[data-action="solve:kitchen:rev-waste-sort"]')
    .first()
    .click();
  await page.screenshot({ path: "qa/revision-sort.png" });
  console.log(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("yesil-donusum-v1")).active,
    ),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
