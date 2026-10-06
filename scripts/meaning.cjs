const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const AxeBuilder = require("@axe-core/playwright").default;
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:5174";
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("yesil-donusum-v1")));
  const click = async (a) => {
    await page.locator(`[data-action="${a}"]`).first().click();
    await page.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
  };
  const shot = async (name) => {
    await page.waitForTimeout(1700);
    await page.screenshot({ path: `qa/meaning-${name}.png` });
    if (
      [
        "context-market-1366",
        "goals-1366",
        "summary-1366",
        "final-1366",
        "pledges-1366",
        "keepsake-1366",
      ].includes(name)
    ) {
      const a = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      if (a.violations.length)
        console.log(
          name,
          JSON.stringify(
            a.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.failureSummary),
            })),
          ),
        );
      assert.equal(a.violations.length, 0, name);
    }
  };
  const ack = async () => {
    await page.locator("#learning-dialog[open]").waitFor();
    await click("lesson-ack");
  };
  const buy = async (id, room) => {
    await click("product:" + id);
    await click("inspect:" + id);
    await click("buy:" + id);
    if (await page.locator(`[data-action="buy-confirm:${id}"]`).count())
      await click("buy-confirm:" + id);
    await click("take:" + room);
    await click("select:" + id);
    await click("install-selected");
  };
  const problem = async (room, zone) => {
    if (await page.locator("[data-action=map]").count()) await click("map");
    await click("room:" + room);
    await click("zone:" + zone);
    await click(`solve:${room}:${zone}`);
  };
  const end = async () => {
    await click("end");
    await click("end-confirm");
    await click("continue");
  };
  await page.goto(base);
  await click("new");
  await page.waitForFunction(
    () => document.querySelectorAll("#organizations option").length === 26,
  );
  await page
    .locator("#organization")
    .fill("Kahta Kadın Girişimi Üretim ve İşletme Kooperatifi");
  await page.locator("#first").fill("Ayşe");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  assert.match(await page.locator("#form-error").innerText(), /iki katılımcı/);
  await page.locator("#second").fill("Fatma");
  await page.getByRole("button", { name: "BİRLİKTE BAŞLAYALIM →" }).click();
  await page.locator(".intro-dialog[open]").waitFor();
  await page.waitForTimeout(8000);
  await shot("intro-1366");
  await click("tutorial-done");
  assert.equal(await page.locator("#score-value").count(), 0);
  assert.match(await page.locator(".mini-goals").innerText(), /0 \/ 3/);
  await click("end");
  assert.match(await page.locator("#dialog").innerText(), /hâlâ 3 fırsat/);
  await click("close");
  await problem("bathroom", "shower");
  assert.equal(await page.locator(".market-hit").count(), 2);
  assert(await page.locator('[data-action="product:shower-a"]').count());
  assert(await page.locator('[data-action="product:shower-b"]').count());
  await shot("context-market-1366");
  await click("all-market");
  assert((await page.locator(".market-hit").count()) > 2);
  await problem("kitchen", "tap");
  await buy("tap-a", "kitchen");
  await page.locator("#learning-dialog[open]").waitFor();
  await page.waitForTimeout(7100);
  assert(await page.locator("#learning-dialog").isVisible());
  await page.keyboard.press("Escape");
  assert(await page.locator("#learning-dialog").isVisible());
  await click("lesson-ack");
  await click("free:stock");
  await ack();
  await shot("goals-1366");
  assert.match(await page.locator(".mini-goals").innerText(), /3 \/ 3/);
  await problem("kitchen", "tap");
  await buy("repair", "kitchen");
  await page.locator("#combo-celebration.visible").waitFor();
  await shot("combo-1366");
  await ack();
  await click("memory");
  assert.match(await page.locator("#dialog").innerText(), /Fikir Çantam/);
  assert.match(
    await page.locator("#dialog").innerText(),
    /Kaçağı onarmak ve akışı kontrol etmek/,
  );
  await shot("bag-1366");
  await click("close");
  await click("map");
  assert.match(
    await page.locator('[data-action="room:kitchen"]').innerText(),
    /✓/,
  );
  await shot("map-1366");
  await click("end");
  await click("end-confirm");
  await page.waitForTimeout(1200);
  assert.equal((await state()).active.history[0].reward, 440);
  await shot("summary-1366");
  await click("continue");
  await problem("workshop", "power");
  await buy("meter", "workshop");
  await ack();
  await click("free:off");
  await ack();
  assert.match(await page.locator(".mini-goals").innerText(), /3 \/ 3/);
  await shot("workshop-1366");
  await end();
  await problem("garden", "beds");
  await buy("drip", "garden");
  await ack();
  await click("free:dawn");
  await ack();
  await problem("storage", "packing");
  await buy("bags", "storage");
  await ack();
  assert.match(await page.locator(".mini-goals").innerText(), /3 \/ 3/);
  await end();
  await problem("waste", "compost");
  await buy("compost", "waste");
  await ack();
  await click("free:separate");
  await ack();
  await problem("roof", "solar");
  await click("product:solar");
  await click("inspect:solar");
  await click("close");
  await click("room:roof");
  assert.match(await page.locator(".mini-goals").innerText(), /3 \/ 3/);
  await end();
  await page.waitForTimeout(1200);
  await shot("final-1366");
  const before = await state();
  assert.equal(before.results.length, 0);
  await click("pledges");
  assert(await page.locator('[data-action="pledges-save"]').isDisabled());
  await page.locator("input[name=pledge]").nth(0).check();
  await page.locator("input[name=pledge]").nth(1).check();
  assert(await page.locator('[data-action="pledges-save"]').isDisabled());
  await page.locator("input[name=pledge]").nth(2).check();
  assert(await page.locator("input[name=pledge]").nth(3).isDisabled());
  await shot("pledges-1366");
  await click("pledges-save");
  assert.equal((await state()).active.realLifePledges.length, 3);
  assert.equal((await state()).active.bill, before.active.bill);
  assert.equal((await state()).active.budget, before.active.budget);
  await shot("keepsake-1366");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await shot("keepsake-1920");
  await click("final-result");
  await shot("final-1920");
  await page.reload();
  await click("leaderboard");
  await click("final");
  await click("pledges");
  assert.equal(await page.locator("input[name=pledge]:checked").count(), 3);
  await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    let s = m.start(
      {
        organization: "Eski kayıt testi",
        first: "Birinci",
        second: "İkinci",
        mode: "practice",
      },
      [],
      [],
    );
    s = m.install(m.purchase(s, "tap-a"), "tap-a", "kitchen", "tap");
    s.version = 1;
    s.bill /= 10;
    s.budget /= 10;
    s.moves = s.moves.map((m) => ({
      ...m,
      cost: m.cost / 10,
      impact: m.impact / 10,
    }));
    delete s.activeInstallations;
    delete s.replacedInstallations;
    s.team.second = "";
    delete s.journeyVersion;
    delete s.discoveries;
    delete s.considered;
    delete s.lessons;
    s.tutorial = false;
    s.room = "kitchen";
    localStorage.setItem(
      m.STORAGE_KEY,
      JSON.stringify({ ...m.emptyDatabase(), version: 1, active: s }),
    );
  });
  await page.reload();
  await click("resume");
  await page.locator("#legacy-second").fill("Yeni ikinci");
  await click("team-complete");
  assert.equal((await state()).active.bill, 9820);
  assert.equal((await state()).active.budget, 2350);
  assert.equal((await state()).active.team.second, "Yeni ikinci");
  assert.equal((await state()).active.lessons.length, 1);
  await click("memory");
  assert.match(
    await page.locator("#dialog").innerText(),
    /Muslukta küçük dokunuş/,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "qa/meaning.json",
    JSON.stringify(
      {
        passed: true,
        errors,
        checks: [
          "mandatory two names",
          "26 supplied organizations",
          "brief intro",
          "three goals per period",
          "contextual shelf",
          "scene free idea",
          "persistent lesson",
          "combo surprise and memory",
          "incremental capped reward",
          "three pledges score-independent",
          "pledge reload",
          "legacy save/participant completion",
          "1366 and 1920 visuals",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: purpose → discovery → contextual choice → 4 goal sets → combo → idea bag → 3 pledges → legacy migration",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
