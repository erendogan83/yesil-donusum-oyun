/* Shows why the game did not start (old browser, blocked storage, script error)
   instead of leaving a blank page. Loaded before the game as a plain script. */
(function () {
  var errors = [];
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function started() {
    var ui = document.getElementById("ui");
    return !!ui && ui.children.length > 0;
  }
  function show() {
    if (started() || document.getElementById("boot-error")) return;
    var missing = [];
    if (
      typeof HTMLDialogElement === "undefined" ||
      !HTMLDialogElement.prototype.showModal
    )
      missing.push("dialog (iOS/Safari 15.4+ gerekir)");
    if (!window.WebGLRenderingContext) missing.push("WebGL");
    var box = document.createElement("div");
    box.id = "boot-error";
    box.setAttribute("role", "alert");
    box.style.cssText =
      "position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#302b21;color:#f3e8d0;padding:24px;font:16px/1.5 sans-serif;overflow:auto";
    box.innerHTML =
      "<h2 style='margin:0 0 12px'>Oyun açılamadı</h2>" +
      "<p>Tarayıcınızı güncelleyip sayfayı yenileyin. Özel (gizli) gezinme kullanıyorsanız normal pencerede deneyin.</p>" +
      "<p>Sorun sürerse aşağıdaki bilgiyi gönderin:</p>" +
      "<pre style='white-space:pre-wrap;word-break:break-word;background:#211f18;padding:12px;border-radius:8px'>" +
      esc(
        (errors.join("\n") || "Hata yakalanmadı (oyun yüklenemedi).") +
          (missing.length ? "\nEksik özellik: " + missing.join(", ") : "") +
          "\n" +
          navigator.userAgent,
      ) +
      "</pre>";
    document.body.appendChild(box);
  }
  // While art is still loading the canvas exists but the UI is empty: only report a
  // crash if the game never created its canvas, or has been silent for a long time.
  function onError() {
    if (!document.querySelector("canvas") || performance.now() > 20000) show();
  }
  window.addEventListener("error", function (e) {
    errors.push(
      (e.message || "error") +
        (e.filename
          ? " @ " + e.filename.split("/").pop() + ":" + e.lineno
          : ""),
    );
    setTimeout(onError, 1500); // Give the game a moment; a handled error does not matter.
  });
  window.addEventListener("unhandledrejection", function (e) {
    errors.push(
      "promise: " +
        (e.reason && e.reason.message ? e.reason.message : e.reason),
    );
    setTimeout(onError, 1500);
  });
  // Slow networks load ~10 MB of art first, so only a long silence counts as a failure.
  setTimeout(function () {
    if (!started() && !document.querySelector("canvas")) show();
  }, 25000);
})();
