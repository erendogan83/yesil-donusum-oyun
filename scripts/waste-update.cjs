const { chromium } = require("playwright");
const fs = require("fs");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true }),
    p = await b.newPage({
      viewport: { width: 1366, height: 768 },
      reducedMotion: "reduce",
    });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const f = JSON.parse(
    fs.readFileSync("qa/main-revision/placement-fixtures.json", "utf8"),
  ).find((f) => f.id === "rev-tap-repair");
  await p.addInitScript((d) => {
    if (!localStorage.getItem("yesil-donusum-v1"))
      localStorage.setItem("yesil-donusum-v1", JSON.stringify(d));
  }, f.db);
  await p.goto("http://127.0.0.1:4180");
  await p.locator('[data-action="resume"]').click();
  const click = async (a) => {
    await p.locator(`[data-action="${a}"]`).first().click();
    await p.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
  };
  const shot = async (n) => {
    await p.waitForTimeout(300);
    await p.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    await p.screenshot({ path: `qa/main-revision/waste-update-${n}.png` });
  };
  await shot("before");
  await click("solve:kitchen:rev-waste-sort");
  await shot("mixed");
  assert.deepEqual(
    await p
      .locator(".sorting-piece")
      .evaluateAll((bs) => bs.map((b) => b.dataset.waste)),
    ["organic", "metal", "paper", "tissue", "glass", "plastic"],
  );
  await p.setViewportSize({ width: 390, height: 844 });
  await shot("mobile");
  await p.setViewportSize({ width: 1366, height: 768 });
  for (const [i, t] of [
    ["tissue", "other"],
    ["plastic", "plastic"],
    ["metal", "metal"],
  ]) {
    await click("sort-select:" + i);
    await click("sort-target:" + t);
  }
  await click("close");
  await shot("partial");
  await click("solve:kitchen:rev-waste-sort");
  for (const [i, t] of [
    ["organic", "organic"],
    ["paper", "paper"],
    ["glass", "glass"],
  ]) {
    await click("sort-select:" + i);
    await click("sort-target:" + t);
  }
  await p.locator("#learning-dialog[open]").waitFor();
  await click("lesson-ack");
  await shot("after");
  await p.reload();
  await click("resume");
  await shot("restored");
  assert.equal(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("yesil-donusum-v1")).active.sorting[
          "waste-sort"
        ].placed.length,
    ),
    6,
  );
  await p.setViewportSize({ width: 1920, height: 1080 });
  await shot("after-1920");
  assert.deepEqual(errors, []);
  await b.close();
  console.log("WASTE SCENE, MIXED ORDER, PROGRESS, RELOAD PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
