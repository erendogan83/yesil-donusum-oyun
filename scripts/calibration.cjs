const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto("http://127.0.0.1:5174");
  await page.locator('[data-action="new"]').waitFor();
  for (const [room, ids] of [
    ["home", ["led", "curtain", "seal"]],
    ["garden", ["rain", "drip"]],
    ["roof", ["solar"]],
    ["laundry", ["smart-plug", "rack"]],
    ["bathroom", ["shower-a", "shower-b"]],
  ]) {
    await page.evaluate(
      async ({ room, ids }) => {
        const m = await import("/src/model.ts"),
          d = await import("/src/data.ts");
        let s = m.start(
          {
            organization: "QA",
            first: "QA",
            second: "Test 2",
            mode: "practice",
          },
          [],
          [],
        );
        for (let i = 0; i < 3; i++) s = m.continueRound(m.endRound(s));
        s.budget = 10000;
        s.tutorial = false;
        for (const id of ids) {
          const p = d.productById(id);
          s = m.install(m.purchase(s, id), id, p.room, p.zone);
        }
        s.room = room;
        localStorage.setItem(
          m.STORAGE_KEY,
          JSON.stringify({ ...m.emptyDatabase(), active: s }),
        );
      },
      { room, ids },
    );
    await page.reload();
    await page.locator('[data-action="resume"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `qa/calibration-${room}.png` });
  }
  await b.close();
})();
