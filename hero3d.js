// Hero scene: a corner restaurant unit drawn as a blueprint fills in layer by layer (slab, framing, ducts and wiring,
// finishes, storefront and sign) and opens back into the real photo out of its lit sign, in about 5 s, holds the photo
// about 3 s and builds again. Loaded after the page has loaded (the photo is the first paint); paused while the hero is
// off screen or the tab is hidden. Every state is a function of the clock t (pose); dragging only turns the camera a little.
window.riarhHero = function (fig, btn) {
  const need = window.THREE ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.integrity = "sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu"; s.crossOrigin = "anonymous";
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return need.then(() => build(fig, btn), () => false);
};

function build(fig, btn) {
  const T = window.THREE, photo = fig.querySelector("img"), cap = fig.querySelector("figcaption"), card = document.getElementById("start");
  const ss = x => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
  fig.insertAdjacentHTML("afterbegin", '<canvas role="img" aria-label="A corner restaurant unit being built inside its blueprint: slab, framing, ducts and wiring, finishes, then the storefront and its lit sign"></canvas>');
  const canvas = fig.firstElementChild;
  // the loop runs longer than 5 s, so it has its own pause control (WCAG 2.2.2), shown while the 3D is on
  fig.insertAdjacentHTML("beforeend", '<button class="h-pause" type="button" aria-pressed="false" aria-label="Pause the build"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10"/></svg></button>');
  const pauseBtn = fig.lastElementChild;
  // no usable WebGL (or only with a major performance caveat): keep the photo, without Three.js logging an error
  const probe = document.createElement("canvas").getContext("webgl", { failIfMajorPerformanceCaveat: !window.__riarhSoftGL });
  if (!probe) { canvas.remove(); pauseBtn.remove(); return false; }
  const lose = probe.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();   // the probe gives its context back
  let R;   // a software-only GPU is refused on purpose and the photo stays (a CPU renderer stalls the whole page)
  try { R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, failIfMajorPerformanceCaveat: !window.__riarhSoftGL }); }   // __riarhSoftGL: set only by automated rendering checks (software GL)
  catch (e) { canvas.remove(); pauseBtn.remove(); return false; }
  // a browser can hand out a CPU renderer without the caveat flag (SwiftShader, llvmpipe): refused by name too
  const gx = R.getContext(), dbg = gx.getExtension("WEBGL_debug_renderer_info");
  if (!window.__riarhSoftGL && dbg && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gx.getParameter(dbg.UNMASKED_RENDERER_WEBGL))) { R.dispose(); canvas.remove(); pauseBtn.remove(); return false; }
  // the build strip is in the page under the photo card (all steps done at rest); the build lights it step by step
  const stepsEl = fig.parentElement.querySelector(".h-steps"), steps = [...stepsEl.children];
  fig.classList.add("is-3d");
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  scene.add(new T.HemisphereLight(0xfffaf0, 0x9c8a70, 0.56));
  const key = new T.DirectionalLight(0xffffff, 0.5); key.position.set(-6, 16, 12); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); key.shadow.bias = -0.0008; scene.add(key);
  const fill = new T.DirectionalLight(0xffe2c4, 0.2); fill.position.set(10, 6, -4); scene.add(fill);
  const warm = new T.PointLight(0xffb36b, 0, 14, 1.6); warm.position.set(0.5, 2.2, 0.8); scene.add(warm);
  const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .86, metalness: 0 }, o || {}));
  const items = [];
  const mesh = (g, mat, x, y, z) => { const m = new T.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, anchor) => { const g = new T.BoxGeometry(w, h, d);
    if (anchor === "y") g.translate(0, h / 2, 0); else if (anchor === "x") g.translate(w / 2, 0, 0); else if (anchor === "z") g.translate(0, 0, d / 2); return mesh(g, mat, x, y, z); };
  const cyl = (r, len, mat, x, y, z, axis) => { const g = new T.CylinderGeometry(r, r, len, 20);
    if (axis === "x") { g.rotateZ(Math.PI / 2); g.translate(len / 2, 0, 0); } else if (axis === "z") { g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2); } else g.translate(0, len / 2, 0);
    const m = mesh(g, mat, x, y, z); m.userData.cyl = true; return m; };
  // mode: drop (falls 2.4 into place), grow (scale y), ext (scale along an axis)
  const add = (o, a, d, mode, axis) => { items.push({ o, a, d, mode, axis, by: o.position.y }); return o; };
  box(11.8, 0.3, 8.8, M(0xd8cab1), 0, -0.15, 0).castShadow = false;
  add(box(10, 0.2, 7, M(0xb9b1a4), 0, 0, 0, "y"), 0, 0.9, "drop");                                   // slab
  const stud = M(0xbdb4a4, { metalness: .35, roughness: .5 }); let n = 0;                              // framing on the two solid walls
  for (let i = 0; i < 17; i++, n++) add(box(0.08, 3.0, 0.14, stud, -4.7 + i * 0.6, 0.2, -3.42, "y"), 1.0 + n * 0.03, 0.5, "grow");
  for (let j = 0; j < 12; j++, n++) add(box(0.14, 3.0, 0.08, stud, 4.93, 0.2, -3.1 + j * 0.6, "y"), 1.0 + n * 0.03, 0.5, "grow");
  add(box(10, 0.08, 0.16, stud, -5, 3.2, -3.42, "x"), 1.55, 0.6, "ext", "x");
  add(box(0.16, 0.08, 7, stud, 4.93, 3.2, -3.5, "z"), 1.65, 0.6, "ext", "z");
  const galv = M(0xc3c0ba, { metalness: .55, roughness: .38 });                                         // ducts, wiring, plumbing
  add(cyl(0.27, 8.8, galv, -4.4, 2.62, -1.0, "x"), 2.2, 1.1, "ext", "x");   // ducts run the whole step: something always moves
  add(cyl(0.21, 3.5, galv, 1.2, 2.62, -1.0, "z"), 2.7, 0.7, "ext", "z");
  add(box(0.62, 0.05, 0.62, M(0x2a2723), 1.2, 2.36, 2.3), 3.1, 0.3, "drop");
  add(box(0.62, 0.05, 0.62, M(0x2a2723), -2.4, 2.32, -1.0), 3.2, 0.3, "drop");
  const wire = M(0xda7734, { roughness: .5 });
  add(box(9.6, 0.06, 0.06, wire, -4.8, 3.02, -3.05, "x"), 2.3, 1.0, "ext", "x");
  add(box(0.06, 0.06, 6.6, wire, 4.55, 3.02, -3.3, "z"), 2.5, 0.9, "ext", "z");
  add(box(0.06, 1.4, 0.06, wire, 4.6, 1.62, -2.5, "y"), 2.9, 0.4, "grow");
  add(box(0.14, 0.5, 0.4, M(0x3b3833), 4.78, 1.3, -2.5, "y"), 3.05, 0.3, "drop");
  add(cyl(0.09, 2.9, M(0x6a645c, { metalness: .4, roughness: .45 }), 4.4, 0.2, -2.95, "y"), 2.45, 0.9, "grow");
  add(box(7.2, 3.0, 0.08, M(0xf3ece0), -1.4, 0.2, -3.3, "y"), 3.4, 0.7, "drop");                        // finishes (cutaway keeps framing visible)
  add(box(0.08, 3.0, 4.7, M(0xece3d4), 4.84, 0.2, 1.15, "y"), 3.5, 0.7, "drop");
  add(box(9.7, 0.04, 6.7, M(0xc6a47c, { roughness: .7 }), 0, 0.2, 0, "y"), 3.55, 0.6, "drop");
  add(box(3.6, 2.3, 0.05, M(0x8f6a49), -2.7, 0.55, -3.24, "y"), 3.7, 0.6, "drop");
  add(box(3.4, 1.02, 0.9, M(0x2a2622), -2.6, 0.24, -2.3, "y"), 3.85, 0.6, "drop");
  add(box(3.5, 0.07, 1.0, M(0xb08a5e), -2.6, 1.26, -2.3, "y"), 3.95, 0.5, "drop");
  const screens = [];
  for (let i = 0; i < 3; i++) { const sm = M(0x141312, { emissive: 0xfff0d8, emissiveIntensity: 0 }); screens.push(sm); add(box(0.95, 0.52, 0.04, sm, -3.75 + i * 1.05, 2.05, -3.2, "y"), 4.0 + i * 0.06, 0.5, "drop"); }
  const wood = M(0xb08a5e), seat = M(0x8e3424, { roughness: .55 }), dark = M(0x1b1a18);
  [[0.4, 0.6], [2.5, 0.6], [0.4, 2.3], [2.5, 2.3]].forEach(([x, z], i) => {
    const a = 4.05 + i * 0.07;
    add(box(0.08, 0.72, 0.08, dark, x, 0.24, z, "y"), a, 0.45, "drop");
    add(box(0.92, 0.05, 0.92, wood, x, 0.96, z, "y"), a + 0.03, 0.45, "drop");
    [-0.68, 0.68].forEach((dx, j) => { add(cyl(0.03, 0.46, dark, x + dx, 0.24, z, "y"), a + 0.05 + j * 0.02, 0.45, "drop"); add(cyl(0.17, 0.06, seat, x + dx, 0.68, z, "y"), a + 0.06 + j * 0.02, 0.45, "drop"); });
  });
  const bulbs = [];
  [[0.4, 0.6], [2.5, 0.6], [0.4, 2.3], [2.5, 2.3], [-2.6, -1.6]].forEach(([x, z], i) => {
    add(box(0.02, 0.75, 0.02, dark, x, 2.3, z, "y"), 4.25 + i * 0.04, 0.4, "drop");
    const bm = M(0x2a2622, { emissive: 0xffcf8a, emissiveIntensity: 0 }); bulbs.push(bm);
    add(box(0.26, 0.16, 0.26, bm, x, 2.16, z, "y"), 4.25 + i * 0.04, 0.4, "drop");
  });
  const stone = M(0x7b756d, { roughness: .95 }), mull = M(0x1b1a18, { roughness: .5, metalness: .3 }), stucco = M(0x96928b, { roughness: .95 }), canopy = M(0x26282b, { roughness: .6 });
  add(box(10, 0.35, 0.16, stone, 0, 0.2, 3.42, "y"), 4.6, 0.45, "drop");                               // storefront: stone, mullions, glass, band, canopy, sign
  add(box(0.16, 0.35, 7, stone, -4.92, 0.2, 0, "y"), 4.62, 0.45, "drop");
  for (let i = 0; i <= 8; i++) add(box(0.08, 2.1, 0.1, mull, -5 + i * 1.25, 0.55, 3.45, "y"), 4.65 + i * 0.025, 0.45, "grow");
  for (let j = 0; j <= 5; j++) add(box(0.1, 2.1, 0.08, mull, -4.95, 0.55, -3.5 + j * 1.4, "y"), 4.7 + j * 0.025, 0.45, "grow");
  [1.35, 2.0].forEach((y, i) => { add(box(10, 0.06, 0.1, mull, -5, y, 3.45, "x"), 4.85 + i * 0.05, 0.45, "ext", "x"); add(box(0.1, 0.06, 7, mull, -4.95, y, -3.5, "z"), 4.88 + i * 0.05, 0.45, "ext", "z"); });
  const glass = M(0xd9e2df, { transparent: true, opacity: .14, roughness: .08, metalness: .1, depthWrite: false });
  add(box(10, 2.1, 0.03, glass, 0, 0.55, 3.46, "y"), 4.9, 0.5, "grow").castShadow = false;
  add(box(0.03, 2.1, 7, glass, -4.96, 0.55, 0, "y"), 4.92, 0.5, "grow").castShadow = false;
  add(box(10.1, 0.72, 0.18, stucco, 0, 2.65, 3.44, "y"), 5.0, 0.4, "drop");
  add(box(0.18, 0.72, 7.1, stucco, -4.94, 2.65, 0, "y"), 5.03, 0.4, "drop");
  add(box(10.65, 0.38, 0.66, canopy, -5.45, 3.56, 3.6, "x"), 5.06, 0.45, "ext", "x");
  add(box(0.66, 0.38, 7.4, canopy, -5.12, 3.56, -3.6, "z"), 5.08, 0.45, "ext", "z");
  const signM = M(0x24201c, { emissive: 0xffb347, emissiveIntensity: 0, roughness: .4 });
  add(box(3.4, 0.44, 0.06, signM, 2.2, 2.79, 3.56, "y"), 5.12, 0.3, "drop");
  const signGlow = new T.PointLight(0xffb347, 0, 6, 2); signGlow.position.set(2.2, 2.8, 4.3); scene.add(signGlow);   // the lit sign washes the canopy and fascia
  const halo = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    r.addColorStop(0, "rgba(255,190,90,1)"); r.addColorStop(1, "rgba(255,190,90,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    sp.position.set(2.2, 3.0, 3.75); sp.scale.set(5.2, 1.7, 1); scene.add(sp); return sp; })();   // a soft bloom behind the sign bar
  const downM = M(0x2a2622, { emissive: 0xffd59a, emissiveIntensity: 0 });
  for (let i = 0; i < 8; i++) add(box(0.14, 0.03, 0.14, downM, -4.4 + i * 1.25, 3.36, 3.78, "y"), 5.15, 0.3, "drop");
  for (let j = 0; j < 5; j++) add(box(0.14, 0.03, 0.14, downM, -5.3, 3.36, -2.8 + j * 1.4, "y"), 5.15, 0.3, "drop");
  // the blueprint: every finished part drawn as charcoal edges from frame 0
  const ghostM = new T.LineBasicMaterial({ color: 0x1b1a18, transparent: true, opacity: .32 });
  items.forEach(it => { const l = new T.LineSegments(new T.EdgesGeometry(it.o.geometry, it.o.userData.cyl ? 40 : 1), ghostM); l.position.copy(it.o.position); scene.add(l); });
  const signAnchor = new T.Vector3(2.2, 3.0, 3.58);
  const hull = [];   // the finished unit's outer corners, used to fit the camera to the open area every frame
  for (const x of [-5.9, 5.3]) for (const y of [-0.3, 3.9]) for (const z of [-3.6, 4.0]) hull.push(new T.Vector3(x, y, z));
  const core = [];   // slab and framing only: the camera frames this tighter while the first three steps build
  for (const x of [-5.1, 5.1]) for (const y of [-0.2, 3.3]) for (const z of [-3.6, 3.6]) core.push(new T.Vector3(x, y, z));
  const stepT = [[0, 1.0], [1.0, 2.2], [2.2, 3.4], [3.4, 4.6], [4.6, 5.6]];
  const DUR = 8, PRE = 0.8, SPEED = 1.6;   // beats are authored on an 8 s clock and played 1.6x: about 5.5 s in all
  // PRE: the photo first closes into the sign (0.5 s, every loop), so the build starts from the same spot it ends
  const HOLD = 3;   // seconds on the real photo between builds
  let W = 1, H = 1, visTop = 0, visH = 1, yawOff = 0, curT = DUR, raf = 0, playing = false;

  // The model is framed in the part of the panel the form card does not cover (desktop: above the card).
  function size() {
    const fr = fig.getBoundingClientRect(); W = Math.max(1, fr.width); H = Math.max(1, fr.height);
    R.setSize(W, H, false);
    const cr = card.getBoundingClientRect();
    const covered = cr.left < fr.right && cr.right > fr.left && cr.top > fr.top + 40 && cr.top < fr.bottom;
    const narrow = W < 560;   // narrow cards: the short label of each step (styles.css swaps .lg for .sh), smaller
    stepsEl.classList.toggle("h-narrow", narrow); stepsEl.classList.toggle("h-two", W < 330);   // the narrowest panels: two rows
    visTop = 12; visH = Math.max(80, (covered ? cr.top - fr.top - 16 : H - 12) - visTop);   // the strip is below the card now
  }
  // where the real sign sits in the photo (hero.webp: about 70% across, 38.5% down) through object-fit:cover at
  // object-position 62% 50%, plus the photo's drawn edges, in the panel's own pixels
  function photoSign() {
    const s = Math.max(W / 1600, H / 1194), dw = 1600 * s, dh = 1194 * s, ox = (W - dw) * 0.62, oy = (H - dh) * 0.5;
    return { x: ox + 0.70 * dw, y: oy + 0.385 * dh, l: ox, r: ox + dw, t: oy, b: oy + dh };
  }
  function proj(v) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
  function pose(t) {
    curT = t; const b = Math.max(0, t);
    items.forEach(it => { const p = ss((b - it.a) / it.d), o = it.o;
      o.visible = p > 0.001;
      if (it.mode === "drop") o.position.y = it.by + 2.4 * (1 - p);
      else if (it.mode === "grow") o.scale.y = Math.max(p, 0.001);
      else if (it.axis === "x") o.scale.x = Math.max(p, .001); else o.scale.z = Math.max(p, .001); });
    ghostM.opacity = 0.32 * (1 - ss((b - 5.4) / 0.9));
    const lit = ss((b - 5.1) / 0.6);
    signM.emissiveIntensity = 1.6 * lit; signGlow.intensity = 2.2 * lit; halo.material.opacity = 0.75 * lit; downM.emissiveIntensity = 1.4 * lit; bulbs.forEach(m => m.emissiveIntensity = 1.2 * lit);
    screens.forEach(m => m.emissiveIntensity = 0.55 * ss((b - 4.6) / 0.6)); warm.intensity = 1.1 * lit;
    // the drop to the photo's eye level is spread over 1.6 s of the clock (1 s on screen), so it reads as a move, not a cut
    const az = -(52 - 12 * ss(b / 6.1) - 0.45 * b - yawOff) * Math.PI / 180, el = (38 - 30 * ss((b - 4.6) / 1.6)) * Math.PI / 180, d = 40;
    const ty = 1.5 - 1.2 * ss((b - 5.0) / 1.4);
    cam.position.set(d * Math.sin(az) * Math.cos(el), d * Math.sin(el) + ty, d * Math.cos(az) * Math.cos(el)); cam.lookAt(0, ty, 0);
    // fit: the unit fills 86% of the open area while it builds and 96% as it settles, so the reveal starts above the form
    cam.updateMatrixWorld();
    const bbox = pts => { let a = 1e9, z = -1e9, c = 1e9, d2 = -1e9; for (const v of pts) { const q = v.clone().applyMatrix4(cam.matrixWorldInverse); a = Math.min(a, q.x); z = Math.max(z, q.x); c = Math.min(c, q.y); d2 = Math.max(d2, q.y); } return [a, z, c, d2]; };
    // steps 1 to 3 frame the slab and framing (the model about 1.3x larger), easing out to the whole unit as finishes land
    const F = bbox(hull), Cr = bbox(core), kc = ss((b - 3.2) / 1.4), mix = i => Cr[i] + (F[i] - Cr[i]) * kc;
    const x0 = mix(0), x1 = mix(1), y0 = mix(2), y1 = mix(3);
    const e = ss((b - 5.4) / 1.0), fill = 0.86, rTop = visTop, rH = visH;
    const kz = Math.max((x1 - x0) / (fill * W), (y1 - y0) / (fill * rH)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const left = cx - kz * W / 2, top = cy + kz * (rTop + rH / 2);
    cam.left = left; cam.right = left + kz * W; cam.top = top; cam.bottom = top - kz * H; cam.updateProjectionMatrix();
    R.render(scene, cam);
    steps.forEach((li, i) => { li.classList.toggle("on", b >= stepT[i][0] && b < stepT[i][1]); li.classList.toggle("done", b >= stepT[i][1]); });
    // reveal: the photo is placed (scaled 1.25, shifted) so its own sign sits on the model's lit sign, opens as a circle
    // from that sign, then eases back to its resting crop by 8.0; the circle is centred on the photo's sign in the
    // photo's own coordinates, so it travels with it
    const rev = t < 0 ? ss(-t / PRE) : ss((t - 6.4) / 0.9), P = photoSign(), [sx, sy] = proj(signAnchor);
    const k2 = t < 0 ? 1 : 1 - ss((t - 6.4) / 1.6), S = 1 + 0.25 * k2, C = [W / 2, H / 2];
    const clampT = (want, lo, hi) => Math.min(hi, Math.max(lo, want));   // never pull a photo edge into the panel
    const mx = t < 0 ? 0 : clampT(sx - (C[0] + (P.x - C[0]) * S), W - (C[0] + (P.r - C[0]) * S), -(C[0] + (P.l - C[0]) * S));
    const my = t < 0 ? 0 : clampT(sy - (C[1] + (P.y - C[1]) * S), H - (C[1] + (P.b - C[1]) * S), -(C[1] + (P.t - C[1]) * S));
    photo.style.clipPath = "circle(" + (rev * 150).toFixed(2) + "% at " + (P.x / W * 100).toFixed(1) + "% " + (P.y / H * 100).toFixed(1) + "%)";
    photo.style.transform = t < 0 ? "" : "translate(" + (mx * k2).toFixed(1) + "px," + (my * k2).toFixed(1) + "px) scale(" + S.toFixed(4) + ")";
    stepsEl.classList.toggle("is-live", t >= 0 && t < 6.6);
    cap.style.visibility = t >= 0 && t < 6.9 ? "hidden" : "";
  }
  function rest() {   // the hold frame is the plain photo, exactly as the page loads
    playing = false; curT = DUR;
    photo.style.clipPath = ""; photo.style.transform = ""; cap.style.visibility = "";
    stepsEl.classList.remove("is-live"); steps.forEach(li => { li.classList.remove("on"); li.classList.add("done"); });   // back to the resting strip
    // no replay button during the hold: the loop builds again by itself
  }
  // one loop: build (t from -PRE to DUR on the 1.6x clock), then HOLD seconds on the photo, then again. The clock
  // advances by real frame time, capped at 0.1 s a frame (a stalled frame delays the build instead of skipping beats),
  // and only while the hero is on screen and the tab is shown: off screen nothing is drawn and t stands still.
  let t = -PRE, last = null, inView = true, held = false;   // held: the visitor paused it
  const tick = now => {
    raf = 0;
    if (last !== null) t += SPEED * Math.min(0.1, (now - last) / 1000);
    last = now;
    if (t >= DUR + HOLD * SPEED) t = -PRE;
    if (t < DUR) { if (!playing) { playing = true; btn.hidden = true; size(); } pose(t); }
    else if (playing) { pose(DUR); rest(); }
    run();
  };
  const run = () => { if (!raf && inView && !held && !document.hidden) raf = requestAnimationFrame(tick); };
  const pause = () => { cancelAnimationFrame(raf); raf = 0; last = null; };
  new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; if (inView) run(); else pause(); })).observe(fig);
  document.addEventListener("visibilitychange", () => document.hidden ? pause() : run());
  new ResizeObserver(() => { size(); if (playing) pose(curT); }).observe(fig);
  const hold = v => { held = v; pauseBtn.setAttribute("aria-pressed", String(v)); pauseBtn.setAttribute("aria-label", v ? "Play the build" : "Pause the build");
    pauseBtn.firstElementChild.innerHTML = v ? '<path d="M5 3l8 5-8 5z"/>' : '<path d="M5 3v10M11 3v10"/>'; if (v) pause(); else run(); };
  pauseBtn.addEventListener("click", () => hold(!held));
  btn.addEventListener("click", () => { t = -PRE; hold(false); });
  // drag to orbit while the model is on screen: clamped, eases back on release
  let drag = null, back = 0;
  canvas.addEventListener("pointerdown", e => { if (!playing) return; drag = { x: e.clientX, y0: yawOff }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => { if (drag) yawOff = Math.min(28, Math.max(-28, drag.y0 + (e.clientX - drag.x) * 0.25)); });
  const release = () => { if (!drag) return; drag = null; const from = yawOff, t0 = performance.now(); cancelAnimationFrame(back);
    const ease = now => { const p = Math.min(1, (now - t0) / 1200); yawOff = from * Math.pow(2, -10 * p) * (1 - p); if (p < 1 && !drag) back = requestAnimationFrame(ease); };
    back = requestAnimationFrame(ease); };
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);
  run();
  return true;
}
