// "Oyunu bitir ve kaydet", result status on the final screen, retry after being offline,
// and the second basin option (Kova). Run against wrangler pages dev (see test:api).
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.API_URL || "http://127.0.0.1:8788";
if (!new URL(base).hostname.match(/^(127.0.0.1|localhost)$/))
  throw Error("Refusing to wipe results on a non-local server: " + base);
const token = process.env.ADMIN_TOKEN || "secret123";
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
    await page.locator(`[data-action="${a}"]`).first().click();
    await busy();
  };
  // The map footer has the same button; inside the help dialog use the dialog's own.
  const dialogClick = async (a) => {
    await page.locator(`#dialog [data-action="${a}"]`).click();
    await busy();
  };
  const api = (path) =>
    page.evaluate(async (p) => (await fetch(p)).json(), path);
  const status = () => page.locator(".submit-status").innerText();
  const start = async (org, second = "Nisa") => {
    await click("new");
    await page.locator("#organization").fill(org);
    await page.locator("#first").fill("Ayşe");
    if (second) await page.locator("#second").fill(second);
    await page.locator('[type="submit"]').click();
    await click("tutorial-done");
  };

  // Start from an empty local board.
  await fetch(`${base}/api/results?mode=all`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${encodeURIComponent(token)}` },
  });
  await page.goto(base);
  await start("Bitir QA 1");
  // The basin now offers two vessels.
  await click("room:bathroom");
  await click("solve:bathroom:rev-shower");
  await click("product:rev-shower-classic");
  await click("inspect:rev-shower-classic");
  await click("buy:rev-shower-classic");
  await click("place-ready");
  await click("lesson-ack");
  await click("solve:bathroom:rev-basin");
  assert.equal(await page.locator(".market-product").count(), 2);
  await click("product:rev-basin-bucket");
  await click("inspect:rev-basin-bucket");
  await click("buy:rev-basin-bucket");
  await click("place-ready");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "qa/main-revision/bucket-placed.png" });
  await click("lesson-ack");

  // Finish now: confirm, save, status line.
  await click("help");
  await dialogClick("finish-now");
  assert((await page.locator("#dialog").innerText()).includes("geri alınamaz"));
  await click("finish-now-confirm");
  await page.locator(".final-result").waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".submit-status")?.textContent.includes("✓"),
  );
  assert((await status()).includes("Serbest"), await status());
  let rows = (await api("/api/results")).results.filter(
    (r) => r.organization === "Bitir QA 1",
  );
  assert.equal(rows.length, 1);
  assert(rows[0].score > 0, "decisions made so far count");
  assert.equal(rows[0].mode, "practice");

  // Offline finish: the result waits, then the retry button sends it.
  await page.goto(base);
  // A single player: the second name is optional.
  await start("Bitir QA 2", "");
  await context.setOffline(true);
  await click("help");
  await dialogClick("finish-now");
  await click("finish-now-confirm");
  await page.locator(".final-result").waitFor();
  await page.waitForFunction(() =>
    /bekliyor|ulaşılamadı/.test(
      document.querySelector(".submit-status")?.textContent ?? "",
    ),
  );
  await context.setOffline(false);
  await click("resubmit");
  await page.waitForFunction(() =>
    document.querySelector(".submit-status")?.textContent.includes("✓"),
  );
  rows = (await api("/api/results")).results.filter(
    (r) => r.organization === "Bitir QA 2",
  );
  assert.equal(rows.length, 1);
  assert.equal(
    rows[0].second,
    "",
    "solo player is stored without a second name",
  );
  assert.deepEqual(
    errors.filter((e) => !/Failed to fetch|net::/.test(e)),
    [],
  );
  await browser.close();
  console.log("FINISH QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
