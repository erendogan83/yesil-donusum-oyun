// Shared leaderboard in the browser: tabs, more than 26 teams, admin login and deletes.
// Run against `wrangler pages dev dist --d1=DB --binding ADMIN_TOKEN=secret123 --port 8788`.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.API_URL || "http://127.0.0.1:8788";
// These checks wipe every stored result: never run them against a live site.
if (!new URL(base).hostname.match(/^(127.0.0.1|localhost)$/))
  throw Error("Refusing to wipe results on a non-local server: " + base);

const token = process.env.ADMIN_TOKEN || "secret123";
const orgs = require("../public/organizations.json");
const auth = { Authorization: `Bearer ${encodeURIComponent(token)}` };
const post = (r) =>
  fetch(`${base}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(r),
  });
const row = (i, over = {}) => ({
  id: `qa-board-${String(i).padStart(4, "0")}`,
  organization: orgs[i % orgs.length],
  first: `Ayşe ${i}`,
  second: `Nisa ${i}`,
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
  // 26 official teams plus 34 free-play teams = 60 results (120 players would be 60 teams).
  for (let i = 0; i < orgs.length; i++) await post(row(i));
  // A second player of the first cooperative: totals must be added up (1000 + 50).
  await post(row(200, { organization: orgs[0], score: 50, second: "" }));
  for (let i = 0; i < 34; i++)
    await post(
      row(100 + i, {
        organization: `Serbest ${i}`,
        mode: "practice",
        score: 300 + i,
      }),
    );

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
  assert.equal((await tab("official")).trim(), `Resmî (${orgs.length})`);
  assert.equal((await tab("practice")).trim(), "Serbest (34)");
  const officialRows = await page.locator(".ranks li").count();
  assert.equal(
    officialRows,
    orgs.length - 3,
    "every official team beyond the podium is listed",
  );
  const podium = await page.locator(".podium").innerText();
  assert(
    podium.includes(orgs[0]),
    "cooperative name is shown, ranked first by its total",
  );
  assert(podium.includes("2 oyun"), podium);
  assert(
    podium.includes("1.050"),
    "scores of one cooperative are added up: " + podium,
  );
  await click("board:practice");
  assert.equal(await page.locator(".ranks li").count(), 34 - 3);
  await page.screenshot({ path: "qa/main-revision/board-practice.png" });

  // Admin: delete buttons only after the token is accepted.
  await page.goto(`${base}/#admin`);
  await page.locator(".admin-remote").waitFor();
  assert.equal(await page.locator('[data-action^="rdelete:"]').count(), 0);
  // The field can be revealed so a pasted key can be checked.
  await click("admin-reveal");
  assert.equal(await page.locator("#admin-token").getAttribute("type"), "text");
  await click("admin-reveal");
  assert.equal(
    await page.locator("#admin-token").getAttribute("type"),
    "password",
  );
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
  await page.screenshot({ path: "qa/main-revision/board-admin.png" });
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
  await page.waitForFunction(() =>
    document.querySelector(".admin-remote h3")?.textContent.includes("kayıt"),
  );
  const left = (await (await fetch(`${base}/api/results`)).json()).results;
  assert(
    left.every((r) => r.mode === "official"),
    "practice results removed",
  );

  // A result stuck in this device's outbox (finished while offline) is sent on the next load.
  const stuck = row(900, { organization: "Bekleyen Ekip", mode: "practice" });
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
  // The token survives a reload of the tab but never reaches other tabs/sessions.
  await page.reload();
  await page.locator('[data-action="rbulk:all"]').waitFor();
  // The deliberate wrong-token attempt logs one 401 in the browser console.
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
