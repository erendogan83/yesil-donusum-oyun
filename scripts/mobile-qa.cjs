// Phone usability: every control must be reachable by a finger, never covered or overlapped,
// and the game must be playable with real touch taps (screen coordinates, no selector clicks).
// Playwright's locator.click()/tap() scroll elements into view and hit their centre, which hides
// exactly the problems phone players hit; this test taps at coordinates instead.
// Usage: GAME_URL=http://127.0.0.1:4180 node scripts/mobile-qa.cjs
const { chromium, webkit, devices } = require("playwright");
const assert = require("node:assert/strict");
const U = process.env.GAME_URL || "http://127.0.0.1:4180/";

const AUDIT = () => {
  const out = [];
  const openDialog = [...document.querySelectorAll("dialog[open]")].at(-1);
  const scope = openDialog ?? document;
  const els = [
    ...scope.querySelectorAll(
      "button[data-action], input:not([type=hidden]), select",
    ),
  ].filter((el) => {
    const r = el.getBoundingClientRect();
    return (
      r.width &&
      r.height &&
      getComputedStyle(el).visibility !== "hidden" &&
      (openDialog || !el.closest("dialog"))
    );
  });
  const rects = els.map((el) => ({ el, r: el.getBoundingClientRect() }));
  for (const { el, r } of rects) {
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const inView = cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
    let scroller = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const st = getComputedStyle(p);
      if (
        /(auto|scroll)/.test(st.overflowY) &&
        p.scrollHeight > p.clientHeight + 2
      ) {
        scroller = p;
        break;
      }
    }
    const label = el.dataset.action || el.id || el.name || el.tagName;
    if (!inView) {
      if (!scroller)
        out.push(`UNREACHABLE ${label} @${Math.round(cx)},${Math.round(cy)}`);
      continue;
    }
    const top = document.elementFromPoint(cx, cy);
    if (!(top && (top === el || el.contains(top) || top.contains(el))))
      out.push(`COVERED ${label}`);
    if (
      Math.min(r.width, r.height) < 30 &&
      el.type !== "radio" &&
      el.type !== "checkbox"
    )
      out.push(`SMALL ${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  // Only buttons that stay visible together matter for overlap.
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r;
      const b = rects[j].r;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (
        w > 0 &&
        h > 0 &&
        (w * h) / Math.min(a.width * a.height, b.width * b.height) > 0.25 &&
        !rects[i].el.contains(rects[j].el) &&
        !rects[j].el.contains(rects[i].el)
      )
        out.push(
          `OVERLAP ${rects[i].el.dataset.action || rects[i].el.tagName} x ${rects[j].el.dataset.action || rects[j].el.tagName}`,
        );
    }
  return out;
};

async function run(label, engine, device) {
  const browser = await engine.launch(
    engine === chromium ? { channel: "chrome" } : {},
  );
  const context = await browser.newContext({
    ...devices[device],
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const problems = [];
  const busy = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#stage")?.getAttribute("aria-busy") !== "true",
    );
  const audit = async (screen) => {
    for (const p of await page.evaluate(AUDIT))
      problems.push(`[${screen}] ${p}`);
  };
  // A finger: tap the on-screen centre of the first visible match. If it sits inside a
  // scrollable dialog, scroll that dialog first (a player can do that), never the page.
  const tap = async (selector) => {
    const el = page.locator(`${selector}:visible`).first();
    await el.waitFor({ timeout: 8000 });
    // Let opening animations finish so the measured position is the final one.
    await page.evaluate(() =>
      Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => {})),
      ),
    );
    await page.waitForTimeout(120);
    await el.evaluate((e) => {
      // A player scrolls a dialog until the control is fully visible.
      for (let p = e.parentElement; p; p = p.parentElement) {
        if (
          !/(auto|scroll)/.test(getComputedStyle(p).overflowY) ||
          p.scrollHeight <= p.clientHeight
        )
          continue;
        const r = e.getBoundingClientRect();
        const pr = p.getBoundingClientRect();
        if (r.top < pr.top || r.bottom > pr.bottom)
          e.scrollIntoView({ block: "center" });
        break;
      }
    });
    const box = await el.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const hit = await page.evaluate(
      ([x, y]) => {
        const t = document.elementFromPoint(x, y);
        return t
          ? (t.closest("[data-action]")?.dataset.action ?? t.tagName)
          : "nothing";
      },
      [x, y],
    );
    const wanted = await el.getAttribute("data-action");
    assert(
      wanted === null ||
        hit === wanted ||
        (await el.evaluate(
          (e, h) => e.contains(document.elementFromPoint(...h)),
          [x, y],
        )),
      `${label}: tapping ${selector} at ${Math.round(x)},${Math.round(y)} hit ${hit}`,
    );
    await page.touchscreen.tap(x, y);
    await busy();
    await page.waitForTimeout(150);
  };
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("yesil-donusum-v1")));

  await page.goto(U);
  await page.locator('[data-action="new"]').waitFor();
  await audit("start");
  // The room screens must be usable on a phone too.
  await tap('[data-action="room-create"]');
  await audit("room-create");
  await tap('[data-action="start"]');
  await tap('[data-action="room-join"]');
  await audit("room-join");
  await tap('[data-action="start"]');
  await tap('[data-action="new"]');
  await audit("registration");
  await page.locator("#first").fill("Eren");
  await tap('[type="submit"]');
  await audit("tutorial");
  await tap('[data-action="tutorial-done"]');
  await audit("map");
  await tap('[data-action="room:kitchen"]');
  await audit("room");
  await tap('[data-action="solve:kitchen:rev-tap"]');
  await audit("market");
  // Shelf item on landscape (tap, then "İncele"); a card on portrait phones (one tap).
  if (await page.locator(".market-card:visible").count())
    await tap('.market-card[data-action="inspect:rev-tap-repair"]');
  else {
    await tap('.market-hit[data-action="product:rev-tap-repair"]');
    await tap('[data-action="inspect:rev-tap-repair"]');
  }
  await audit("product-dialog");
  await tap('[data-action="buy:rev-tap-repair"]');
  await tap('[data-action="place-ready"]');
  await page.locator("#learning-dialog[open]").waitFor();
  await audit("lesson");
  await tap('[data-action="lesson-ack"]');
  await tap('[data-action="solve:kitchen:rev-waste-sort"]');
  await audit("sorting");
  // Wrong bag first (costs money), then the right one: tap an item, tap a bag.
  const budget0 = (await state()).active.budget;
  await tap('[data-action="sort-select:tissue"]');
  await tap('[data-action="sort-target:paper"]');
  assert(
    (await state()).active.budget < budget0,
    `${label}: wrong bag did not cost money`,
  );
  await tap('[data-action="sort-select:tissue"]');
  await tap('[data-action="sort-target:other"]');
  assert.deepEqual(
    (await state()).active.sorting["waste-sort"].placed,
    ["tissue"],
    `${label}: tissue not placed`,
  );
  await tap('[data-action="sort-select:organic"]');
  await tap('[data-action="sort-target:organic"]');
  assert.equal(
    (await state()).active.sorting["waste-sort"].placed.length,
    2,
    `${label}: second item not placed`,
  );

  // Drag with a real touch gesture where the engine supports it (Chromium only) and the
  // item and the bag are on screen together, as they are for a player who drags.
  if (engine === chromium) {
    const cdp = await context.newCDPSession(page);
    const measure = async (sel) => {
      const b = await page.locator(`${sel}:visible`).first().boundingBox();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    // Earlier taps scrolled the dialog; a player drags from its top.
    await page.evaluate(() => {
      document.querySelector("#dialog").scrollTop = 0;
    });
    const vh = await page.evaluate(() => innerHeight);
    const from = await measure('[data-item="metal"]');
    const to = await measure('[data-target="metal"]');
    assert(
      from.y > 0 && from.y < vh && to.y > 0 && to.y < vh,
      `${label}: item and bag are not on screen together (${Math.round(from.y)} / ${Math.round(to.y)} of ${vh})`,
    );
    const touch = (type, p) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: p.x, y: p.y, id: 1 }],
      });
    await touch("touchStart", from);
    for (let i = 1; i <= 8; i++)
      await touch("touchMove", {
        x: from.x + ((to.x - from.x) * i) / 8,
        y: from.y + ((to.y - from.y) * i) / 8,
      });
    await touch("touchEnd", to);
    await busy();
    await page.waitForTimeout(300);
    assert.equal(
      (await state()).active.sorting["waste-sort"].placed.length,
      3,
      `${label}: touch drag did not place the item`,
    );
  }
  await audit("sorting-after");
  assert.deepEqual(errors, [], `${label}: page errors`);
  await browser.close();
  return problems;
}

(async () => {
  const matrix = [
    ["Android portrait", chromium, "Pixel 7"],
    ["small Android portrait", chromium, "Galaxy S9+"],
    ["Android landscape", chromium, "Pixel 7 landscape"],
    ["iPhone portrait", webkit, "iPhone 13"],
    ["iPhone SE portrait", webkit, "iPhone SE"],
    ["iPhone landscape", webkit, "iPhone 13 landscape"],
  ];
  let failed = 0;
  for (const [label, engine, device] of matrix) {
    try {
      const problems = await run(label, engine, device);
      if (problems.length) {
        failed++;
        console.log(`FAIL ${label}\n  ${problems.join("\n  ")}`);
      } else console.log(`ok   ${label}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${label}: ${e.message.split("\n")[0]}`);
    }
  }
  if (failed) {
    console.log(`MOBILE QA FAILED (${failed})`);
    process.exit(1);
  }
  console.log("MOBILE QA PASSED");
})();
