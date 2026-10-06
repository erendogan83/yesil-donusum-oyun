const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true }),
    p = await b.newPage();
  const f = JSON.parse(
    fs.readFileSync("qa/main-revision/placement-fixtures.json", "utf8"),
  )[0];
  await p.addInitScript(
    (d) => localStorage.setItem("yesil-donusum-v1", JSON.stringify(d)),
    f.db,
  );
  await p.goto("http://127.0.0.1:4180");
  await p.waitForTimeout(2500);
  console.log(f.id, await p.locator("body").innerText());
  await b.close();
})();
