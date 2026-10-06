const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.GAME_URL || "http://127.0.0.1:4173";
const out = path.resolve("qa");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage(),
    errors = [];
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
  await page.goto(base);
  await page
    .getByRole("button", { name: "OYUNA BAŞLA", exact: true })
    .waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", r, {
          once: true,
        }),
      );
  });
  await click("new");
  await page.locator("#organization").fill("Çevrimdışı Deneme");
  await page.locator("#first").fill("Test Oyuncusu");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await click("tutorial-done");
  await context.setOffline(true);
  await page.reload();
  await click("resume");
  await click("market");
  await click("product:tap-a");
  await click("buy:tap-a");
  await click("take:kitchen");
  await click("select:tap-a");
  await click("install-selected");
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("yesil-donusum-v1")),
  );
  assert.equal(s.active.bill, 9820);
  await page.reload();
  await click("resume");
  await page.locator("#learning-dialog[open]").waitFor();
  assert((await page.locator("#lesson-title").innerText()).includes("Küçücük"));
  await page.locator('[data-action="lesson-ack"]').click();
  await page.waitForFunction(
    () => document.querySelector("#stage").getAttribute("aria-busy") !== "true",
  );
  await click("memory");
  await click("lesson:tap-a");
  assert(await page.locator("#learning-dialog").isVisible());
  assert.equal(s.active.budget, 2350);
  await page.screenshot({ path: path.join(out, "23-offline.png") });
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(out, "offline.json"),
    JSON.stringify(
      {
        passed: true,
        errors,
        bill: s.active.bill,
        network: "offline",
        cachedFiles: await page.evaluate(async () => {
          const keys = await caches.keys();
          return (await (await caches.open(keys[0])).keys()).length;
        }),
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: production preload → offline reload → resume → market → purchase → install → save",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
