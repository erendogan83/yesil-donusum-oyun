const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  for (const width of [1920, 1366]) {
    for (const [id, room, zone] of [
      ["tap-a", "kitchen", "tap"],
      ["shower-a", "bathroom", "shower"],
      ["strip", "workshop", "power"],
      ["meter", "workshop", "power"],
      ["shower-b", "bathroom", "shower"],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 1920 ? 1080 : 768 },
        hasTouch: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:5174");
      await page.locator("[data-action=new]").waitFor();
      await page.evaluate(
        async ({ room }) => {
          const m = await import("/src/model.ts");
          let s = m.start(
            {
              organization: "Görsel QA",
              first: "Ayşe",
              second: "Fatma",
              mode: "practice",
            },
            [],
            [],
          );
          for (let i = 0; i < 3; i++) s = m.continueRound(m.endRound(s));
          s.room = room;
          s.tutorial = false;
          localStorage.setItem(
            m.STORAGE_KEY,
            JSON.stringify({ ...m.emptyDatabase(), active: s }),
          );
        },
        { room },
      );
      const click = async (a) => {
        await page.locator(`[data-action="${a}"]`).first().tap();
        await page.waitForFunction(
          () =>
            document.querySelector("#stage").getAttribute("aria-busy") !==
            "true",
        );
      };
      await page.reload();
      await click("resume");
      await click(`solve:${room}:${zone}`);
      await page.screenshot({ path: `qa/refine-${width}-${id}-market.png` });
      await click(`product:${id}`);
      assert(!(await page.locator("#dialog").isVisible()));
      await click(`inspect:${id}`);
      await click(`buy:${id}`);
      assert.equal(
        await page.locator("#stage").getAttribute("data-room"),
        room,
      );
      await click("place-ready");
      await page.locator("#learning-dialog[open]").waitFor();
      await page.screenshot({ path: `qa/refine-${width}-${id}-card.png` });
      if (id === "tap-a") {
        await page.waitForTimeout(7200);
        await page.keyboard.press("Escape");
        assert(await page.locator("#learning-dialog").isVisible());
        await page.reload();
        await click("resume");
        await page.locator("#learning-dialog[open]").waitFor();
      }
      const lesson = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("yesil-donusum-v1")).active.lessons.at(
          -1,
        ),
      );
      assert.equal(
        lesson.tone,
        id === "shower-b" ? "bad" : id === "meter" ? "neutral" : "good",
      );
      assert.equal(await page.locator("#learning-dialog button").count(), 1);
      await click("lesson-ack");
      await page.screenshot({ path: `qa/refine-${width}-${id}-installed.png` });
      assert(
        await page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("yesil-donusum-v1"),
            ).active.lessons.at(-1).acknowledged,
        ),
      );
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "qa/refinement.json",
    JSON.stringify(
      {
        passed: true,
        errors,
        combinations: 10,
        checks: [
          "touch",
          "persistent lesson",
          "reload",
          "Escape",
          "good/neutral/bad",
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    "PASS: 10 scene/product/size combinations; touch, persistent lessons, reload, Escape, good/neutral/bad",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
