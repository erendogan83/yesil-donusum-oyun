const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [],
    audits = [];
  for (const width of [1920, 1366, 1024]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1920 ? 1080 : 768 },
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
          organization: "TL ve seçim QA",
          first: "Ayşe",
          second: "Fatma",
          mode: "practice",
        },
        [],
        [],
      );
      for (let i = 0; i < 3; i++) s = m.continueRound(m.endRound(s));
      s.budget = 10000;
      s.tutorial = false;
      localStorage.setItem(
        m.STORAGE_KEY,
        JSON.stringify({ ...m.emptyDatabase(), active: s }),
      );
    });
    await page.reload();
    const click = async (a) => {
      const modal = page.locator(`#dialog[open] [data-action="${a}"]`);
      await (
        (await modal.count())
          ? modal
          : page.locator(`[data-action="${a}"]`).first()
      ).click();
      await page.waitForFunction(
        () =>
          document.querySelector("#stage").getAttribute("aria-busy") !== "true",
      );
    };
    const state = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("yesil-donusum-v1")).active,
      );
    const shot = async (name, audit = false) => {
      await page.waitForTimeout(150);
      await page.screenshot({ path: `qa/tl-${width}-${name}.png` });
      if (audit) {
        const r = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        audits.push({
          width,
          name,
          violations: r.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.failureSummary),
          })),
        });
        assert.equal(r.violations.length, 0, JSON.stringify(audits.at(-1)));
      }
    };
    await click("resume");
    await click("room:bathroom");
    await click("zone:shower");
    await click("solve:bathroom:shower");
    await shot("market", true);
    assert.equal(await page.locator(".market-hit").count(), 2);
    const neutralClasses = [];
    for (const [room, zone, oldId, newId] of [
      ["bathroom", "shower", "shower-b", "shower-a"],
      ["home", "light", "bulb", "led"],
      ["workshop", "power", "basic-strip", "strip"],
      ["waste", "sorting", "bin", "sort"],
      ["roof", "solar", "solar-lamp", "solar"],
    ]) {
      for (const id of [oldId, newId]) {
        if (!(await page.locator(".market-sign").count())) {
          await click("map");
          await click("room:" + room);
          await click("zone:" + zone);
          await click(`solve:${room}:${zone}`);
        }
        await click("product:" + id);
        await click("inspect:" + id);
        const before = await state();
        const p = await page.evaluate(
          async (id) => (await import("/src/data.ts")).productById(id),
          id,
        );
        const text = await page.locator("#dialog").innerText();
        assert(
          !/tasarruflu|verimsiz|doğru seçim|yanlış seçim|faturayı düşür|faturayı artır|kredi/i.test(
            text,
          ),
          text,
        );
        assert(text.includes(p.feature) && text.includes(p.description));
        const money = (n) => "₺" + n.toLocaleString("tr-TR");
        assert.equal(
          await page.locator("#purchase-remaining").innerText(),
          money(before.budget - p.price),
        );
        neutralClasses.push(
          await page.locator("#dialog").getAttribute("class"),
        );
        await shot(`${room}-${id}-choice`, true);
        await click("buy:" + id);
        assert.equal((await state()).budget, before.budget - p.price);
        assert.equal((await state()).bill, before.bill);
        await click("take:" + room);
        await click("select:" + id);
        await click("install-selected");
        await page.locator("#learning-dialog[open]").waitFor();
        if (id === newId) {
          const after = await state();
          assert(after.activeInstallations.includes(newId));
          assert(!after.activeInstallations.includes(oldId));
          assert(after.replacedInstallations.includes(oldId));
          assert(after.moves.find((m) => m.id === oldId).replacedBy === newId);
          assert.equal(
            after.bill,
            before.bill -
              before.moves.find((m) => m.id === oldId).impact +
              p.impact,
          );
          await shot(`${room}-replacement-card`, width === 1366);
        }
        await click("lesson-ack");
        await shot(`${room}-${id}-installed`);
        assert(
          (await page.locator(".opportunities").innerText()).includes("fırsat"),
        );
      }
    }
    assert.equal(new Set(neutralClasses).size, 1);
    await click("end");
    await click("end-confirm");
    await shot("summary", true);
    await click("continue");
    await shot("final", true);
    assert(
      (await page.locator(".final-reveal").innerText()).includes("₺10.000"),
    );
    assert(
      (await page.locator(".simulation-note").innerText()).includes(
        "Gerçek ürün fiyatı",
      ),
    );
    await page.reload();
    await click("leaderboard");
    await click("final");
    assert.equal(
      (await state()).activeInstallations.filter((id) =>
        ["shower-a", "led", "strip", "sort", "solar"].includes(id),
      ).length,
      5,
    );
    await context.close();
  }
  // A small cash balance prompts once in that period; refusal never charges money.
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
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
        organization: "Bütçe QA",
        first: "Ayşe",
        second: "Fatma",
        mode: "practice",
      },
      [],
      [],
    );
    s.budget = 1000;
    s.tutorial = false;
    s.room = "market";
    localStorage.setItem(
      m.STORAGE_KEY,
      JSON.stringify({ ...m.emptyDatabase(), active: s }),
    );
  });
  await page.reload();
  const click = async (a) => {
    await page.locator(`[data-action="${a}"]`).first().click();
    await page.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
  };
  await click("resume");
  await click("product:shower-b");
  await click("inspect:shower-b");
  assert(
    (await page.locator(".budget-question").innerText()).includes(
      "Birlikte karar verin",
    ),
  );
  assert.equal(await page.locator("#purchase-remaining").innerText(), "₺620");
  await click("close");
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("yesil-donusum-v1")).active.budget,
    ),
    1000,
  );
  await click("product:shower-b");
  if (!(await page.locator("#dialog[open]").count()))
    await click("inspect:shower-b");
  await click("buy:shower-b");
  await page.locator("#budget-thought").getByText(/₺620/).waitFor();
  await page.waitForTimeout(3300);
  assert.equal(await page.locator("#purchase-receipt button").count(), 0);
  await page.screenshot({ path: "qa/tl-budget-moment.png" });
  await click("map");
  await click("room:bathroom");
  await page.clock.install();
  await page.keyboard.press("Shift");
  await page.clock.fastForward(41000);
  await page.locator('[data-action="idle-hint"]').waitFor();
  await click("idle-hint");
  assert.match(
    await page.locator("#gentle-hint").innerText(),
    /parlayan noktalara/,
  );
  await page.screenshot({ path: "qa/tl-idle-hint.png" });
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "qa/tl.json",
    JSON.stringify(
      {
        passed: true,
        errors,
        audits,
        checks: [
          "TL detail math",
          "uniform neutral pre-purchase style",
          "all five exclusive replacements",
          "no refunds",
          "active state reload",
          "opportunity counts",
          "period and final money",
          "30% budget prompt",
          "transient receipt",
          "once-per-period budget thought",
          "40-second non-answer hint",
        ],
        viewports: [1920, 1366, 1024],
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    "PASS: TL choices, five replacements, three viewports, summaries/final, budget and idle guidance",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
