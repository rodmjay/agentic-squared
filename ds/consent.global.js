(() => {
const CATEGORIES = ["measurement", "preferences", "marketing"];
const STRINGS = {
  en: {
    title: "Your cookie choices",
    body: "We only use the cookies the site needs to work. Anything optional stays off until you choose, and either choice is fine.",
    accept: "Accept all", reject: "Reject all", choices: "Choices", policy: "Cookie policy", list: "Cookie list",
    pref_title: "Cookie settings", pref_intro: "Essential cookies keep the site working. The three kinds below are off until you turn them on.",
    necessary: "Strictly necessary", necessary_desc: "Needed for the site to work, such as signing in and remembering this choice.", always_on: "Always on",
    measurement: "Measurement", measurement_desc: "Counts visits and which page version you saw, so we can improve the site. No ads, no profile of you.",
    preferences: "Preferences", preferences_desc: "Remembers settings the site picked for you, such as a form you started.",
    marketing: "Marketing", marketing_desc: "Ads and tracking across other sites. We don't use any today.",
    none: "None in use.", save: "Save choices", close: "Close",
    gpc: "Your Global Privacy Control signal is on, so we've kept these off.", gpc_honored: "Opt-out request honored",
    other_lang: "Español", no_tracking: "No tracking cookies", on: "On", off: "Off",
  },
  es: {
    title: "Sus opciones de cookies",
    body: "Solo usamos las cookies que el sitio necesita para funcionar. Todo lo opcional queda apagado hasta que usted elija, y cualquier opción está bien.",
    accept: "Aceptar todas", reject: "Rechazar todas", choices: "Opciones", policy: "Política de cookies", list: "Lista de cookies",
    pref_title: "Configuración de cookies", pref_intro: "Las cookies esenciales mantienen el sitio funcionando. Los tres tipos de abajo están apagados hasta que usted los active.",
    necessary: "Estrictamente necesarias", necessary_desc: "Necesarias para que el sitio funcione, como iniciar sesión y recordar esta elección.", always_on: "Siempre activas",
    measurement: "Medición", measurement_desc: "Cuenta las visitas y qué versión de la página vio, para mejorar el sitio. Sin anuncios y sin un perfil suyo.",
    preferences: "Preferencias", preferences_desc: "Recuerda ajustes que el sitio eligió por usted, como un formulario que empezó.",
    marketing: "Publicidad", marketing_desc: "Anuncios y seguimiento en otros sitios. Hoy no usamos ninguno.",
    none: "Ninguna en uso.", save: "Guardar opciones", close: "Cerrar",
    gpc: "Su señal de Control Global de Privacidad está activada, así que mantuvimos estas opciones apagadas.", gpc_honored: "Solicitud de exclusión respetada",
    other_lang: "English", no_tracking: "Sin cookies de seguimiento", on: "Activada", off: "Apagada",
  },
};
const COOKIE = "ds_consent", MONTHS = 12;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const langOf = (l) => ((l || document.documentElement.lang || "en").toLowerCase().startsWith("es") ? "es" : "en");
const off = () => ({ measurement: false, preferences: false, marketing: false });
const gpcOn = () => typeof navigator !== "undefined" && (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || navigator.doNotTrack === "yes");
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

function getConsent(bannerVersion) {
  try {
    const m = document.cookie.split("; ").find((r) => r.startsWith(COOKIE + "="));
    if (!m) return null;
    const v = JSON.parse(decodeURIComponent(m.slice(COOKIE.length + 1)));
    if (!v || v.v !== 2 || !v.c || Date.now() - v.t > MONTHS * 30.44 * 864e5) return null;
    if (bannerVersion != null && String(v.bv) !== String(bannerVersion)) return null;   // new category or purpose: ask again
    return v;
  } catch { return null; }
}
const hasConsent = (cat) => getConsent()?.c?.[cat] === true;
function gate(cat, fn) {
  if (hasConsent(cat)) { fn(); return; }
  const h = (e) => { if (e.detail?.[cat]) { document.removeEventListener("ds-consent", h); fn(); } };
  document.addEventListener("ds-consent", h);
}

function removeStorage(entry) {
  const n = entry.name, hit = (k) => (n.endsWith("*") ? k.startsWith(n.slice(0, -1)) : k === n);
  try {
    if (entry.store === "localStorage" || entry.store === "sessionStorage") {
      const st = window[entry.store];
      Object.keys(st).filter(hit).forEach((k) => st.removeItem(k));
    } else if (entry.store === "indexedDB") {
      indexedDB.deleteDatabase(n);
    } else {   // cookie: expire it on this host and its parent domains
      const names = document.cookie.split("; ").map((c) => c.split("=")[0]).filter(hit);
      const parts = location.hostname.split("."), hosts = [undefined];
      for (let i = 0; i < parts.length - 1; i++) hosts.push("." + parts.slice(i).join("."));
      for (const name of names) for (const d of hosts) document.cookie = `${name}=; Max-Age=0; Path=/${d ? "; Domain=" + d : ""}`;
    }
  } catch {  }
}

let inst = null;
function consent(opts = {}) {
  inst?.destroy();
  let lang = langOf(opts.lang);
  const S = () => Object.assign({}, STRINGS[lang], opts.strings?.[lang] || opts.strings);
  const registry = opts.registry || [], necessary = opts.necessary || [];
  const bv = opts.bannerVersion ?? "1";
  const optional = registry.length > 0;
  let banner = null, dlg = null, current = getConsent(bv), gpc = false;

  const apply = (c) => {
    for (const e of registry) if (!c[e.category]) removeStorage(e);         // withdrawal takes effect at once
    document.dispatchEvent(new CustomEvent("ds-consent", { detail: c }));
    opts.onConsent?.(c);
  };
  const record = (c, method) => {
    if (!opts.recordUrl) return;
    const body = JSON.stringify({ id: current.id, time: new Date(current.t).toISOString(), bannerVersion: String(bv), policyVersion: String(opts.policyVersion ?? ""),
      lang, choices: c, method, site: opts.site || location.hostname });   // no IP, no user id, no name or email
    try { if (!(navigator.sendBeacon && navigator.sendBeacon(opts.recordUrl, new Blob([body], { type: "application/json" })))) fetch(opts.recordUrl, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }); } catch {  }
  };
  const decide = (c, method) => {
    current = { v: 2, id: current?.id || uid(), t: Date.now(), bv, c, m: method };
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(current))}; Max-Age=${Math.round(MONTHS * 30.44 * 86400)}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    record(c, method); closeAll(); apply(c);
  };
  const closeAll = () => { banner?.remove(); banner = null; if (dlg) { dlg.close?.(); dlg.remove(); dlg = null; } };
  const policy = () => [opts.policyHref && `<a href="${esc(opts.policyHref)}">${esc(S().policy)}</a>`, opts.cookieListHref && `<a href="${esc(opts.cookieListHref)}">${esc(S().list)}</a>`].filter(Boolean).join(" · ");
  const langBtn = () => `<button type="button" class="ds-btn text ds-consent-lang" data-lang lang="${lang === "en" ? "es" : "en"}">${esc(S().other_lang)}</button>`;

  const showBanner = () => {
    if (banner) return;
    const s = S();
    banner = document.createElement("section");
    banner.className = "ds-consent"; banner.setAttribute("aria-label", s.title);
    banner.innerHTML = `<div class="ds-consent-text"><strong>${esc(s.title)}</strong><p>${esc(s.body)} ${policy()}</p></div>` +
      `<div class="ds-consent-actions"><button type="button" class="ds-btn tonal" data-reject>${esc(s.reject)}</button>` +
      `<button type="button" class="ds-btn tonal" data-accept>${esc(s.accept)}</button>` +
      `<button type="button" class="ds-btn outlined" data-choices>${esc(s.choices)}</button>${langBtn()}</div>`;
    document.body.appendChild(banner);
    banner.querySelector("[data-accept]").onclick = () => decide({ measurement: true, preferences: true, marketing: true }, "accept");
    banner.querySelector("[data-reject]").onclick = () => decide(off(), "reject");
    banner.querySelector("[data-choices]").onclick = openChoices;
    banner.querySelector("[data-lang]").onclick = switchLang;
  };
  const switchLang = () => { lang = lang === "en" ? "es" : "en"; opts.onLang?.(lang); const had = !!banner, hadDlg = !!dlg; closeAll(); if (hadDlg) openChoices(); else if (had) showBanner(); };
  const openChoices = () => {
    const s = S(), cur = (current || { c: off() }).c;
    dlg?.remove();
    dlg = document.createElement("dialog");
    dlg.className = "ds-dialog ds-consent-dlg"; dlg.setAttribute("aria-labelledby", "ds-consent-h");
    const row = (id) => {
      const items = registry.filter((e) => e.category === id);
      const detail = items.length ? items.map((e) => `${esc(e.name)}: ${esc(e.purpose || "")}`).join("; ") : s.none;
      return `<li><label><span class="ds-consent-t"><strong id="ds-c-${id}">${esc(s[id])}</strong><span>${esc(s[id + "_desc"])}</span><span class="ds-consent-d">${detail}</span></span>` +
        `<input type="checkbox" class="ds-switch" role="switch" data-cat="${id}" aria-labelledby="ds-c-${id}"${cur[id] ? " checked" : ""}></label></li>`;
    };
    const nec = necessary.length ? necessary.map((e) => `${esc(e.name)}: ${esc(e.purpose || "")}`).join("; ") : "";
    dlg.innerHTML = `<form method="dialog" class="ds-dialog-body"><h2 id="ds-consent-h">${esc(s.pref_title)}</h2><p>${esc(s.pref_intro)} ${policy()}</p>` +
      (gpc ? `<p class="ds-consent-gpc" role="status">${esc(s.gpc)} <strong>${esc(s.gpc_honored)}</strong></p>` : "") +
      `<ul class="ds-consent-list"><li><div class="ds-consent-row"><span class="ds-consent-t"><strong>${esc(s.necessary)}</strong><span>${esc(s.necessary_desc)}</span>${nec ? `<span class="ds-consent-d">${nec}</span>` : ""}</span><span class="ds-consent-on">${esc(s.always_on)}</span></div></li>` +
      CATEGORIES.map(row).join("") + `</ul>` +
      `<div class="ds-dialog-actions">${langBtn()}<span class="ds-consent-gap"></span><button type="button" class="ds-btn text" data-x>${esc(s.close)}</button><button type="button" class="ds-btn filled" data-save>${esc(s.save)}</button></div></form>`;
    document.body.appendChild(dlg);
    dlg.querySelector("[data-x]").onclick = () => dlg.close();
    dlg.querySelector("[data-lang]").onclick = switchLang;
    dlg.querySelector("[data-save]").onclick = () => {
      const c = off(); dlg.querySelectorAll("[data-cat]").forEach((i) => { c[i.dataset.cat] = i.checked; });
      const all = CATEGORIES.every((k) => c[k]), none = CATEGORIES.every((k) => !c[k]);
      decide(c, all ? "accept" : none ? "reject" : "custom");
    };
    dlg.addEventListener("close", () => { dlg?.remove(); dlg = null; });
    dlg.showModal();
  };

  const onClick = (e) => {
    const a = e.target.closest?.("[data-consent-open]");
    if (!a) return;
    e.preventDefault();
    if (optional) openChoices();
  };
  document.addEventListener("click", onClick);

  if (!optional) {
    document.querySelectorAll("[data-consent-open]").forEach((a) => { a.textContent = S().no_tracking; a.removeAttribute("href"); });
    opts.onConsent?.(off());
  } else if (current) {
    apply(current.c);
  } else if (gpcOn()) {
    gpc = true; decide(off(), "gpc");          // the signal is a Reject; no banner nagging, the link still opens the choices
  } else {
    apply(off());                               // nothing optional runs yet
    showBanner();
  }
  if (gpcOn()) gpc = true;
  inst = { open: openChoices, get: () => getConsent(bv), destroy: () => { document.removeEventListener("click", onClick); closeAll(); inst = null; } };
  return inst;
}

window.DSConsent = { STRINGS, CATEGORIES, consent, getConsent, hasConsent, gate };
})();
