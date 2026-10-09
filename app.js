// Riarh Group landing page. No dependencies. Jobs: load tracking late, capture click ids, swap keyword / ad-angle
// copy, run the 6-step form, fire lead events only on a real success, sticky mobile CTA, thank-you Lead.

// ============================================================================================================
// CONFIG: every tracking id and the lead endpoint live here and nowhere else. PLACEHOLDER = not created yet;
// a placeholder tag is never loaded, and a placeholder ENDPOINT puts the form in preview mode (nothing is sent,
// no conversion fires, the thank-you page says so).
// STILL TO CREATE before launch (none of these exist yet):
//   ENDPOINT        Riarh lead pipe (web app -> lead sheet + email + CRM), returning {success, junk}; it also sends the server-side Meta Lead (CAPI)
//                   with the same event_id, fbp, fbc and user_agent this page posts.
//   GOOGLE_TAG      the Google tag id (GT-...) that loads gtag.js for the Google Ads account
//   GA4             Riarh GA4 property, web stream for the LP domain
//   ADS_CONVERSION  Riarh's own Google Ads conversion action ("AW-xxxxxxxxx/label"), primary, one per click
//   ADS_CALL_CONVERSION  optional Google Ads "phone call click" action for tel: taps
//   META_PIXEL      Riarh dataset / pixel id (Riarh ad account)
//   CLARITY         Riarh Clarity project id
// ============================================================================================================
const CONFIG = {
  ENDPOINT: "PLACEHOLDER_FORM_ENDPOINT",
  GOOGLE_TAG: "PLACEHOLDER_GOOGLE_TAG_ID",
  GA4: "PLACEHOLDER_GA4_ID",
  ADS_CONVERSION: "PLACEHOLDER_AW_ID/PLACEHOLDER_CONVERSION_LABEL",
  ADS_CALL_CONVERSION: "PLACEHOLDER_AW_ID/PLACEHOLDER_CALL_LABEL",
  META_PIXEL: "PLACEHOLDER_META_PIXEL_ID",
  CLARITY: "PLACEHOLDER_CLARITY_ID",
  TAG_DELAY_MS: 2500,  // third-party scripts wait this long after window load (keeps the first paint clean)
  PHONE: "604-652-0664"
};
const live = v => !!v && !String(v).startsWith("PLACEHOLDER");

const TRACK = ["gclid", "wbraid", "gbraid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id"];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// below-the-fold parts start in the first idle moment, so the first screen paints with the least main-thread work
const whenIdle = f => (window.requestIdleCallback || (g => setTimeout(g, 1)))(f, { timeout: 600 });

// 0. Tags. The queues exist from the first line so every call (config, PageView, form steps, Lead) is kept in
// order; only the network scripts wait for TAG_DELAY_MS after load. A submit loads them at once, so a fast lead
// never loses its conversion.
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { dataLayer.push(arguments); };
if (!window.fbq) { const n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
  window._fbq = window._fbq || n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = []; }
window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
gtag("js", new Date());
if (live(CONFIG.GOOGLE_TAG)) gtag("config", CONFIG.GOOGLE_TAG, { allow_enhanced_conversions: true });
if (live(CONFIG.GA4)) gtag("config", CONFIG.GA4);
if (live(CONFIG.META_PIXEL)) { fbq("init", CONFIG.META_PIXEL); fbq("track", "PageView"); }
let tagsLoaded = false;
function loadTags() {
  if (tagsLoaded) return; tagsLoaded = true;
  const add = src => { const s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); };
  if (live(CONFIG.GOOGLE_TAG)) add("https://www.googletagmanager.com/gtag/js?id=" + CONFIG.GOOGLE_TAG);
  if (live(CONFIG.META_PIXEL)) add("https://connect.facebook.net/en_US/fbevents.js");
  if (live(CONFIG.CLARITY)) add("https://www.clarity.ms/tag/" + CONFIG.CLARITY);
}
if (document.readyState === "complete") setTimeout(loadTags, CONFIG.TAG_DELAY_MS);
else addEventListener("load", () => setTimeout(loadTags, CONFIG.TAG_DELAY_MS));

// 1. Click identifiers, last touch wins: a visit with any click id or UTM replaces what was stored, so a Google lead
// is never credited to an older Meta click (or the reverse). Kept 90 days so a returning visitor keeps the id.
const form = $("#lead");
(function attribution() {
  const p = new URLSearchParams(location.search), DAY = 864e5;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem("riarh_attrib") || "{}"); } catch (e) {}
  if (!stored.t || Date.now() - stored.t > 90 * DAY) stored = {};
  const fresh = TRACK.some(k => p.get(k));
  const out = fresh ? { landing_url: location.href, referrer: document.referrer, t: Date.now() }
    : { landing_url: stored.landing_url || location.href, referrer: stored.referrer || document.referrer, t: stored.t || Date.now() };
  for (const k of TRACK) { const v = fresh ? p.get(k) : stored[k]; if (v) out[k] = v; }
  try { localStorage.setItem("riarh_attrib", JSON.stringify(out)); } catch (e) {}
  clarity("set", "channel", out.gclid || out.wbraid || out.gbraid || out.utm_source === "google" ? "google"
    : out.fbclid || /facebook|instagram|meta/.test(out.utm_source || "") ? "meta" : out.utm_source || "direct");
  if (out.utm_id) clarity("set", "campaign_id", out.utm_id);
  if (!form) return;
  for (const [k, v] of Object.entries(out)) {
    if (k === "t") continue;
    const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = v; form.appendChild(i);
  }
})();

// 1b. Keyword variants (one per search ad group). The default (?v=commercial or none) lives in the
// HTML, so no-JS and JS read the same words. Each variant swaps the callout, H1, hero photo, the cost question,
// and pre-selects the business type. Aliases cover the plan's retail / industrial / office links.
const IMG = n => [`assets/img/hero-${n}.webp`, `assets/img/hero-${n}-960.webp 960w, assets/img/hero-${n}.webp 1600w`, 1600, 1194];
// Each hero keeps the default's shape: a callout of 9 words or fewer naming the searched business type, an H1 of
// 8 words or fewer, and the same offer line.
const VARIANTS = {
  ti: { title: "Tenant Improvement Contractor in BC | Riarh Group",
    eyebrow: "Tenant improvements for BC <em>offices and storefronts</em>",
    h1: "Know what your office needs before you build",
    img: IMG("ti"), alt: "Reception with a marble desk at a Vancouver law firm, built by Riarh Group", cap: '<b>Law firm,</b> Vancouver<span class="cap-x"> · Office fit-out</span>',
    faq1: "How much does a tenant improvement cost?", type: "Office" },
  restaurant: { title: "Restaurant + Retail Fit-Out in BC | Riarh Group",
    eyebrow: "For BC <em>restaurant, QSR and retail store</em> fit-outs",
    h1: "Know what your restaurant needs before you build",
    img: IMG("restaurant"), alt: "Service counter and dining room at Mucho Burrito, Abbotsford, built by Riarh Group", cap: '<b>Mucho Burrito,</b> Abbotsford<span class="cap-x"> · Restaurant fit-out</span>',
    faq1: "How much does a restaurant fit-out cost?", type: "Restaurant / QSR" },
  warehouse: { title: "Warehouse + Industrial Fit-Out in BC | Riarh Group",
    eyebrow: "For BC <em>warehouse and industrial</em> fit-outs",
    h1: "Know what your warehouse needs before you build",
    img: IMG("warehouse"), alt: "Warehouse bay with a steel mezzanine at Fresh Haul Logistics, built by Riarh Group", cap: '<b>Fresh Haul Logistics,</b> Surrey and Langley<span class="cap-x"> · Warehouse build</span>',
    faq1: "How much does a warehouse fit-out cost?", type: "Warehouse / industrial" },
  daycare: { title: "Daycare Construction in BC | Riarh Group",
    eyebrow: "For BC <em>daycare and childcare centre</em> build-outs",
    h1: "Know what your daycare needs before you build",
    img: IMG("daycare"), alt: "Classroom with low tables and a reading nook at Sunshine Rain Daycare, Surrey, built by Riarh Group", cap: '<b>Sunshine Rain Daycare,</b> Surrey<span class="cap-x"> · Childcare build-out</span>',
    faq1: "How much does a daycare build-out cost?", type: "Daycare" }
};
VARIANTS.retail = { ...VARIANTS.restaurant, h1: "Know what your store needs before you build", type: "Retail store" };
VARIANTS.office = VARIANTS.ti;
VARIANTS.industrial = VARIANTS.warehouse;
// Meta angle match: the ad id arrives as utm_content; the hero continues that ad's own promise. ?a= sets an angle
// by hand. Angles: rent (lease signed), space (before you sign), type (business-type callout).
// Claims only from riarhgroup.com: free 30-minute consultation, 15+ years, 100K+ sq ft, 50+ units.
const ANGLES = {
  rent: { eyebrow: "Signed a lease for your <em>BC business space</em>?",
    h1: "Your rent has started. Plan around opening day." },
  space: { eyebrow: "Found a space for your <em>BC business</em>?",
    h1: "Know what the space needs before you sign" },
  type: { eyebrow: "Opening a BC <em>restaurant, store, office, warehouse or daycare</em>?",
    h1: 'See what your <span class="nw">fit-out</span> takes before you build' }
};
const AD_ANGLE = {};  // Meta ad id -> angle key. Empty until the Riarh ads exist.
(function angle() {
  const q = new URLSearchParams(location.search), a = ANGLES[(q.get("a") || AD_ANGLE[q.get("utm_content")] || "").toLowerCase()];
  if (!a || q.get("v") || !form) return;  // a search keyword variant (?v=) wins
  $('[data-v="eyebrow"]').innerHTML = a.eyebrow; $('[data-v="h1"]').innerHTML = a.h1;  // static strings, never user input
  document.documentElement.dataset.angle = q.get("a") || AD_ANGLE[q.get("utm_content")];
})();
(function variant() {
  const key = (new URLSearchParams(location.search).get("v") || "").toLowerCase();
  const v = VARIANTS[key]; if (!v || !form) return;
  document.title = v.title;
  document.documentElement.dataset.variant = key;
  $("#pagev").value = key;
  $('[data-v="eyebrow"]').innerHTML = v.eyebrow;
  $('[data-v="h1"]').innerHTML = v.h1;  // static strings, never user input
  $('[data-v="faq1"]').textContent = v.faq1;
  $('[data-v="cap"]').innerHTML = v.cap;
  const img = $('[data-v="img"]');
  img.src = v.img[0]; img.srcset = v.img[1]; img.width = v.img[2]; img.height = v.img[3]; img.alt = v.alt;
  const t = $(`input[name="business_type"][value="${v.type}"]`); if (t) t.checked = true;
})();

// 2. The form. One question per step; answers live in the real inputs, so Back never clears anything.
form && (function runForm() {
  const steps = $$(".step", form), bar = $("#fbar"), count = $("#fcount");
  const back = $("#fback"), next = $("#fnext"), msg = $("#fmsg");
  const SUBMIT = "Book my free fit-out review";
  let i = 0;
  const t0 = Date.now();
  const emailOk = v => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim());
  // Junk guard: North American numbers only, area code and exchange can't start with 0 or 1, no single repeated
  // digit, no toll-free codes.
  const phoneOk = v => { const d = v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) && !/^(\d)\1+$/.test(d) && !/^8(00|33|44|55|66|77|88)/.test(d); };
  function fieldOk(el) {
    if (!el.required) return true;
    if (el.type === "email") return emailOk(el.value);
    if (el.type === "tel") return phoneOk(el.value);
    return el.value.trim().length > 1;
  }
  function stepOk(s, show) {
    let first = null;
    for (const name of [...new Set($$("input[type=radio]", s).map(r => r.name))]) {
      const ok = $$(`input[name="${name}"]`, s).some(r => r.checked);
      if (show) s.classList.toggle("bad", !ok);
      if (!ok && !first) first = $(`input[name="${name}"]`, s);
    }
    for (const el of $$("input:not([type=radio]),textarea", s)) {
      const ok = fieldOk(el);
      if (show) el.closest(".field").classList.toggle("bad", !ok);
      if (!ok && !first) first = el;
    }
    if (show && first) first.focus();
    return !first;
  }
  const reached = new Set();
  const tapOnly = s => !$("input:not([type=radio]),textarea", s);
  const outsidePicked = s => !!$('input[value="Outside BC"]:checked', s);
  const answered = s => !!$("input[type=radio]:checked", s);
  // silent = the opening state on load: no focus move, no scroll, no funnel event.
  function go(n, silent = false) {
    const moved = !silent && (n !== i || n > 0);
    i = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach((s, k) => { s.hidden = k !== i; s.classList.remove("in", "bad"); });
    const s = steps[i];
    if (!silent) void s.offsetWidth;   // restart the step's settle; on load nothing forces a layout
    s.classList.add("in");
    count.textContent = `Step ${i + 1} of ${steps.length}`;
    bar.style.width = `${((i + 1) / steps.length) * 100}%`;
    back.hidden = i === 0;
    const last = i === steps.length - 1;
    next.textContent = last ? SUBMIT : "Continue";
    next.type = last ? "submit" : "button";
    // One-tap steps hide Continue until the step has an answer: a pointer tap moves on by itself, while a keyboard
    // user (or a variant that pre-ticked step 1) sees Continue and moves on with it, Enter or Space.
    next.hidden = tapOnly(s) && !answered(s);
    // Focus follows the step, so keyboard and screen-reader users land on the new question, not on <body>.
    if (moved) { const lg = $("legend", s); lg.tabIndex = -1; lg.focus({ preventScroll: true }); }
    if (!silent && n > 0) { const r = $("#start").getBoundingClientRect(); if (r.top < 0) scrollTo({ top: scrollY + r.top - 72, behavior: "smooth" }); }
    // Form funnel: once per step reached; step 2 = answered the first question = form started.
    if (!silent && n > 0 && !reached.has(i)) {
      reached.add(i);
      clarity("event", `form_step_${i + 1}`);
      if (live(CONFIG.GA4)) gtag("event", "form_progress", { send_to: CONFIG.GA4, step: i + 1 });
    }
  }

  form.addEventListener("change", e => {
    if (e.target.type !== "radio") return;
    e.target.closest(".step").classList.remove("bad");
    if (e.target.name === "region") $("#outside").hidden = !outsidePicked(steps[i]);
    // Keyboard change (or the out-of-area answer): show Continue. A pointer tap auto-advances instead, so no flash.
    if (tapOnly(steps[i]) && (!byPointer || outsidePicked(steps[i]))) next.hidden = false;
  });
  let byPointer = false;
  form.addEventListener("pointerdown", () => { byPointer = true; });
  form.addEventListener("keydown", () => { byPointer = false; }, true);
  // Auto-advance only on a real pointer tap or click of an answer (e.detail > 0). Arrow keys also fire a click on
  // radios, with detail 0: they only change the answer, never the step (WCAG 3.2.2).
  let advancing = null;
  form.addEventListener("click", e => {
    const opt = e.target.closest(".opt"); const s = steps[i];
    if (!opt || e.detail === 0 || !tapOnly(s) || i === steps.length - 1) return;
    if (opt.querySelector('input[value="Outside BC"]')) return;
    clearTimeout(advancing);
    advancing = setTimeout(() => { if (stepOk(s, false)) go(i + 1); }, 260);
  });

  // Lead grade for the caller's pre-call briefing (never shown, never used to block).
  // A: core BC region, has a space (found / signed / expanding), opening within 12 months.
  // C: outside BC, or still looking with no date. B: everything else.
  function grade(d) {
    const core = ["Metro Vancouver", "Fraser Valley", "Vancouver Island"].includes(d.region);
    const space = ["Found a space", "Lease signed", "Expanding"].includes(d.stage);
    const soon = ["Within 3 months", "3 to 6 months", "6 to 12 months"].includes(d.timeline);
    const vague = d.stage === "Looking for space" && ["12+ months", "Not sure yet"].includes(d.timeline);
    if (d.region === "Outside BC" || vague) return "C";
    if (core && space && soon) return "A";
    return "B";
  }
  form.addEventListener("focusout", e => {
    const f = e.target.closest?.(".field"); if (!f || !e.target.value) return;
    f.classList.toggle("bad", !fieldOk(e.target));
  });
  form.addEventListener("input", e => {
    const f = e.target.closest?.(".field"); if (f && f.classList.contains("bad")) f.classList.toggle("bad", !fieldOk(e.target));
  });
  form.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && i < steps.length - 1) { e.preventDefault(); next.click(); return; }
    // Space on an answer picks it and moves on (the keyboard version of a tap), except the out-of-area answer.
    if (e.key === " " && e.target.type === "radio" && tapOnly(steps[i]) && e.target.value !== "Outside BC") {
      e.preventDefault(); e.target.checked = true; e.target.dispatchEvent(new Event("change", { bubbles: true }));
      if (stepOk(steps[i], false)) go(i + 1);
    }
  });
  next.addEventListener("click", e => {
    if (next.type === "submit") return;
    // go() flips this button to type=submit on the last step; without preventDefault the same click would submit.
    e.preventDefault();
    if (stepOk(steps[i], true)) go(i + 1);
  });
  back.addEventListener("click", () => go(i - 1));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.textContent = "";
    if (!stepOk(steps[i], true)) return;
    if (form.company_url_2.value) return; // honeypot
    const data = Object.fromEntries(new FormData(form).entries());
    delete data.company_url_2;
    data.submitted_at = new Date().toISOString();
    data.seconds_on_form = Math.round((Date.now() - t0) / 1000); // under ~8 s is almost always a bot
    data.lead_grade = grade(data);
    // Meta dedup + match keys for the server-side Lead (CAPI). event_id is shared with the browser Lead.
    data.event_id = "lead_" + data.submitted_at;
    const ck = n => (document.cookie.match("(?:^|; )" + n + "=([^;]*)") || [])[1] || "";
    data.fbp = ck("_fbp");
    data.gcl_aw = ck("_gcl_aw");
    data.fbc = ck("_fbc") || (data.fbclid ? `fb.1.${Date.now()}.${data.fbclid}` : "");
    data.user_agent = navigator.userAgent;
    form.dataset.grade = data.lead_grade; // exposed for automated checks only
    // The thank-you page greets the visitor and echoes the project. sessionStorage, never the URL.
    const preview = !live(CONFIG.ENDPOINT);
    const thanks = { name: (data.full_name || "").trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}]+$/u, ""), business_type: data.business_type, stage: data.stage,
      size: data.size, timeline: data.timeline, region: data.region, preview };
    // The browser Meta Lead fires on the thank-you page (same event_id, Meta dedups against CAPI): the redirect
    // below cancels a pixel request on this page about half the time. Meta never gets a Lead
    // for a visitor Google brought, so it can't claim Google's leads.
    const fromGoogle = (data.gclid || data.wbraid || data.gbraid || data.utm_source === "google") && !data.fbclid;
    thanks.meta_eid = fromGoogle ? "" : data.event_id;
    const toThanks = () => { try { sessionStorage.setItem("riarh_thanks", JSON.stringify(thanks)); } catch (e) {} location.href = "thank-you.html"; };
    // Preview: no endpoint yet, so nothing is sent and no conversion of any kind fires.
    if (preview) { thanks.meta_eid = ""; toThanks(); return; }
    loadTags();
    next.disabled = true; next.textContent = "Sending";
    try {
      // text/plain skips the CORS preflight Apps Script can't answer; the script parses the JSON body itself.
      const r = await fetch(CONFIG.ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      const res = r.ok ? await r.json() : {};
      if (!res.success) throw new Error(r.status);
      // Junk the backend caught (fake name/number): saved for checking, never fed to Google or Meta as a conversion.
      if (res.junk) { thanks.meta_eid = ""; toThanks(); return; }
      // Lead events: only here, after the endpoint said success. Google conversion never on the thank-you load.
      clarity("event", "lead"); clarity("set", "lead_grade", data.lead_grade);
      let went = false; const go2 = () => { if (!went) { went = true; toThanks(); } };
      const digits = data.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
      gtag("set", "user_data", { email: data.email.trim().toLowerCase(), phone_number: "+1" + digits });
      if (live(CONFIG.ADS_CONVERSION)) gtag("event", "conversion", { send_to: CONFIG.ADS_CONVERSION, transaction_id: data.submitted_at, event_callback: go2 });
      if (live(CONFIG.GA4)) gtag("event", "generate_lead", { send_to: CONFIG.GA4, lead_grade: data.lead_grade, business_type: data.business_type, region: data.region });
      setTimeout(go2, 1200); // ad blockers never call back
    } catch (err) {
      msg.textContent = `That didn't send. Please try again, or call ${CONFIG.PHONE}.`;
      next.disabled = false; next.textContent = SUBMIT;
    }
  });

  // Every contextual CTA scrolls to the form and focuses the current question.
  $$("[data-goform]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    $("#start").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setTimeout(() => $("input,button", steps[i])?.focus({ preventScroll: true }), 500);
  }));

  // On a phone, a search variant that pre-ticks the business type opens on step 2 ("Where are you with the space?"),
  // so the visitor sees a question to tap, not a ticked answer with Continue below the fold. Back returns to the type.
  // Wider screens show step 1 with the type ticked and Continue beside it.
  go(answered(steps[0]) && matchMedia("(max-width:720px)").matches ? 1 : 0, true);
})();

// 2b. Phone taps are a lead path too: every tel: link reports to Clarity and GA4 (and the Ads call action once it exists).
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest('a[href^="tel:"]'); if (!a) return;
  const where = a.closest(".top") ? "header" : a.closest(".stick") ? "sticky" : a.closest(".office") ? "office" : a.closest(".final") ? "final" : a.closest(".foot") ? "footer" : "page";
  clarity("event", "tel_click"); clarity("set", "tel_from", where);
  if (live(CONFIG.GA4)) gtag("event", "click_to_call", { send_to: CONFIG.GA4, link_location: where, page: location.pathname.split("/").pop() || "index.html" });
  if (live(CONFIG.ADS_CALL_CONVERSION)) gtag("event", "conversion", { send_to: CONFIG.ADS_CALL_CONVERSION });
});

// 3. Mobile call bar (phones only, CSS): Call + Book. Shown wherever it covers nothing: it steps aside only while
// some text, CTA, chip, answer or form field (page or footer) sits in the strip at the foot of the screen it covers.
whenIdle(function sticky() {
  const bar = $("#stick");
  if (!bar) return;
  const phone = matchMedia("(max-width:720px)");
  let under = true;
  const sync = () => { const show = phone.matches && !under; bar.classList.toggle("on", show); document.body.classList.toggle("has-stick", show); };
  // Measured on the drawn text itself (each line's own box, which for display type runs past its element's box), so
  // the bar never sits on a glyph. Checked on scroll and every 0.15 s (scenes change text while they play).
  const CTRL = "a[href], button, .chip, .opt, summary, input:not([type=hidden]), textarea, [type=range]";
  const check = () => {
    if (!phone.matches) return;   // the bar is not shown on wider screens: no work
    const top = innerHeight - (bar.offsetHeight || 76);
    const hits = r => r.width > 1 && r.height > 1 && r.bottom > top && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    let hit = $$(CTRL).some(e => !e.closest(".sr, #stick, .top") && hits(e.getBoundingClientRect()));
    for (let w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), t = w.nextNode(); t && !hit; t = w.nextNode()) {
      const el = t.parentElement; if (!t.textContent.trim() || el.closest("#stick, .top, script, style")) continue;
      const pr = el.getBoundingClientRect(); if (pr.bottom < top - 80 || pr.top > innerHeight + 80) continue;
      if (el.closest(".sr, noscript, [hidden]")) continue;
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
      const rg = document.createRange(); rg.selectNodeContents(t);
      hit = [...rg.getClientRects()].some(hits);
    }
    if (hit !== under) { under = hit; sync(); }
  };
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; check(); }); } }, { passive: true });
  addEventListener("resize", check); setInterval(check, 150); check();
  // while a scene plays (motion.js sets <html data-playing>), check every frame: pins and labels move into the strip
  let looping = false;
  const loop = () => { check(); if (document.documentElement.dataset.playing) requestAnimationFrame(loop); else looping = false; };
  new MutationObserver(() => { if (!looping && document.documentElement.dataset.playing) { looping = true; requestAnimationFrame(loop); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-playing"] });
});

// 3b. Rent clock: pure arithmetic on the rent typed and the weeks set on the slider. Weekly rent = monthly x 12 / 52,
// total = weekly x weeks. Without JS the Example result and the formula line stay as the explanation.
// Input is read the way people type it: "$5,000", "5k", "4500.50", a range ("5000-6000" or "5k to 6k" uses the
// midpoint and says so). Negative, over-limit or unreadable input shows an inline message, never a silent guess.
// One calculator_used event per page view (Clarity + GA4), on the first committed value (change, not every key).
const RANGE_SEP = /\s*(?:-|\u2013|\u2014|to)\s*/i;
function readAmount(raw, { allowK = true, max, unit }) {
  const bad = allowK ? "Enter a number, like 5000 or 5k." : "Enter a number of weeks, like 6.";
  // "per month" spellings are what people type for rent; strip them before reading the number.
  const s0 = String(raw).trim().toLowerCase().replace(/\s*(?:\/\s*(?:mo|mth|month)|per\s+month|a\s+month|monthly)\.?$/, "");
  // Commas only as thousands separators ("5,500", "10,000,000"); "1,2,3" or weeks "1,5" is ambiguous, so ask.
  for (const n of s0.split(RANGE_SEP)) if (n.includes(",") && (!allowK || !/^\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?k?$/.test(n.trim()))) return { error: bad };
  const t = s0.replace(/[$,\s]/g, "").replace(/dollars?$|weeks?$|wks?$/, "");
  if (!t) return { empty: true };
  if (/^-/.test(t)) return { error: `${unit} can't be negative.` };
  const one = x => { const m = /^(\d+(?:\.\d+)?|\.\d+)(k)?$/.exec(x); if (!m || (m[2] && !allowK)) return NaN; return parseFloat(m[1]) * (m[2] ? 1000 : 1); };
  const parts = s0.replace(/[$,]/g, "").replace(/\s+/g, " ").split(RANGE_SEP).map(p => p.replace(/\s/g, ""));
  let v, note = "";
  if (parts.length === 2 && parts[0] && parts[1]) {
    const lo = one(parts[0]), hi = one(parts[1]);
    if (isNaN(lo) || isNaN(hi)) return { error: bad };
    v = (lo + hi) / 2; note = "mid";
  } else {
    v = one(t);
    if (isNaN(v)) return { error: bad };
  }
  if (v > max) return { error: `Enter ${unit === "Rent" ? "a monthly rent" : "weeks"} up to ${unit === "Rent" ? "$" : ""}${max.toLocaleString("en-CA")}.` };
  return { v, note };
}
whenIdle(function calculator() {
  const box = $("[data-calc]"); if (!box) return;
  // One source of truth: the rent field and the weeks slider. Every change recomputes the readout ("12 weeks"), the
  // weekly rent, the total and the 52-week board from those two, in any order. Each control carries its own Example
  // tag until the visitor changes it.
  const rent = $("#rent", box), rng = $("#wks-r", box), out = $("#wks-o", box), week = $("#co-week"), total = $("#co-total"), msg = $("#calc-msg");
  const exRent = $("#co-ex", box), exWks = $("#wks-ex", box);
  $("#calc-how", box).classList.add("sr");   // the formula is the no-JS fallback; with JS the result says it
  const cad = n => "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");   // en-CA grouping without loading Intl on first paint
  const nweeks = n => n + (n === 1 ? " week" : " weeks");
  const EMPTY = "Your rent here", TOTAL_HINT = "Add your monthly rent to see the total.";
  // The rent clock (motion.js) draws the 52-week board and the door from this event.
  const emit = (weeks, user) => box.dispatchEvent(new CustomEvent("calc", { detail: { weeks, example: !exWks.hidden, user } }));
  function update(user = false) {
    const r = readAmount(rent.value, { max: 10000000, unit: "Rent" }), w = +rng.value;
    msg.textContent = r.error || (r.note ? `Using ${cad(r.v)}, the middle of your range.` : "");
    out.textContent = nweeks(w); rng.setAttribute("aria-valuetext", nweeks(w));   // read out "12 weeks", not "12"
    rng.style.setProperty("--v", ((w - 1) / 51 * 100).toFixed(1) + "%");          // fills the drawn track up to the thumb
    const ok = !r.error && !r.empty && r.v >= 1;
    week.classList.toggle("is-empty", !ok);
    week.textContent = ok ? cad(r.v * 12 / 52) : EMPTY;
    total.innerHTML = ok ? `<b>${cad(r.v * 12 / 52 * w)}</b> rent paid before you open` : TOTAL_HINT;
    emit(w, user);
    return ok;
  }
  box.riarhWeeks = n => { if (!exWks.hidden) { rng.value = n; update(); } };   // the Example sweep, until the visitor moves the slider
  rent.addEventListener("input", () => { exRent.hidden = true; update(true); });
  rng.addEventListener("input", () => { exWks.hidden = true; update(true); });
  for (const el of [rent, rng]) el.addEventListener("change", () => box.dispatchEvent(new CustomEvent("calcdone")));
  rng.hidden = false; update();
  // One calculator_used event per page view (Clarity + GA4), on the first committed value of either control.
  let fired = false;
  const used = () => {
    if (fired || !update()) return; fired = true;
    clarity("event", "calculator_used");
    if (live(CONFIG.GA4)) gtag("event", "calculator_used", { send_to: CONFIG.GA4, example_rent: !exRent.hidden });
  };
  rent.addEventListener("change", used); rng.addEventListener("change", used);
});

// 4. Thank-you page: the browser Meta Lead, once per lead, with the landing page's event_id. Guarded by
// sessionStorage so a refresh or a revisit never counts it twice; empty meta_eid (Google visitor, junk,
// preview) means no Lead at all.
(function thankYouLead() {
  if (!document.body.dataset.page || document.body.dataset.page !== "thank-you") return;
  try {
    const d = JSON.parse(sessionStorage.getItem("riarh_thanks") || "{}");
    if (d.meta_eid && sessionStorage.getItem("riarh_lead_fired") !== d.meta_eid) {
      fbq("track", "Lead", {}, { eventID: d.meta_eid });
      sessionStorage.setItem("riarh_lead_fired", d.meta_eid);
    }
  } catch (e) {}
})();
