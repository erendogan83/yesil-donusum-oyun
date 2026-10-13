// API checks against `wrangler pages dev dist --d1=DB` with ADMIN_TOKEN set (see `npm run dev:cf`):
// finished games, the shared leaderboard, admin deletes and rooms.
const assert = require("node:assert/strict");
const base = process.env.API_URL || "http://127.0.0.1:8788";
// These checks wipe every stored result: never run them against a live site.
if (!new URL(base).hostname.match(/^(127.0.0.1|localhost)$/))
  throw Error("Refusing to wipe results on a non-local server: " + base);
const token = process.env.ADMIN_TOKEN || "secret123";
const auth = { Authorization: `Bearer ${encodeURIComponent(token)}` };
const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const game = (id, over = {}) => ({
  id,
  name: "Eren",
  mode: "official",
  score: 1500,
  bill: 5000,
  budget: 2000,
  savingPercent: 50,
  rulesVersion: 1,
  completedAt: new Date().toISOString(),
  ...over,
});
const pid = (n) => `player-${String(n).padStart(4, "0")}-xxxx`;

(async () => {
  // ---- admin protection and clean slate
  assert.equal(
    (await fetch(`${base}/api/results?mode=all`, { method: "DELETE" })).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/results?mode=all`, {
        method: "DELETE",
        headers: { Authorization: "Bearer wrong" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/results?mode=all`, {
        method: "DELETE",
        headers: auth,
      })
    ).status,
    200,
  );

  // ---- finished games: no cooperative, any number of players with the same name
  let r = await post("/api/results", game("game-0001-aaaa"));
  assert.equal(r.status, 201);
  assert.equal((await r.json()).mode, "official");
  assert.equal(
    (await (await post("/api/results", game("game-0001-aaaa"))).json())
      .duplicate,
    true,
  );
  assert.equal(
    (await post("/api/results", game("game-0002-bbbb", { score: 1700 })))
      .status,
    201,
  );
  assert.equal(
    (
      await post(
        "/api/results",
        game("game-0003-cccc", {
          mode: "practice",
          name: "Serbest",
          score: 100,
        }),
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await post(
        "/api/results",
        game("game-0004-dddd", { mode: "room", room: "ABCDE", score: 900 }),
      )
    ).status,
    201,
  );
  for (let i = 0; i < 60; i++)
    await post(
      "/api/results",
      game(`bulk-${String(i).padStart(4, "0")}-zzzz`, {
        name: `Oyuncu ${i}`,
        score: 100 + i,
      }),
    );

  // ---- invalid payloads
  for (const bad of [
    game("game-bad-0001", { score: 99999 }),
    game("game-bad-0002", { name: "" }),
    game("game-bad-0003", { id: "x" }),
    game("game-bad-0004", { mode: "hacker" }),
    game("game-bad-0005", { rulesVersion: 2 }),
    game("game-bad-0006", { completedAt: "2999-01-01T00:00:00Z" }),
    game("game-bad-0007", { mode: "room" }), // a room game needs its room code
    game("game-bad-0008", { mode: "room", room: "no" }),
  ])
    assert.equal(
      (await post("/api/results", bad)).status,
      400,
      JSON.stringify(bad),
    );
  assert.equal(
    (await fetch(`${base}/api/results`, { method: "POST", body: "{nope" }))
      .status,
    400,
  );

  // ---- ranked, public list (60 + 4 stored games)
  const list = (await (await fetch(`${base}/api/results`)).json()).results;
  assert.equal(list.length, 64);
  for (let i = 1; i < list.length; i++)
    assert(list[i - 1].score >= list[i].score);
  assert(
    list.every((g) => !("organization" in g)),
    "no cooperative field any more",
  );

  // ---- admin: check, single delete, bulk practice delete
  assert.equal((await fetch(`${base}/api/admin`)).status, 401);
  assert.equal(
    (await fetch(`${base}/api/admin`, { headers: auth })).status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/api/results/game-0001-aaaa`, { method: "DELETE" }))
      .status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/results/game-0001-aaaa`, {
        method: "DELETE",
        headers: auth,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${base}/api/results/game-0001-aaaa`, {
        method: "DELETE",
        headers: auth,
      })
    ).status,
    404,
  );
  const del = await (
    await fetch(`${base}/api/results?mode=practice`, {
      method: "DELETE",
      headers: auth,
    })
  ).json();
  assert(del.deleted >= 1);
  assert(
    (await (await fetch(`${base}/api/results`)).json()).results.every(
      (g) => g.mode !== "practice",
    ),
  );

  // ---- rooms
  const host = pid(1);
  const guest = pid(2);
  const late = pid(3);
  let created = await post("/api/rooms", { playerId: host, name: "Kurucu" });
  assert.equal(created.status, 201);
  let room = (await created.json()).room;
  assert.match(room.code, /^[A-Z0-9]{5}$/);
  assert.equal(room.status, "lobby");
  assert.equal(room.hostId, host);
  assert.equal(
    (await post("/api/rooms", { playerId: host, name: "" })).status,
    400,
  );
  assert.equal(
    (await post("/api/rooms", { playerId: "x", name: "A" })).status,
    400,
  );

  assert.equal((await fetch(`${base}/api/rooms/ZZZZZ`)).status, 404);
  assert.equal((await fetch(`${base}/api/rooms/!!`)).status, 400);
  let joined = await post(`/api/rooms/${room.code}/join`, {
    playerId: guest,
    name: "Misafir",
  });
  assert.equal(joined.status, 200);
  assert.equal((await joined.json()).room.players.length, 2);
  // Rejoining with the same id only renames.
  joined = await post(`/api/rooms/${room.code.toLowerCase()}/join`, {
    playerId: guest,
    name: "Misafir 2",
  });
  assert.equal((await joined.json()).room.players.length, 2);
  assert.equal(
    (await post(`/api/rooms/NOPE9/join`, { playerId: late, name: "Geç" }))
      .status,
    404,
  );

  // Only the host can start; the start time is in the future (countdown), same for everyone.
  assert.equal(
    (await post(`/api/rooms/${room.code}/start`, { playerId: guest })).status,
    403,
  );
  const started = (
    await (
      await post(`/api/rooms/${room.code}/start`, { playerId: host })
    ).json()
  ).room;
  assert.equal(started.status, "playing");
  assert(started.startedAt > started.now, "countdown before the game starts");
  // Nobody new may join a running game.
  assert.equal(
    (
      await post(`/api/rooms/${room.code}/join`, {
        playerId: late,
        name: "Geç",
      })
    ).status,
    409,
  );

  // Live scores and finishing.
  assert.equal(
    (
      await post(`/api/rooms/${room.code}/score`, {
        playerId: guest,
        score: 400,
        round: 2,
        finished: false,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await post(`/api/rooms/${room.code}/score`, {
        playerId: host,
        score: 300,
        round: 1,
        finished: false,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await post(`/api/rooms/${room.code}/score`, {
        playerId: host,
        score: 99999,
        round: 1,
        finished: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(`/api/rooms/${room.code}/score`, {
        playerId: late,
        score: 1,
        round: 1,
        finished: false,
      })
    ).status,
    404,
  );
  room = (await (await fetch(`${base}/api/rooms/${room.code}`)).json()).room;
  assert.deepEqual(
    room.players.map((p) => p.name),
    ["Misafir 2", "Kurucu"],
    "ranked by score",
  );
  assert.equal(room.status, "playing");
  await post(`/api/rooms/${room.code}/score`, {
    playerId: guest,
    score: 450,
    round: 4,
    finished: true,
  });
  assert.equal(
    (await (await fetch(`${base}/api/rooms/${room.code}`)).json()).room.status,
    "playing",
    "one still plays",
  );
  await post(`/api/rooms/${room.code}/score`, {
    playerId: host,
    score: 320,
    round: 4,
    finished: true,
  });
  assert.equal(
    (await (await fetch(`${base}/api/rooms/${room.code}`)).json()).room.status,
    "finished",
  );

  // A full reset also removes rooms.
  await fetch(`${base}/api/results?mode=all`, {
    method: "DELETE",
    headers: auth,
  });
  assert.equal((await fetch(`${base}/api/rooms/${room.code}`)).status, 404);
  console.log("API QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
