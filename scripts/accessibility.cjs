const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const assert = require("node:assert/strict");
const base = process.env.GAME_URL || "http://127.0.0.1:5174";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    page = await context.newPage();
  const checks = [];
  const audit = async (name) => {
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    checks.push({
      name,
      violations: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          summary: n.failureSummary,
        })),
      })),
    });
  };
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
  await page.goto(base);
  await page
    .getByRole("button", { name: "OYUNA BAŞLA", exact: true })
    .waitFor();
  await audit("start");
  await click("new");
  await audit("registration");
  await page.locator("#organization").fill("Erişilebilirlik Denemesi");
  await page.locator("#first").fill("Test");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await page.locator("#dialog[open]").waitFor();
  await audit("tutorial");
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  assert(
    await page.evaluate(() =>
      document.querySelector("#dialog").contains(document.activeElement),
    ),
  );
  await click("tutorial-done");
  await audit("kitchen");
  await click("help");
  await page.keyboard.press("Escape");
  assert(!(await page.locator("#dialog").isVisible()));
  await click("market");
  await audit("market");
  await click("product:tap-a");
  await audit("product");
  await click("buy:tap-a");
  await click("take:kitchen");
  await click("select:tap-a");
  await click("install-selected");
  await audit("learning-card");
  for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
  assert(
    await page.evaluate(() =>
      document
        .querySelector("#learning-dialog")
        .contains(document.activeElement),
    ),
  );
  await click("memory");
  await audit("memory");
  await click("close");
  await click("market");
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: "qa/24-tablet-market.png" });
  await audit("tablet");
  // A new overflow container inherits the global scrollbar baseline.
  const scrollbar = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollbarColor,
  );
  assert.notEqual(scrollbar, "auto");
  fs.writeFileSync(
    "qa/accessibility.json",
    JSON.stringify({ checks, scrollbar }, null, 2),
  );
  const violations = checks.flatMap((c) =>
    c.violations.map((v) => ({ screen: c.name, ...v })),
  );
  console.log(JSON.stringify(violations, null, 2));
  assert.equal(violations.length, 0);
  console.log(
    "PASS: accessibility scan, keyboard modal trap/Escape, tablet, global scrollbar",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
