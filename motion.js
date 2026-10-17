// Riarh landing page scenes. Progressive: without this file (no JS) or under reduced motion every element is
// already in its final, readable frame (styles.css). Each scene is a pure function of its own clock, pose(t): seek any
// t and get the same frame. A scene is primed (set to its first frame) while still below the screen, plays once when a
// quarter of it is on screen (that is when it gets .in), and lands on its last frame at once if the visitor scrolls
// away mid-scene, so nothing is ever left half built. The interactive parts (offer example, rent board, office hover)
// work under reduced motion too, without animation.
// starts in the first idle moment after the page is parsed, so the first screen paints before any scene is set up
(window.requestIdleCallback || (g => setTimeout(g, 1)))(function () {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOTION = !RM && "IntersectionObserver" in window;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const k01 = x => Math.min(1, Math.max(0, x));
  const ss = x => { x = k01(x); return x * x * x * (x * (x * 6 - 15) + 10); };         // smootherstep
  const eo = x => { x = k01(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };       // expo out
  const p2o = x => { x = k01(x); return 1 - (1 - x) * (1 - x); };
  const p2i = x => { x = k01(x); return x * x; };
  const p3io = x => { x = k01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

  // clip: plays pose(t) from `from` to dur on animation frames; finish() lands on the last frame, stop() freezes.
  // While any clip plays, <html data-playing> counts them.
  const H = document.documentElement, playing = d => { const n = (+H.dataset.playing || 0) + d; if (n > 0) H.dataset.playing = n; else delete H.dataset.playing; };
  function clip(dur, pose, done, from = 0) {
    let t0 = null, raf = 0, over = false;
    playing(1);
    const end = () => { if (over) return; over = true; playing(-1); cancelAnimationFrame(raf); pose(dur); if (done) done(); };
    const step = now => { if (t0 === null) t0 = now - from * 1000; const t = Math.min(dur, (now - t0) / 1000); pose(t); if (t < dur) raf = requestAnimationFrame(step); else end(); };
    raf = requestAnimationFrame(step);
    return { finish: end, stop() { if (!over) playing(-1); over = true; cancelAnimationFrame(raf); }, get over() { return over; } };
  }
  // scene: prime 300px before it enters, play when a quarter of it is on screen (or, given `watch`, when that part is
  // almost wholly on screen between the header and the foot strip a call bar could cover), finish when it leaves.
  function scene(root, prime, play, watch) {
    if (!MOTION || !root) return;
    document.documentElement.classList.add("anim");
    let primed = false, run = null, seen = false;
    const doPrime = () => { if (!primed) { primed = true; if (prime) prime(); } };
    const pre = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { doPrime(); pre.disconnect(); } }), { rootMargin: "0px 0px 300px 0px" });
    pre.observe(root);
    const start = () => { if (root.classList.contains("in")) return; doPrime(); root.classList.add("in"); run = play && play(); };
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) seen = true;
      if (!watch && e.intersectionRatio >= 0.25) start();
      else if (!e.isIntersecting && seen && primed) { if (!run) start(); if (run && !run.over) run.finish(); }   // scrolled past: land on the last frame
    }), { threshold: [0, 0.25] }).observe(root);
    if (watch) {   // one element, or several that must all be in clear view together
      const ws = [].concat(watch), clear = new Set();
      const io = new IntersectionObserver(es => { es.forEach(e => e.intersectionRatio >= 0.9 ? clear.add(e.target) : clear.delete(e.target)); if (clear.size === ws.length) start(); },
        { threshold: [0, 0.9, 1], rootMargin: "-72px 0px -84px 0px" });
      ws.forEach(w => io.observe(w));
    }
    return { get run() { return run; }, set run(r) { run = r; } };
  }

  /* ---------- 02 Offer: the fit-out review sheet writes itself for the visitor's category (5.2 s) ---------- */
  (function offer() {
    const wrap = $(".rv-g"), sheet = $("#sheet"); if (!wrap || !sheet) return;
    // Example items per category, labelled Example on the page. Categories without their own list borrow the office one.
    const PLANS = {
      restaurant: [["What the space needs", ["Kitchen exhaust hood", "Grease interceptor"]], ["Which permits", ["Building permit", "Health authority approval"]], ["Before opening", ["Equipment list", "Sign approval"]]],
      retail: [["What the space needs", ["Storefront lighting", "Fitting rooms"]], ["Which permits", ["Building permit", "Sign permit"]], ["Before opening", ["Fixture order", "Stock delivery date"]]],
      office: [["What the space needs", ["Meeting rooms", "Data and power runs"]], ["Which permits", ["Building permit", "Electrical permit"]], ["Before opening", ["Furniture order", "Move-in weekend"]]],
      industrial: [["What the space needs", ["Loading doors", "Office block"]], ["Which permits", ["Building permit", "Fire code approval"]], ["Before opening", ["Racking layout", "Equipment power"]]],
      daycare: [["What the space needs", ["Child-height washrooms", "Outdoor play area"]], ["Which permits", ["Building permit", "Childcare licensing"]], ["Before opening", ["Room capacity plan", "Licensing inspection"]]]
    };
    const ALIAS = { coworking: "office", ti: "office" }, LABEL = { coworking: "coworking space", ti: "tenant improvement" }, HOME = "restaurant";
    const body = $("#sh-body"), ex = $("#sh-ex");
    const spin = $(".sh-spin", sheet), doc = $(".sh-doc", sheet), cta = $("#offer-cta");
    const DUR = 5.2, OUT = 0.45, T0 = 1;   // the old sheet clears, the spinner turns until T0, then the parts write in
    let type = HOME, label = HOME, E = null, run = null;
    function fill() {
      body.innerHTML = PLANS[type].map(([h, li]) => '<section class="sh-sec"><h3>' + h + "</h3><ul>" + li.map(x => '<li><svg><use href="#i-tick"/></svg><span>' + x + "</span></li>").join("") + "</ul></section>").join("");
      ex.textContent = "Example: " + label;
    }
    function setup() {   // the moving parts exist only while the scene plays
      const secs = $$(".sh-sec", body);
      const rows = secs.map((s, i) => $$("li", s).map((li, j) => { li.insertAdjacentHTML("afterbegin", '<i class="sh-sk"></i>'); const sk = li.firstElementChild;
        return { li, sk, t: $("span", li), tick: $("svg", li), at: T0 + 0.2 + i * 0.7 + j * 0.12 }; })).flat();
      E = { secs, rows };
    }
    function clean() {
      if (!E) return;
      E.rows.forEach(r => { r.sk.remove(); r.t.style.cssText = ""; r.tick.style.cssText = ""; });
      E.secs.forEach(s => s.style.removeProperty("--rule"));
      spin.setAttribute("hidden", ""); doc.removeAttribute("hidden"); cta.style.transform = ""; E = null;
    }
    const outV = t => 1 - ss(t / OUT);                                   // the filled sheet clears in 0.45 s
    const vis = (t, at, d) => t < OUT ? outV(t) : ss((t - at) / d);       // then each part returns at its own time
    function pose(t) {
      const ready = t < OUT || t >= T0;
      spin.toggleAttribute("hidden", ready); doc.toggleAttribute("hidden", !ready); spin.style.transform = "rotate(" + (t * 340).toFixed(0) + "deg)"; spin.style.transformOrigin = "50% 50%";
      E.secs.forEach((s, i) => s.style.setProperty("--rule", vis(t, T0 + 0.05 + i * 0.7, 0.45).toFixed(3)));
      E.rows.forEach(r => {
        const v = vis(t, r.at, 0.45), sk = t < OUT ? 1 - outV(t) : 1 - ss((t - r.at + 0.3) / 0.22);
        r.sk.style.transform = "scaleX(" + sk.toFixed(3) + ")";
        r.t.style.opacity = v.toFixed(3); r.t.style.transform = "translateY(" + (6 * (1 - v)).toFixed(2) + "px)";
        const k = vis(t, r.at + 0.15, 0.3); r.tick.style.opacity = k.toFixed(3); r.tick.style.transform = "scale(" + (0.5 + 0.5 * k).toFixed(3) + ")";
      });
      const rp = (t - T0 - 2.5) / 0.5; cta.style.transform = rp > 0 && rp < 1 ? "scale(" + (1 + 0.05 * Math.sin(rp * Math.PI)).toFixed(3) + ")" : "";
    }
    const play = (from = 0) => { if (run && !run.over) run.stop(); clean(); setup(); run = clip(DUR, pose, clean, from); return run; };
    // The sheet waits empty (the shell, primed below the screen) and writes itself in on arrival: a sheet someone is
    // reading is never wiped.
    const sc = scene(wrap, () => { setup(); pose(0.5); }, () => play(0.5));
    // the category comes from app.js: ?v= / ?c= on load, or the business type picked in the form
    function setType(k) {
      const l = LABEL[k] || PLANS[k] && k || HOME;   // "Other" or no category: back to the page's own example, never the last pick's
      k = PLANS[ALIAS[k] || k] ? ALIAS[k] || k : HOME; if (k === type && l === label) return;
      type = k; label = l;
      if (run && !run.over) { run.stop(); clean(); }
      fill();
      if (sc && wrap.classList.contains("in")) sc.run = play(0.5);   // replay from the shell with the new items
    }
    document.addEventListener("riarhcat", e => setType(e.detail));
    setType(document.documentElement.dataset.cat);
  })();

  /* ---------- 03 Rent clock: a shut door, a 52-week board, the visitor's own numbers (4.2 s Example sweep once) ---------- */
  (function rent() {
    const box = $("[data-calc]"), root = $(".cost-g"); if (!box || !root) return;
    const cells = $$("#r-grid i"), door = $(".r-door"), lits = $$(".r-lit"), glow = $(".r-glow"), out = $("#calc-out");
    let W = 12, demo = null, opening = null;
    // Classes are the resting truth (no JS reads the same board); while a scene plays, each cell's fill is driven
    // from the clock through --rv (rent block drop) and --sv (sales fade), so every frame is a function of t.
    const board = w => { W = Math.min(52, Math.max(0, Math.round(w))); cells.forEach((c, i) => { c.classList.toggle("r-f", i < W); c.style.removeProperty("--rv"); }); };
    const sales = q => { const f = W ? k01(q) * (52 - W + 4) : 0;   // a four-cell crossfade front, left to right
      cells.forEach((c, i) => { const j = i - W, v = j < 0 ? 0 : k01((f - j) / 4); c.classList.toggle("r-s", v >= 1); c.classList.toggle("r-o", W > 0 && j === 0 && f > 0);
        if (v > 0 && v < 1) c.style.setProperty("--sv", v.toFixed(3)); else c.style.removeProperty("--sv"); }); };
    const drop = wf => cells.forEach((c, i) => { const v = ss(wf - i); c.classList.toggle("r-f", v >= 1); if (v > 0 && v < 1) c.style.setProperty("--rv", v.toFixed(3)); else c.style.removeProperty("--rv"); });
    const doorTo = p => { door.style.transform = "scaleX(" + (1 - 0.86 * p).toFixed(3) + ") skewY(" + (-14 * p).toFixed(2) + "deg)"; lits.forEach(l => l.style.opacity = p.toFixed(3)); glow.style.opacity = p.toFixed(3); };
    const total = () => $("#co-total b");
    const rest = () => { door.style.transform = ""; lits.forEach(l => l.style.opacity = ""); glow.style.opacity = ""; const b = total(); if (b) b.style.transform = ""; };
    box.addEventListener("calc", e => {
      board(e.detail.weeks);
      if (!e.detail.user) return;
      if (demo && !demo.over) demo.stop();
      if (opening && !opening.over) opening.stop();
      doorTo(0); sales(0);
    });
    // released (slider let go, field committed): the door swings open and the rest of the year fills with sales
    box.addEventListener("calcdone", () => {
      if (!W) return;
      if (!MOTION) { rest(); sales(1); return; }
      opening = clip(1.3, t => { doorTo(eo(t / 0.7)); sales((t - 0.3) / 1); }, rest);
    });
    const example = () => !$("#wks-ex").hidden;   // the Example sweep runs until the visitor moves the slider
    let shown = 0;
    function pose(t) {
      if (!example()) return;
      const w = 2 + Math.round(10 * k01((t - 0.2) / 2.4));
      if (w !== shown && box.riarhWeeks) { shown = w; box.riarhWeeks(w); }   // text swaps only when the week changes (aria-live)
      drop(2 + 10 * k01((t - 0.2) / 2.4));   // one block per week, linear: it is time passing
      doorTo(t < 2.6 ? 0 : eo((t - 2.6) / 0.7));   // the door swings as the twelfth block lands
      const pu = (t - 2.85) / 0.4, b = total(); if (b) b.style.transform = pu > 0 && pu < 1 ? "scale(" + (1 + 0.06 * Math.sin(pu * Math.PI)).toFixed(3) + ")" : "";
      sales((t - 3.0) / 0.9);
    }
    // rests on the finished Example (12 weeks, door open) and plays on arrival like every other scene; it never
    // rests on its first frame ("2 weeks", door shut)
    scene(root, null, () => (demo = example() ? clip(4.2, pose, rest) : null));
  })();

  /* ---------- 04 Projects ----------
     Desktop with motion: the section pins under the header and scroll scrubs one centred card at a time; each card
     owns about a quarter of a screen of scroll (1.6 screens in all) and the strip follows the scroll smoothly.
     Phones, reduced motion: no pin, the native swipe row with centre snap, the next card peeking, and the rail. */
  (function projects() {
    const sec = $(".work"), view = $("#pj-view"), track = $("#pj-track"), rail = $("#pj-rail");
    if (!sec || !track) return;
    const cards = [...track.children], N = cards.length;
    const mark = i => cards.forEach((c, j) => c.classList.toggle("on", j === i));
    if (!MOTION || innerWidth < 1024 || innerHeight > innerWidth) {   // tablets and portrait screens swipe too (the pinned card left half a 768x1024 screen empty)   // swipe row: the rail and the terracotta chip follow the centred card
      sec.classList.add("is-swipe"); view.removeAttribute("data-anim");   // a native row: nothing here animates
      const near = () => { const mid = view.getBoundingClientRect().left + view.clientWidth / 2; let pick = 0, d = 1e9;
        cards.forEach((c, j) => { const r = c.getBoundingClientRect(), x = Math.abs(r.left + r.width / 2 - mid); if (x < d) { d = x; pick = j; } }); mark(pick);
        const room = view.scrollWidth - view.clientWidth; rail.style.setProperty("--p", room > 0 ? (view.scrollLeft / room).toFixed(3) : "0"); };
      let q = false; view.addEventListener("scroll", () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; near(); }); } }, { passive: true });
      near();
      // lazy images in a sideways row only load once swiped near: load the row's cards as the section comes close
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { track.querySelectorAll("img").forEach(i => i.loading = "eager"); io.disconnect(); } }, { rootMargin: "600px 0px" });
      io.observe(sec); return;
    }
    let on = false, f = 0, want = 0, raf = 0;
    const HEAD = () => $(".top").offsetHeight;
    // 0 when the pinned block reaches the header, 1 when the section's end reaches the screen's end; first and last 10% hold
    const progress = () => { const r = sec.getBoundingClientRect(), h = HEAD(), run = r.height - (innerHeight - h); return run > 0 ? k01(((h - r.top) / run - 0.1) / 0.8) : 0; };
    const target = p => { const seg = p * (N - 1), i = Math.min(Math.floor(seg), N - 2), u = seg - i; return p >= 1 ? N - 1 : i + ss((u - 0.2) / 0.6); };   // hold, glide, hold
    function draw(p) {
      const cw = Math.min(980, view.clientWidth * 0.68, (innerHeight - HEAD()) * 0.74 * 1.6);   // lead card up to 68%, photo up to 74% of the pinned screen
      track.style.setProperty("--cw", cw.toFixed(1) + "px");
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0, step = cw + gap;
      track.style.paddingInline = Math.max(0, (view.clientWidth - cw) / 2).toFixed(1) + "px";
      track.style.transform = "translateX(" + (-f * step).toFixed(1) + "px)";
      const lo = Math.min(Math.floor(f), N - 1), uu = f - lo;   // card lo is leaving, lo + 1 arriving: driven separately
      cards.forEach((c, j) => {
        let z = 0.88, dim = 0.55, cap = 0;
        // one sharp card in every frame: the incoming veil clears (0.25 to 0.5) before the outgoing one closes (0.5 to 0.75)
        // captions hand over at the same point (0.5): the outgoing one fades 0.4 to 0.5, the incoming one 0.5 to 0.65
        if (j === lo) { z = 1 - 0.16 * ss((uu - 0.1) / 0.5); dim = 0.55 * ss((uu - 0.5) / 0.25); cap = 1 - ss((uu - 0.4) / 0.1); }
        else if (j === lo + 1) { z = 0.88 + 0.12 * ss((uu - 0.4) / 0.5); dim = 0.55 * (1 - ss((uu - 0.25) / 0.25)); cap = ss((uu - 0.5) / 0.15); }
        c.style.transform = z === 1 ? "" : "scale(" + z.toFixed(3) + ")";
        c.style.setProperty("--dim", dim.toFixed(3));
        const fc = c.querySelector("figcaption");   // off-centre captions are hidden, never half-clipped at the edge
        fc.style.visibility = cap <= 0.001 ? "hidden" : ""; fc.style.opacity = cap > 0.001 && cap < 0.999 ? cap.toFixed(3) : "";
      });
      cards.forEach((c, j) => c.classList.toggle("on", Math.abs(f - j) < 0.2));   // terracotta scope chip only while a card holds
      rail.style.setProperty("--p", p.toFixed(3));
    }
    // smooth scrub: the strip eases toward the scroll position (a third of the way per frame), never jumps
    const loop = () => { const p = progress(); want = target(p); f += (want - f) * 0.33; if (Math.abs(want - f) < 0.002) f = want; draw(p); raf = Math.abs(want - f) > 0 ? requestAnimationFrame(loop) : 0; };
    const ask = () => { if (on && !raf) raf = requestAnimationFrame(loop); };
    scene(view, () => {
      on = true; sec.classList.add("is-scrub");
      track.querySelectorAll("img").forEach(i => i.loading = "eager");   // cards slide in sideways: lazy loading would never see them
      f = want = target(progress()); draw(progress());
      addEventListener("scroll", ask, { passive: true }); addEventListener("resize", ask);
    }, null);
  })();

  /* ---------- 05 Offices: the map leans back and two pins land, Vancouver first (2.8 s) ---------- */
  (function offices() {
    const root = $(".loc-g"), plane = $("#of-plane"); if (!root || !plane) return;
    const pins = $$(".pin", plane), bcg = $(".of-bcg", plane);
    $$(".office", root).forEach(li => {
      const p = pins[+li.dataset.pin], on = v => { li.classList.toggle("hl", v); p.classList.toggle("up", v); };
      li.addEventListener("mouseenter", () => on(true)); li.addEventListener("mouseleave", () => on(false));
      li.addEventListener("focusin", () => on(true)); li.addEventListener("focusout", () => on(false));
    });
    let rings = [];
    // the three published numbers count up as the map leans back
    const nums = $$(".nums b", root).map(b => ({ b, n: +b.dataset.n, u: b.dataset.u || "" }));
    function pose(t) {
      nums.forEach(x => { x.b.textContent = Math.round(x.n * eo(t / 1.2)) + x.u + "+"; });
      plane.style.setProperty("--tilt", (32 + 22 * p3io(t / 1.1)).toFixed(2) + "deg");
      pins.forEach((p, i) => {
        const a = 0.9 + i * 0.18, q = eo((t - a) / 0.55), lo = p2o((t - a - 0.45) / 0.3), lab = $(".pin-lab", p), sh = $(".pin-shadow", p);
        p.style.setProperty("--pv", k01((t - a) / 0.04).toFixed(3));   // appears as it starts to fall
        p.style.setProperty("--dy", (44 * (1 - q)).toFixed(2) + "px");
        p.style.setProperty("--fs", (0.3 + 0.7 * q).toFixed(3)); sh.style.opacity = (k01((t - a) / 0.08) * (0.15 + 0.85 * q)).toFixed(3);
        lab.style.opacity = lo.toFixed(3); lab.style.transform = "translateX(" + (-(1 - lo) * 6).toFixed(2) + "px)";
      });
      rings.forEach((ring, j) => { const s0 = 1.6 + j * 0.35, r = p2o((t - s0) / 0.8); ring.style.transform = "scale(" + (1 + 2.4 * r).toFixed(3) + ")"; ring.style.opacity = t < s0 ? 0 : (1 - r).toFixed(3); });
      const g = t < 1.9 ? 0 : t < 2.25 ? 0.45 * p2o((t - 1.9) / 0.35) : 0.45 * (1 - p2i((t - 2.25) / 0.45));
      bcg.style.display = g > 0.001 ? "inline" : ""; bcg.style.opacity = g.toFixed(3);
    }
    function prime() {
      plane.classList.add("is-play");
      const top = $(".pin-top", pins[0]); top.insertAdjacentHTML("afterbegin", '<span class="pin-ring"></span><span class="pin-ring"></span>'); rings = $$(".pin-ring", top);
      pose(0);
    }
    function clean() {
      plane.classList.remove("is-play"); plane.style.removeProperty("--tilt"); rings.forEach(r => r.remove()); rings = [];
      bcg.style.cssText = "";
      pins.forEach(p => { ["--pv", "--dy", "--fs"].forEach(v => p.style.removeProperty(v)); $(".pin-lab", p).style.cssText = ""; $(".pin-shadow", p).style.opacity = ""; });
    }
    scene(root, prime, () => clip(2.8, pose, clean));
  })();

  /* ---------- 06 Final call: a band of light crosses the dusk storefront and leaves it lit (2.4 s) ---------- */
  (function finale() {
    const pic = $("#pic"); if (!pic) return;
    const lay = $(".pic-lay", pic), dim = $(".pic-dim", pic), lit = $(".pic-lit", pic), band = $(".pic-band", pic), glow = $(".pic-glow", pic), cta = $(".final .acts .btn");
    const lights = () => { pic.classList.add("is-lights"); dim.hidden = false; };
    if (RM) { lights(); return; }   // reduced motion rests on the scene's last frame
    function pose(t) {
      lay.style.transform = "scale(" + (1 + 0.07 * t / 2.4).toFixed(4) + ")";          // linear push in the whole time: no frozen frame
      const m = t < 0.1 ? 92 : t > 1.6 ? 8 : 92 - 84 * (t - 0.1) / 1.5;                       // constant-speed band
      lit.style.setProperty("--m", m.toFixed(2));
      band.hidden = !(m > 9 && m < 91); band.style.setProperty("--bx", (150 - 2 * m - 11).toFixed(2));
      const g = t < 1.1 ? 0 : t < 1.45 ? 0.79 * p2o((t - 1.1) / 0.35) : t < 1.6 ? 0.79 : t < 1.78 ? 0.79 + 0.21 * p2o((t - 1.6) / 0.18)
        : t < 2.1 ? 1 - 0.16 * k01((t - 1.78) / 0.32) : 0.84 + 0.16 * k01((t - 2.1) / 0.3);
      glow.style.opacity = g.toFixed(3);
      const c = (t - 1.8) / 0.5; cta.style.transform = c > 0 && c < 1 ? "scale(" + (1 + 0.05 * Math.sin(c * Math.PI)).toFixed(3) + ")" : "";
    }
    const clean = () => { lay.style.transform = ""; lit.style.removeProperty("--m"); band.hidden = true; glow.style.opacity = ""; cta.style.transform = ""; };
    scene(pic, () => { lights(); pose(0); }, () => clip(2.4, pose, clean));
  })();

  /* ---------- Drawn scenes (fixes, timeline, not-for, next steps, P.S.): CSS keyframes in styles.css. .pre holds the
     first frame while the block is still below the screen; .in plays it on arrival. ---------- */
  $$('[data-anim="why"],[data-anim="changes"],[data-anim="notfor"],[data-anim="steps"],[data-anim="ps"]').forEach(r =>
    scene(r, () => r.classList.add("pre"), () => { r.classList.remove("pre"); return null; }));

  /* ---------- 01 Hero: the 3D build (hero3d.js + Three.js r128) plays by itself and loops ---------- */
  (function hero() {
    const fig = $("#hphoto");
    if (!MOTION || !fig) return;
    // a poster of the finished unit is the first paint; Three.js and hero3d.js load after the load event, by
    // themselves, on every device: desktop in the first idle moment (2 s at most); phones (first frame compiles slowly
    // on a phone CPU) at the first scroll or 3 s after load, whichever comes first.
    let started = false;
    const start = () => { if (started) return; started = true;
      const s = document.createElement("script"); s.src = "hero3d.js"; s.onload = () => window.riarhHero(fig); document.head.appendChild(s); };
    const go = () => {
      if (!matchMedia("(max-width:720px)").matches) return (window.requestIdleCallback || (g => setTimeout(g, 1)))(start, { timeout: 2000 });
      setTimeout(start, 3000); addEventListener("scroll", start, { once: true, passive: true });
    };
    if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true });
  })();
}, { timeout: 600 });
