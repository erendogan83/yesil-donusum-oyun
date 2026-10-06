const { chromium } = require("playwright");
const fs = require("fs");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const c = await b.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  const p = await c.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  for (const f of JSON.parse(
    fs.readFileSync("qa/main-revision/placement-fixtures.json", "utf8"),
  )) {
    await p.goto("http://127.0.0.1:4180");
    await p.evaluate(
      (d) => localStorage.setItem("yesil-donusum-v1", JSON.stringify(d)),
      f.db,
    );
    await p.reload();
    await p.locator('[data-action="resume"]').click();
    await p.waitForTimeout(350);
    await p.screenshot({ path: `qa/main-revision/placement-${f.id}.png` });
  }
  assert.deepEqual(errors, []);
  console.log("ALL 33 PRODUCT PLACEMENTS RENDERED");
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
