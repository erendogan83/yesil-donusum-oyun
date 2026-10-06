const { chromium } = require("playwright");
(async () => {
  let b = await chromium.launch({ channel: "chrome", headless: true }),
    p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  await p.goto("http://127.0.0.1:5175");
  await p.locator('[data-action="new"]').waitFor();
  for (const size of [
    [1366, 768],
    [1920, 1080],
    [1366, 768],
  ]) {
    await p.setViewportSize({ width: size[0], height: size[1] });
    await p.waitForTimeout(600);
    console.log(
      await p.evaluate(() => {
        let c = document.querySelector("canvas"),
          s = document.querySelector("#stage");
        return {
          canvas: c.getBoundingClientRect().toJSON(),
          style: c.getAttribute("style"),
          width: c.width,
          height: c.height,
          stage: s.getBoundingClientRect().toJSON(),
        };
      }),
    );
  }
  await b.close();
})();
