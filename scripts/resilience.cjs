const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const base = process.env.GAME_URL || "http://127.0.0.1:5174";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const click = async (p, a) => {
    await p.locator(`[data-action="${a}"]`).first().click();
    await p.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
    if (a.startsWith("product:")) {
      await p.locator(`[data-action="inspect:${a.split(":")[1]}"]`).click();
      await p.waitForFunction(
        () =>
          document.querySelector("#stage").getAttribute("aria-busy") !== "true",
      );
    }
  };
  await page.goto(base);
  await click(page, "new");
  await page.locator("#organization").fill("Dayanıklılık Testi");
  await page.locator("#first").fill("Deneme");
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await page
    .getByText("Kayıt için yer açılamadı. Son işlem uygulanmadı.", {
      exact: true,
    })
    .waitFor();
  assert.equal(await page.locator("#first").inputValue(), "Deneme");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("yesil-donusum-v1")),
    null,
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await click(page, "tutorial-done");
  const peer = await context.newPage();
  await peer.goto(base);
  await click(peer, "resume");
  await click(page, "market");
  await click(page, "product:tap-a");
  await click(page, "buy:tap-a");
  await peer.waitForFunction(
    () => document.querySelector("#budget-value")?.textContent === "₺2.350",
  );
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("yesil-donusum-v1")),
  );
  assert.equal(
    snapshot.active.inventory.filter((id) => id === "tap-a").length,
    1,
  );
  await peer.close();
  await page.evaluate(() =>
    localStorage.setItem("yesil-donusum-v1", "{broken"),
  );
  await page.reload();
  await page
    .getByText(
      "Kayıt okunamadı. Mevcut veri korunuyor. Yönetim ekranından yedekleyip kaydı kurtarın.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("yesil-donusum-v1")),
    "{broken",
  );
  await page.goto(base + "/#admin");
  await page.getByRole("heading", { name: "Etkinlik yönetimi" }).waitFor();
  await page.locator("#restore-file").setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });
  await click(page, "restore-confirm");
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("yesil-donusum-v1")).active.budget,
    ),
    2350,
  );
  fs.writeFileSync(
    "qa/resilience.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "quota rollback",
          "form values preserved",
          "multi-tab update",
          "purchase once",
          "corrupt save preserved",
          "corrupt save recovery",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: quota rollback, multi-tab sync, corrupt save preservation and recovery",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
