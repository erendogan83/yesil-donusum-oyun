// Rooms: one player creates a room, others join by typing its name, the host starts and everybody
// plays the same timed game at once with a live ranking. When the host leaves, the role moves
// to the next player. Needs HOST_START_MS=12000 and PRESENT_MS=6000 in .dev.vars.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.API_URL || "http://127.0.0.1:8788";
if (!new URL(base).hostname.match(/^(127.0.0.1|localhost)$/))
  throw Error("Refusing to wipe results on a non-local server: " + base);
const token = process.env.ADMIN_TOKEN || "secret123";
(async () => {
  await fetch(`${base}/api/results?mode=all`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${encodeURIComponent(token)}` },
  });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const player = async (name) => {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    const busy = () =>
      page.waitForFunction(
        () =>
          document.querySelector("#stage")?.getAttribute("aria-busy") !==
          "true",
      );
    const click = async (a) => {
      await page.locator(`[data-action="${a}"]:visible`).first().click();
      await busy();
    };
    const state = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("yesil-donusum-v1"))?.active,
      );
    await page.goto(base);
    return { name, page, click, state };
  };
  const leaver = await player("Ayrılan");
  const host = await player("Kurucu");
  const guest = await player("Misafir");
  const late = await player("Geç");

  // ---- create and join
  await leaver.click("room-create");
  const title = "Şükrü'nün Odası " + Date.now().toString(36);
  await leaver.page.locator("#room-title").fill(title);
  await leaver.page.locator("#room-name").fill("Ayrılan");
  await leaver.page.locator('[type="submit"]').click();
  await leaver.page.locator(".room-code").waitFor();
  const code = (await leaver.page.locator(".room-code").innerText()).trim();
  assert.equal(code, title, "the lobby shows the room's name");
  const slug = title
    .replace(/[şŞ]/g, "S")
    .replace(/[üÜ]/g, "U")
    .replace(/ı/g, "I")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  assert.equal(
    await leaver.page.locator('[data-action="room-start"]').count(),
    1,
    "the creator sees the start button",
  );
  assert.match(
    await leaver.page.locator("#host-timer").innerText(),
    /başlatmak için/,
  );
  await host.click("room-join");
  await host.page.locator("#room-title").fill(title.toUpperCase());
  await host.page.locator("#room-name").fill("Kurucu");
  await host.page.locator('[type="submit"]').click();
  await host.page.locator(".room-code").waitFor();
  assert.equal(
    await host.page.locator('[data-action="room-start"]').count(),
    0,
    "the second player is not the host yet",
  );

  // A wrong room name is explained, not silently ignored.
  await guest.click("room-join");
  await guest.page.locator("#room-title").fill("Olmayan oda");
  await guest.page.locator("#room-name").fill("Misafir");
  await guest.page.locator('[type="submit"]').click();
  await guest.page.locator("#room-error:not(:empty)").waitFor();
  assert.match(
    await guest.page.locator("#room-error").innerText(),
    /bulunamadı/,
  );
  await guest.page.locator("#room-title").fill(title.toLowerCase());
  await guest.page.locator('[type="submit"]').click();
  await guest.page.locator(".room-code").waitFor();
  assert.equal(
    (await guest.page.locator(".room-code").innerText()).trim(),
    code,
  );
  assert.equal(
    await guest.page.locator('[data-action="room-start"]').count(),
    0,
    "guests cannot start",
  );
  assert.match(await guest.page.locator(".lobby").innerText(), /bekleniyor/);

  // The creator leaves: the next player in line becomes the host.
  await host.page.waitForFunction(
    () => document.querySelectorAll(".player-list li").length === 3,
    null,
    { timeout: 8000 },
  );
  await leaver.click("room-leave");
  await host.page
    .locator('[data-action="room-start"]')
    .waitFor({ timeout: 8000 });
  assert.match(
    await host.page.locator("#status").innerText(),
    /kurucu/i,
    "the new host is told",
  );
  await host.page.waitForFunction(
    () => document.querySelectorAll(".player-list li").length === 2,
    null,
    { timeout: 8000 },
  );
  assert.equal(
    await guest.page.locator('[data-action="room-start"]').count(),
    0,
    "guests still cannot start",
  );

  // ---- start: everyone gets the same countdown, then the game
  await host.click("room-start");
  await guest.page.locator("#room-countdown").waitFor({ timeout: 8000 });
  for (const p of [host, guest]) {
    await p.page.locator(".hud").waitFor({ timeout: 15000 });
    const s = await p.state();
    assert.equal(s.team.mode, "room");
    assert.equal(s.team.room, slug);
    assert.equal(s.tutorial, false, "rooms skip the intro dialog");
    assert.equal(
      await p.page.locator("#clock-meter").count(),
      1,
      "room games are timed",
    );
  }

  // Nobody can join once the game runs.
  await late.click("room-join");
  await late.page.locator("#room-title").fill(title);
  await late.page.locator("#room-name").fill("Geç");
  await late.page.locator('[type="submit"]').click();
  await late.page.locator("#room-error:not(:empty)").waitFor();
  assert.match(await late.page.locator("#room-error").innerText(), /başladı/);

  // ---- the host scores; the guest sees the live ranking
  await host.click("room:kitchen");
  await host.click("solve:kitchen:rev-tap");
  await host.click("product:rev-tap-repair");
  await host.click("inspect:rev-tap-repair");
  await host.click("buy:rev-tap-repair");
  await host.click("place-ready");
  await host.page.locator("#learning-dialog[open]").waitFor();
  await host.click("lesson-ack");
  await guest.page.waitForFunction(
    () =>
      /Oda .+ · 2\. \/ 2 · lider Kurucu 100/.test(
        document.querySelector("#room-bar")?.textContent ?? "",
      ),
    null,
    { timeout: 12000 },
  );
  await guest.page.locator("#room-bar").click();
  const ranking = await guest.page.locator("#dialog .room-ranks").innerText();
  assert(ranking.includes("Kurucu") && ranking.includes("Misafir"), ranking);
  await guest.click("close");

  // ---- both finish; the final screen shows the room's standing
  for (const p of [host, guest]) {
    await p.click("help");
    await p.page.locator('#dialog [data-action="finish-now"]').click();
    await p.click("finish-now-confirm");
    await p.page.locator(".room-final").waitFor();
  }
  await host.page.waitForFunction(
    () =>
      /Herkes bitirdi/.test(
        document.querySelector(".room-final")?.textContent ?? "",
      ),
    null,
    { timeout: 8000 },
  );
  const standing = await host.page
    .locator(".room-final .room-ranks li")
    .allInnerTexts();
  assert.equal(standing.length, 2);
  assert(
    standing[0].includes("Kurucu") && standing[1].includes("Misafir"),
    standing.join("|"),
  );

  // The games are stored as room games with the code.
  await host.page.waitForFunction(
    async (c) =>
      (await (await fetch("./api/results")).json()).results.filter(
        (r) => r.room === c,
      ).length === 2,
    slug,
    { timeout: 10000 },
  );
  const stored = (
    await (await fetch(`${base}/api/results`)).json()
  ).results.filter((r) => r.room === slug);
  assert.deepEqual(
    stored.map((r) => r.mode),
    ["room", "room"],
  );
  assert.deepEqual(
    new Set(stored.map((r) => r.name)),
    new Set(["Kurucu", "Misafir"]),
  );
  assert.deepEqual(errors, []);
  await fetch(`${base}/api/results?mode=all`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${encodeURIComponent(token)}` },
  });
  await browser.close();
  console.log("ROOM QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
