module.exports = async function prepareNavigation(page, action) {
  const hit = (a) => page.locator(`[data-action="${a}"]`).first();
  const click = async (a) => {
    await hit(a).click();
    await page.waitForFunction(
      () =>
        document.querySelector("#stage").getAttribute("aria-busy") !== "true",
    );
  };
  if (action === "map" && !(await hit("map").isVisible())) await click("help");
};
