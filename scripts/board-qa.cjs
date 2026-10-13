// Shared leaderboard in the browser: tabs, many players, admin login and deletes.
// Run against `npm run dev:cf` (wrangler pages dev with D1 and ADMIN_TOKEN).
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.API_URL || "http://127.0.0.1:8788";
// These checks wipe every stored result: never run them against a live site.
if (!new URL(base).hostname.match(/^(127.0.0.1|localhost)$/))
  throw Error("Refusing to wipe results on a non-local server: " + base);
const token = process.env.ADMIN_TOKEN || "secret123";
const auth = { Authorization: `Bearer ${encodeURIComponent(token)}` };
const post = (g) =>
  fetch(`${base}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(g),
  });
const row = (i, over = {}) => ({
  id: `qa-board-${String(i).padStart(4, "0")}`,
  name: `Oyuncu ${i}`,
  mode: "official",
  score: 1000 + i,
  bill: 5000,
  budget: 1000,
  savingPercent: 50,
  rulesVersion: 1,
  completedAt: new Date().toISOString(),
  ...over,
});
(async () => {
  await fetch(`${base}/api/results?mode=all`, {
    method: "DELETE",
    headers: auth,
  });
  // 40 timed players, 20 free-play players and a room game that must not show on the board.
  for (let i = 0; i < 40; i++) await post(row(i));
  for (let i = 0; i < 20; i++)
    await post(row(100 + i, { mode: "practice", score: 300 + i }));
  await post(row(300, { mode: "room", room: "ABCDE", score: 1799 }));

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await (
    await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: "reduce",
    })
  ).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const busy = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#stage")?.getAttribute("aria-busy") !== "true",
    );
  const click = async (a) => {
    await page.locator(`[data-action="${a}"]`).first().click();
    await busy();
  };

  await page.goto(base);
  await click("leaderboard");
  await page.locator(".podium").waitFor();
  const tab = (id) => page.locator(`[data-action="board:${id}"]`).innerText();
  assert.equal((await tab("official")).trim(), "Süreli (40)");
  assert.equal((await tab("practice")).trim(), "Serbest (20)");
  assert.equal(
    await page.locator(".ranks li").count(),
    40 - 3,
    "every player beyond the podium is listed",
  );
  const podium = await page.locator(".podium").innerText();
  assert(podium.includes("Oyuncu 39"), "best player first: " + podium);
  assert(!podium.includes("1.799"), "room games stay out of the global board");
  assert(
    !/kooperatif/i.test(await page.locator(".leaderboard").innerText()),
    "no cooperative wording",
  );
  await click("board:practice");
  assert.equal(await page.locator(".ranks li").count(), 20 - 3);
  await page.screenshot({ path: "qa/main-revision/board-practice.png" });

  // Admin: delete buttons only after the token is accepted.
  await page.goto(`${base}/#admin`);
  await page.locator(".admin-remote").waitFor();
  assert.equal(await page.locator('[data-action^="rdelete:"]').count(), 0);
  await click("admin-reveal");
  assert.equal(await page.locator("#admin-token").getAttribute("type"), "text");
  await click("admin-reveal");
  await page.locator("#admin-token").fill("wrong");
  await click("admin-login");
  assert.equal(
    await page.locator('[data-action^="rdelete:"]').count(),
    0,
    "wrong token must not unlock deletes",
  );
  await page.locator("#admin-token").fill(token);
  await click("admin-login");
  await page.locator('[data-action^="rdelete:"]').first().waitFor();
  const total = async () =>
    (await (await fetch(`${base}/api/results`)).json()).results.length;
  assert.equal(await total(), 61);
  await page.locator('[data-action^="rdelete:"]').first().click();
  await click(
    `rdelete-confirm:${(await page.locator('[data-action^="rdelete-confirm:"]').getAttribute("data-action")).split(":")[1]}`,
  );
  await page.waitForFunction(() =>
    document.querySelector(".admin-remote h3")?.textContent.includes("60"),
  );
  assert.equal(await total(), 60);
  await click("rbulk:practice");
  await click("rbulk-confirm:practice");
  await page.waitForFunction(
    () =>
      !document.querySelector(".admin-remote h3")?.textContent.includes("60"),
  );
  assert(
    (await (await fetch(`${base}/api/results`)).json()).results.every(
      (r) => r.mode !== "practice",
    ),
  );
  // CSV with players only.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    click("csv-remote"),
  ]);
  const csv = require("node:fs").readFileSync(await download.path(), "utf8");
  assert(
    csv.includes("Oyuncu") && !csv.includes("Kooperatif"),
    "players only in the CSV",
  );

  // A result stuck in this device's outbox is sent on the next load.
  const stuck = row(900, { name: "Bekleyen", mode: "practice" });
  await page.evaluate(
    (r) => localStorage.setItem("yesil-donusum-outbox", JSON.stringify([r])),
    stuck,
  );
  await page.reload();
  await page.waitForFunction(
    async (id) =>
      (await (await fetch("./api/results")).json()).results.some(
        (r) => r.id === id,
      ),
    stuck.id,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("yesil-donusum-outbox")),
    "[]",
  );
  // The token survives a reload of the tab.
  await page.locator('[data-action="rbulk:all"]').waitFor();
  assert.deepEqual(
    errors.filter((e) => !e.includes("401")),
    [],
  );
  await fetch(`${base}/api/results?mode=all`, {
    method: "DELETE",
    headers: auth,
  });
  await browser.close();
  console.log("BOARD QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
