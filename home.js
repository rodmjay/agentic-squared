// Language menu and the sign-off record's outcome buttons. Nothing here sends data anywhere.
(function () {
  var sel = document.getElementById("lang");
  if (sel) sel.addEventListener("change", function () {
    try { localStorage.setItem("ds-lang", sel.value); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.delete("lang");
    location.assign(new URL(sel.dataset.other, location.href).pathname + u.search + u.hash);
  });

  var buttons = document.querySelectorAll("[data-outcome]");
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      buttons.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      document.querySelectorAll("[data-rec]").forEach(function (r) { r.hidden = r.dataset.rec !== b.dataset.outcome; });
    });
  });
})();
