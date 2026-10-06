const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true }),
    c = await b.newContext(),
    p = await c.newPage();
  p.on("pageerror", (e) => console.log("PAGE", e.message));
  p.on("requestfailed", (r) => console.log("FAIL", r.url(), r.failure()));
  await p.goto("http://127.0.0.1:4180");
  await p.locator('[data-action="new"]').waitFor();
  await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", r, {
          once: true,
        }),
      );
  });
  console.log(
    await p.evaluate(async () => ({
      controller: navigator.serviceWorker.controller.scriptURL,
      caches: await caches.keys(),
      files: (await (await caches.open((await caches.keys())[0])).keys()).map(
        (r) => r.url,
      ),
    })),
  );
  await c.setOffline(true);
  await p.reload();
  await p.waitForTimeout(5000);
  console.log("BODY", await p.locator("body").innerText());
  await p.screenshot({ path: "qa/main-revision/offline-debug.png" });
  await b.close();
})();
