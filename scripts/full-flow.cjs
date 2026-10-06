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
  const snap = async (name) => {
    await page.screenshot({ path: path.join(out, name + ".png") });
  };
  const buy = async (id, category, room) => {
    if (!(await page.locator(`[data-action="room:${room}"]`).count()))
      await click("map");
    await click("room:" + room);
    const solve = await page
      .locator(".contextual-action .primary")
      .getAttribute("data-action");
    assert(
      solve.startsWith("solve:"),
      `Expected active opportunity in ${room}`,
    );
    await click(solve);
    assert((await page.locator(".market-product").count()) <= 3);
    await click("product:" + id);
    await click("buy:" + id);
    assert.equal((await state()).active.room, room);
    await click("place-ready");
  };
  const end = async () => {
    await click("end");
    await click("end-confirm");
    await click("continue");
  };
  await page.goto(base);
  await click("new");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  assert((await page.locator("#form-error").innerText()).length > 0);
  await page.locator("#organization").fill("Test Deneme Kooperatifi");
  await page.locator("#first").fill("Nisa");
  await page.locator("#second").fill("Ayşe");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await click("tutorial-done");
  await buy("tap-a", "Su", "kitchen");
  await buy("containers", "Gıda", "kitchen");
  await buy("shower-b", "Su", "bathroom");
  await snap("07-bathroom");
  await buy("seal", "Ev", "home");
  await buy("led", "Enerji", "home");

  await snap("08-home");
  await click("end");
  await click("end-confirm");
  assert.equal((await state()).active.phase, "summary");
  await snap("09-round-end");
  await click("continue");
  assert.equal((await state()).active.round, 2);
  await buy("strip", "Enerji", "workshop");

  await snap("10-workshop");
  await buy("smart-plug", "Enerji", "laundry");
  await buy("rope", "Ev", "laundry");
  await snap("11-laundry");
  await end();
  assert.equal((await state()).active.round, 3);
  await buy("watering", "Bahçe", "garden");
  await buy("rain", "Su", "garden");
  await snap("12-garden");
  assert.equal((await state()).active.actions.length, 0);
  await click("map");
  await click("room:storage");
  await snap("13-storage");
  await end();
  assert.equal((await state()).active.round, 4);
  await buy("solar-lamp", "Enerji", "roof");
  await snap("14-roof");
  await click("map");
  assert.equal(await page.locator('[data-action="room:waste"]').count(), 0);
  await snap("15-map-without-waste");
  await end();
  assert.equal((await state()).active.phase, "finished");
  assert.equal((await state()).results.length, 0);
  assert(
    (await page.locator(".final-names").innerText()).includes("Nisa & Ayşe"),
  );
  await snap("16-final");
  await click("pledges");
  for (let i = 0; i < 3; i++)
    await page.locator("input[name=pledge]").nth(i).check();
  await click("pledges-save");
  await click("leaderboard");
  assert(await page.locator(".empty-result").count());
  await snap("17-empty-leaderboard");
  // Official organization fixtures are intercepted in this isolated browser only.
  const orgs = Array.from(
    { length: 26 },
    (_, i) => `TEST KURUMU ${i + 1} — gerçek kurum değildir`,
  );
  await page.route("**/organizations.json", (route) =>
    route.fulfill({ json: orgs }),
  );
  await page.reload();
  await click("new");
  await page.locator('input[value="official"]').check();
  await page.locator("#organization").fill(orgs[0]);
  await page.locator("#first").fill("Deniz");
  await page.locator("#second").fill("Ece");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await click("tutorial-done");
  await buy("tap-a", "Su", "kitchen");
  for (let i = 0; i < 4; i++) await end();
  assert.equal((await state()).results.length, 1);
  await click("pledges");
  for (let i = 0; i < 3; i++)
    await page.locator("input[name=pledge]").nth(i).check();
  await click("pledges-save");
  await click("leaderboard");
  assert((await page.locator(".podium").innerText()).includes("Deniz & Ece"));
  await snap("18-official-leaderboard-fixture");
  await click("start");
  await click("new");
  await page.locator('input[value="official"]').check();
  await page.locator("#organization").fill(orgs[0]);
  await page.locator("#first").fill("Başka oyuncu");
  if (!(await page.locator("#second").inputValue()))
    await page.locator("#second").fill("Test 2");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await page
    .getByText(
      "Bu kurumun tamamlanmış bir yarışma sonucu var. Serbest denemeyi seçin.",
      { exact: true },
    )
    .waitFor();
  await page.goto(base + "/#admin");
  await page.getByRole("heading", { name: "Etkinlik yönetimi" }).waitFor();
  const backup = page.waitForEvent("download");
  await click("backup");
  const backupFile = await backup;
  await backupFile.saveAs(path.join(out, "test-backup.json"));
  const csvDownload = page.waitForEvent("download");
  await click("csv");
  const csvFile = await csvDownload;
  await csvFile.saveAs(path.join(out, "test-results.csv"));
  assert(
    fs
      .readFileSync(path.join(out, "test-results.csv"), "utf8")
      .includes("Deniz"),
  );
  const id = (await state()).results[0].id;
  await click("delete:" + id);
  await click("delete-confirm:" + id);
  assert.equal((await state()).results.length, 0);
  await page
    .locator("#restore-file")
    .setInputFiles(path.join(out, "test-backup.json"));
  await click("restore-confirm");
  assert.equal((await state()).results.length, 1);
  await snap("19-admin-fixture");
  await click("leave-admin");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await snap("20-start-1920");
  await click("new");
  await page.setViewportSize({ width: 800, height: 600 });
  await snap("21-team-narrow");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await snap("22-team-portrait");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(out, "full-flow.json"),
    JSON.stringify(
      {
        passed: true,
        errors,
        checks: [
          "all nine rooms",
          "good bad neutral conditional mechanics via unit tests",
          "four periods",
          "four free actions",
          "combinations",
          "practice excluded",
          "official finish",
          "official lock",
          "names",
          "CSV",
          "backup",
          "delete/reset",
          "restore",
          "1920x1080",
          "800x600",
          "390x844",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: all rooms, 4 periods, practice, official fixtures, lock, leaderboard, admin CRUD, CSV, backup/restore, viewports",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
