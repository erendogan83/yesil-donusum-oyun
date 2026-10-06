const prepareNavigation = require("./navigation-helper.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.GAME_URL || "http://127.0.0.1:5174";
const out = path.resolve("qa");
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
  const click = async (a) => {
    if (await page.locator("#learning-dialog[open]").count()) {
      await page.locator('[data-action="lesson-ack"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector("#stage").getAttribute("aria-busy") !== "true",
      );
    }

    await prepareNavigation(page, a);
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
    if (a === "place-ready" || a.startsWith("free:"))
      await page.locator("#learning-dialog[open]").waitFor();
  };
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("yesil-donusum-v1")));
  await page.goto(base);
  await page
    .getByRole("button", { name: "OYUNA BAŞLA", exact: true })
    .waitFor();
  await page.screenshot({ path: path.join(out, "01-start.png") });
  await click("new");
  await page
    .locator("#organization")
    .fill("Birlikte Üreten Kadınlar Kooperatifi");
  await page.locator("#first").fill("Nisa");
  await page.locator("#second").fill("Ayşe");
  await page.screenshot({ path: path.join(out, "02-team.png") });
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await click("tutorial-done");
  assert.equal((await state()).active.bill, 10000);
  assert.equal((await state()).active.budget, 2500);
  await page.screenshot({ path: path.join(out, "04-kitchen-before.png") });
  await click("map");
  await page.screenshot({ path: path.join(out, "03-map.png") });
  await click("room:kitchen");
  await click("solve:kitchen:tap");
  await page.screenshot({ path: path.join(out, "05-market.png") });
  await click("product:tap-a");
  assert(
    !(await page
      .locator("#dialog")
      .innerText()
      .then((t) => t.includes("tasarruf"))),
  );
  await click("buy:tap-a");
  assert.equal((await state()).active.budget, 2350);
  assert.equal((await state()).active.bill, 10000);
  assert.equal((await state()).active.room, "kitchen");

  // Wrong-zone rejection remains covered by the model unit test; placement is now automatic.
  assert.equal((await state()).active.inventory.length, 1);
  assert.equal((await state()).active.budget, 2350);
  await click("place-ready");
  assert.equal((await state()).active.bill, 9820);
  assert.equal((await state()).active.inventory.length, 0);
  await page.screenshot({ path: path.join(out, "06-kitchen-installed.png") });
  await page.reload();
  await click("resume");
  assert.equal((await state()).active.bill, 9820);
  assert.equal((await state()).active.team.first, "Nisa");
  fs.writeFileSync(
    path.join(out, "vertical-slice.json"),
    JSON.stringify(
      { passed: true, errors, bill: (await state()).active.bill },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: start → registration → map → kitchen → market → purchase → automatic placement → refresh",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
