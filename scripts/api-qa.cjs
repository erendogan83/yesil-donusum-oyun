// Leaderboard API checks against `wrangler pages dev dist --d1=DB --binding ADMIN_TOKEN=secret123`.
const assert = require("node:assert/strict");
const base = process.env.API_URL || "http://127.0.0.1:8788";
// These checks wipe every stored result: never run them against a live site.
if (!new URL(base).hostname.match(/^(127.0.0.1|localhost)$/))
  throw Error("Refusing to wipe results on a non-local server: " + base);

const token = process.env.ADMIN_TOKEN || "secret123";
const orgs = require("../public/organizations.json");
const post = (body) =>
  fetch(`${base}/api/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const result = (id, over = {}) => ({
  id,
  organization: orgs[0],
  first: "Ayşe",
  second: "Nisa",
  mode: "official",
  score: 1500,
  bill: 5000,
  budget: 2000,
  savingPercent: 50,
  rulesVersion: 1,
  completedAt: new Date().toISOString(),
  ...over,
});
const auth = { Authorization: `Bearer ${encodeURIComponent(token)}` };
(async () => {
  // Clean slate (also proves bulk delete works and needs the token).
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

  // Official result is stored; retrying the same game is idempotent.
  let r = await post(result("game-0001-aaaa"));
  assert.equal(r.status, 201);
  assert.equal((await r.json()).mode, "official");
  r = await post(result("game-0001-aaaa"));
  assert.equal((await r.json()).duplicate, true);

  // Second official result for the same institution is downgraded to practice.
  r = await post(result("game-0002-bbbb", { score: 1700 }));
  let body = await r.json();
  assert.equal(body.mode, "practice");
  assert.equal(body.downgraded, true);

  // Another institution, an unknown institution (downgraded) and free play.
  assert.equal(
    (
      await (
        await post(
          result("game-0003-cccc", { organization: orgs[1], score: 900 }),
        )
      ).json()
    ).mode,
    "official",
  );
  assert.equal(
    (
      await (
        await post(result("game-0004-dddd", { organization: "Uydurma Kurum" }))
      ).json()
    ).mode,
    "practice",
  );
  assert.equal(
    (
      await (
        await post(
          result("game-0005-eeee", {
            organization: "Serbest Ekip",
            mode: "practice",
            score: 100,
          }),
        )
      ).json()
    ).mode,
    "practice",
  );

  // Beyond 26 institutions works: only the list decides.
  for (let i = 0; i < 40; i++) {
    const name = orgs[i % orgs.length];
    await post(
      result(`bulk-${String(i).padStart(4, "0")}-zzzz`, {
        organization: name,
        score: 100 + i,
      }),
    );
  }

  // Invalid payloads are rejected.
  for (const bad of [
    { ...result("game-bad-0001"), score: 99999 },
    { ...result("game-bad-0002"), first: "" },
    { ...result("game-bad-0003"), id: "x" },
    { ...result("game-bad-0004"), mode: "hacker" },
    { ...result("game-bad-0005"), rulesVersion: 2 },
    { ...result("game-bad-0006"), completedAt: "2999-01-01T00:00:00Z" },
  ])
    assert.equal((await post(bad)).status, 400, JSON.stringify(bad));
  assert.equal(
    (await fetch(`${base}/api/results`, { method: "POST", body: "{nope" }))
      .status,
    400,
  );

  // Leaderboard is ranked and public.
  const list = (await (await fetch(`${base}/api/results`)).json()).results;
  assert(list.length === 45, `got ${list.length}`);
  for (let i = 1; i < list.length; i++)
    assert(list[i - 1].score >= list[i].score);
  const officials = list.filter((x) => x.mode === "official");
  assert.equal(
    new Set(officials.map((x) => x.organization)).size,
    officials.length,
    "one official per institution",
  );

  // Admin check, single delete, bulk practice delete.
  assert.equal((await fetch(`${base}/api/admin`)).status, 401);
  assert.equal(
    (await fetch(`${base}/api/admin`, { headers: auth })).status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/api/results/game-0003-cccc`, { method: "DELETE" }))
      .status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/results/game-0003-cccc`, {
        method: "DELETE",
        headers: auth,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${base}/api/results/game-0003-cccc`, {
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
  assert(del.deleted >= 2);
  const after = (await (await fetch(`${base}/api/results`)).json()).results;
  assert(after.every((x) => x.mode === "official"));
  assert(!after.some((x) => x.id === "game-0003-cccc"));
  await fetch(`${base}/api/results?mode=all`, {
    method: "DELETE",
    headers: auth,
  });
  console.log("API QA PASSED");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
