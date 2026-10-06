const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [],
    audits = [];
  for (const width of [1920, 1366, 1024]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1920 ? 1080 : 768 },
      hasTouch: true,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5174");
    await page.locator("[data-action=new]").waitFor();
    await page.evaluate(async () => {
      const m = await import("/src/model.ts");
      let s = m.start(
        {
          organization: "Sade akış QA",
          first: "Ayşe",
          second: "Fatma",
          mode: "practice",
        },
        [],
        [],
      );
      for (let i = 0; i < 3; i++) s = m.continueRound(m.endRound(s));
      s.tutorial = false;
      s.room = "map";
      localStorage.setItem(
        m.STORAGE_KEY,
        JSON.stringify({ ...m.emptyDatabase(), active: s }),
      );
    });
    const click = async (a) => {
      await require("./navigation-helper.cjs")(page, a);
      await page.locator(`[data-action="${a}"]`).first().click();
      await page.waitForFunction(
        () =>
          document.querySelector("#stage").getAttribute("aria-busy") !== "true",
      );
    };
    const snap = async (name) => {
      assert.equal(
        await page.locator(".contextual-action .primary").count(),
        1,
      );
      assert.equal(
        await page
          .locator(
            ".nav-footer [data-action=inventory],.nav-footer [data-action=free],.nav-footer [data-action=memory]",
          )
          .count(),
        0,
      );
      assert((await page.locator(".nav-footer button").count()) <= 2);
      assert.equal(await page.locator(".hud .meter").count(), 2);
      assert((await page.locator(".hud").innerText()).includes("MEVCUT PARA"));
      if (await page.locator(".task-panel").count())
        assert((await page.locator(".active-problem").count()) <= 1);
      await page.screenshot({ path: `qa/ux-${width}-${name}.png` });
      const result = await new AxeBuilder({ page }).analyze();
      audits.push({ width, name, violations: result.violations });
      assert.equal(result.violations.length, 0);
    };
    await page.reload();
    await click("resume");
    assert.equal(await page.locator('[data-action="room:waste"]').count(), 0);
    await snap("overview");
    for (const [room, zone, id, label] of [
      ["kitchen", "tap", "tap-a", "MUTFAĞA DÖN"],
      ["bathroom", "shower", "shower-a", "BANYOYA DÖN"],
    ]) {
      await click(`room:${room}`);
      await snap(room);
      await click(`solve:${room}:${zone}`);
      assert.equal(
        await page.locator(".contextual-action .primary").innerText(),
        "GERİ DÖN",
      );
      await page.reload();
      await click("resume");
      assert((await page.locator(".market-product").count()) <= 3);
      await snap(`${room}-market`);
      await click(`product:${id}`);
      await click(`inspect:${id}`);
      assert((await page.locator("#dialog").innerText()).includes("Kalan"));
      await click(`buy:${id}`);
      assert.equal(
        await page.locator("#stage").getAttribute("data-room"),
        room,
      );
      assert(
        (await page.locator(".contextual-action").innerText()).includes(
          "Seçimin hazır.",
        ),
      );
      await snap(`${room}-purchased`);
      await page.reload();
      await click("resume");
      assert.equal(
        await page.locator(".contextual-action .primary").innerText(),
        "YERLEŞTİR",
      );
      await snap(`${room}-ready`);
      await click("place-ready");
      await page.locator("#learning-dialog[open]").waitFor();
      await page.waitForTimeout(3500);
      await page.keyboard.press("Escape");
      assert(await page.locator("#learning-dialog").isVisible());
      await page.screenshot({ path: `qa/ux-${width}-${room}-lesson.png` });
      await click("lesson-ack");
      if (room === "kitchen") {
        assert.equal(await page.locator(".active-problem").count(), 1);
        assert.equal(
          await page.locator(".active-problem").getAttribute("data-action"),
          "zone:food",
        );
        assert.equal(
          await page.locator(".contextual-action .primary").innerText(),
          "ÇÖZÜM ARA",
        );
      } else
        assert.equal(
          await page.locator(".contextual-action .primary").innerText(),
          "DEVAM ET",
        );
      await click("map");
    }
    for (const room of ["workshop", "laundry", "garden"]) {
      await click(`room:${room}`);
      await snap(room);
      await click("map");
    }
    await click("room:home");
    await click("solve:home:window");
    assert.equal(
      await page.locator('[data-action="product:curtain"]').count(),
      0,
    );
    assert.equal(await page.locator(".categories").count(), 0);
    assert.equal(await page.locator(".market-product").count(), 1);
    const text = await page.locator("#ui").innerText();
    for (const forbidden of [
      "Fırsata dön",
      "YEŞİL KASA",
      "BAŞLANGIÇ",
      "CEBİNDE KALAN",
      "Fikir Çantam",
      "Parasız fikir",
      "Envanter",
    ])
      assert(!text.includes(forbidden));
    await page.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "qa/ux.json",
    JSON.stringify({ passed: true, errors, audits }, null, 2),
  );
  await browser.close();
  console.log(
    "PASS: contextual CTA, saved origin, one-click placement, persistent lessons, hidden legacy navigation; 3 viewports",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
