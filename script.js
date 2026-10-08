/* =========================================================
   STEAL A NUGGET  ·  v2 site interactions
   ========================================================= */
(() => {
  "use strict";

  // block selecting text, the right-click menu and dragging images (Firefox ignores the CSS drag rule)
  document.addEventListener("selectstart", e => e.preventDefault());
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("dragstart", e => { if (e.target instanceof HTMLImageElement) e.preventDefault(); });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const RAINBOW = ["#ff4b2b", "#ffc72c", "#3fd34c", "#1ad6e8", "#a050ff", "#ff3a72"];

  /* ---------- game data (edit these to match the real game) ---------- */
  const RARITIES = [
    { id: "common",       name: "Common",       color: "#e8ad45", odds: 40   },
    { id: "uncommon",     name: "Uncommon",     color: "#3fd34c", odds: 25   },
    { id: "rare",         name: "Rare",         color: "#3483ff", odds: 15   },
    { id: "super_rare",   name: "Super Rare",   color: "#1ad6e8", odds: 9    },
    { id: "epic",         name: "Epic",         color: "#a050ff", odds: 5.5  },
    { id: "legendary",    name: "Legendary",    color: "#ff9b1c", odds: 3    },
    { id: "mythic",       name: "Mythic",       color: "#ff3a72", odds: 1.5  },
    { id: "super_mythic", name: "Super Mythic", color: "#e3112f", odds: .75  },
    { id: "prismatic",    name: "Prismatic",    color: "#ff7af5", odds: .25  },
  ];

  const MUTATIONS = {
    electric: { name: "Electric", color: "#ffe23d", img: "golden",
      desc: "Lightning cracks over the biome. Nuggets come out buzzing with static and won't stop sparking." },
    candy:    { name: "Candy",    color: "#ff7ab8", img: "candy",
      desc: "Sprinkles pour from a pink sky. Nuggets get a sugar-glass crust that crunches like hard candy." },
    frost:    { name: "Frost",    color: "#a9dcff", img: "frost",
      desc: "Snow drifts over the counters. Nuggets freeze into clear ice crystal, still crispy inside." },
    toxic:    { name: "Toxic",    color: "#a6f22a", img: "toxic",
      desc: "Green drops sizzle on the floor. Nuggets glow neon and leave a faint cloud wherever you carry them." },
    lava:     { name: "Lava",     color: "#ff5a17", img: "lava",
      desc: "Molten drops fall from a red sky. Nuggets come out cracked and glowing like they never stopped cooking." },
    chrome:   { name: "Chrome",   color: "#d9dde3", img: "godly",
      desc: "Mirror shards glint in the air. Nuggets turn polished silver and reflect the whole lane." },
    void:     { name: "Void",     color: "#7a4dff", img: "void",
      desc: "Light bends into a swirling hole. Nuggets come out deep purple, as if they swallowed the dark." },
    cosmic:   { name: "Cosmic",   color: "#c05bff", img: "cosmic",
      desc: "Shooting stars streak across the biome. Nuggets fill with a tiny galaxy that slowly turns." },
  };
  const MUTATION_CHANCE = 0.12; // demo value

  /* =========================================================
     SOUND (generated with Web Audio, only after a click)
     ========================================================= */
  const Sound = (() => {
    let ctx = null, on = true;
    try { if (localStorage.getItem("san-sound") === "off") on = false; } catch (e) { /* storage blocked */ }
    const ac = () => {
      if (!on) return null;
      try {
        if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
        if (ctx.state === "suspended") ctx.resume();
      } catch (e) { return null; }
      return ctx;
    };
    function tone(f, dur, { type = "sine", vol = .12, when = 0, to = null } = {}) {
      const c = ac(); if (!c) return;
      const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
    }
    function noise(dur, { vol = .06, hp = 2000, when = 0, crackle = .03 } = {}) {
      const c = ac(); if (!c) return;
      const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < crackle ? 1 : .25);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
      const g = c.createGain(), t = c.currentTime + when, a = Math.min(.12, dur / 4);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a);
      g.gain.setValueAtTime(vol, t + dur - a); g.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(f).connect(g).connect(c.destination); src.start(t); src.stop(t + dur + .05);
    }
    const semi = (root, s) => root * Math.pow(2, s / 12);
    return {
      get on() { return on; },
      toggle() { on = !on; try { localStorage.setItem("san-sound", on ? "on" : "off"); } catch (e) { /* ignore */ } return on; },
      sizzle(d) { noise(d, { vol: .07, hp: 2500, crackle: .045 }); },
      pop(tier = 0) { tone(semi(380, tier), .16, { to: semi(900, tier), vol: .1 }); },
      swoosh() { noise(.28, { vol: .05, hp: 600, crackle: .01 }); },
      reveal(tier) {
        const root = semi(330, tier);
        [0, 4, 7, 12].forEach((s, i) => tone(semi(root, s), .42, { type: "triangle", vol: .1, when: i * .07 }));
        if (tier >= 6) [12, 16, 19, 24].forEach((s, i) => tone(semi(root, s), .7, { type: "sine", vol: .07, when: .32 + i * .06 }));
      },
      hit(crit) { tone(crit ? 230 : 160, .16, { type: "square", vol: .06, to: 60 }); noise(.08, { vol: .12, hp: 900, crackle: .2 }); },
      win() { [0, 4, 7, 12, 16].forEach((s, i) => tone(semi(523, s), .45, { type: "triangle", vol: .1, when: i * .09 })); },
      fuse() {
        tone(200, 1.3, { type: "sawtooth", vol: .035, to: 1200 });
        [0, 7, 12].forEach((s, i) => tone(semi(660, s), .5, { type: "triangle", vol: .1, when: 1.35 + i * .08 }));
      },
      unlock() { tone(880, .12, { type: "triangle", vol: .08 }); tone(1320, .2, { type: "triangle", vol: .08, when: .08 }); },
    };
  })();

  const soundBtn = $("#soundBtn");
  function syncSoundBtn() {
    if (!soundBtn) return;
    soundBtn.setAttribute("aria-pressed", Sound.on ? "true" : "false");
    soundBtn.setAttribute("aria-label", Sound.on ? "Sound effects on" : "Sound effects off");
  }
  soundBtn?.addEventListener("click", () => { Sound.toggle(); syncSoundBtn(); Sound.pop(4); });
  syncSoundBtn();

  /* =========================================================
     SMALL HELPERS
     ========================================================= */
  const fxLayer = document.createElement("div");
  fxLayer.className = "fx-layer"; fxLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(fxLayer);
  function crumbs(x, y, colors, n = 14, spread = 130) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("span");
      c.className = "crumb";
      const ang = rand(0, Math.PI * 2), dist = rand(spread * .3, spread);
      c.style.left = x + "px"; c.style.top = y + "px";
      c.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      c.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      c.style.setProperty("--rot", rand(-360, 360) + "deg");
      c.style.setProperty("--c", colors[i % colors.length]);
      fxLayer.appendChild(c);
      c.addEventListener("animationend", () => c.remove());
    }
  }
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  /* ---------- word split for scroll-driven headline reveals ---------- */
  $$(".split").forEach(el => {
    let wi = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          // keep punctuation glued to the word before it ("rains," / "distracted.")
          const glueMatch = n.textContent.match(/^[^\s]+/), prev = n.previousSibling;
          if (glueMatch && prev && prev.nodeType === 1 && prev.tagName !== "BR") {
            const glue = document.createElement("span");
            glue.className = "nw";
            node.insertBefore(glue, prev);
            glue.appendChild(prev);
            glue.appendChild(document.createTextNode(glueMatch[0]));
            n.textContent = n.textContent.slice(glueMatch[0].length);
          }
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement("span");
            s.className = "w"; s.style.setProperty("--wi", wi++); s.textContent = p;
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
  });

  /* ---------- count-up stats ---------- */
  if (!reduceMotion) {
    $$("[data-count]").forEach(el => {
      const end = +el.dataset.count, suf = el.dataset.suffix || "";
      const t0 = performance.now() + 1150;
      el.textContent = "0" + suf;
      const step = now => {
        const p = Math.min(1, Math.max(0, (now - t0) / 900));
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* =========================================================
     NAV: scroll progress, active link, sliding blob
     ========================================================= */
  const meter = $("#fryMeter");
  const navLinks = $$("#navLinks a");
  const blob = $("#navBlob");
  const sections = navLinks.map(a => $(a.getAttribute("href")));
  let activeLink = null, hoveringNav = false;
  function moveBlob(a) {
    if (!blob) return;
    if (!a) { blob.style.opacity = "0"; return; }
    blob.style.opacity = "1";
    blob.style.width = a.offsetWidth + "px";
    blob.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  navLinks.forEach(a => a.addEventListener("pointerenter", () => { hoveringNav = true; moveBlob(a); }));
  $("#navLinks")?.addEventListener("pointerleave", () => { hoveringNav = false; moveBlob(activeLink); });

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement;
      meter.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
      let current = -1;
      sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < window.innerHeight * .4) current = i; });
      navLinks.forEach((a, i) => a.classList.toggle("active", i === current));
      activeLink = navLinks[current] || null;
      if (!hoveringNav) moveBlob(activeLink);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- custom cursor ring ---------- */
  const cur = $("#cursor");
  if (cur && canHover && !reduceMotion) {
    const ring = $(".cur-ring", cur), dot = $(".cur-dot", cur);
    let x = -100, y = -100, rx = -100, ry = -100;
    window.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      cur.classList.remove("off");
      const hot = e.target.closest && e.target.closest("a, button, .hcard, .mut-card, .nugget3d, [role=tab]");
      cur.classList.toggle("hot", !!hot);
    }, { passive: true });
    window.addEventListener("pointerdown", () => cur.classList.add("down"));
    window.addEventListener("pointerup", () => cur.classList.remove("down"));
    document.documentElement.addEventListener("mouseleave", () => cur.classList.add("off"));
    (function loop() {
      rx += (x - rx) * .2; ry += (y - ry) * .2;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    })();
  } else if (cur) cur.remove();

  /* ---------- magnetic buttons ---------- */
  if (!reduceMotion && canHover) {
    $$(".magnetic").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--tx", `${(e.clientX - r.left - r.width / 2) * .2}px`);
        btn.style.setProperty("--ty", `${(e.clientY - r.top - r.height / 2) * .3}px`);
      });
      btn.addEventListener("pointerleave", () => { btn.style.setProperty("--tx", "0px"); btn.style.setProperty("--ty", "0px"); });
    });
  }

  /* =========================================================
     HERO: background oil bubbles
     ========================================================= */
  (function heroCanvas() {
    const cv = $("#heroCanvas"); if (!cv) return;
    const ctx = cv.getContext("2d");
    let w, h, parts = [];
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, canHover ? 2 : 1.5);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function make(initial) {
      const bubble = Math.random() < .6;
      return {
        bubble, x: rand(0, w), y: initial ? rand(0, h) : (bubble ? h + 20 : -20),
        r: bubble ? rand(2, 9) : rand(2, 5), vy: bubble ? rand(-.3, -1.1) : rand(.4, 1.2),
        vx: rand(-.2, .2), a: rand(.15, .5), rot: rand(0, 6), vr: rand(-.03, .03),
        hue: Math.random() < .5 ? "255,199,44" : "255,140,40",
      };
    }
    size();
    parts = Array.from({ length: Math.round(Math.min(70, w / 16)) }, () => make(true));
    window.addEventListener("resize", size);
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.bubble) {
          p.x += Math.sin(p.y * .02) * .3;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${p.hue},${p.a})`; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .25, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,240,210,${p.a})`; ctx.fill();
        } else {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(${p.hue},${p.a})`;
          ctx.fillRect(-p.r, -p.r * .7, p.r * 2, p.r * 1.4);
          ctx.restore();
        }
        if (p.y < -30 || p.y > h + 30) Object.assign(p, make(false));
      }
    }
    function loop() { if (visible) draw(); requestAnimationFrame(loop); }
    if (reduceMotion) draw(); else loop();
  })();

  /* =========================================================
     HERO: 3D low-poly nugget (three.js)
     ========================================================= */
  (function hero3D() {
    const wrap = $("#heroVisual"), cv = $("#nugget3d");
    if (!wrap || !cv || !window.THREE) return;
    const T = window.THREE;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, canHover ? 2 : 1.5));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, 1, .1, 100);
    camera.position.set(0, 1.2, 8.4);
    camera.lookAt(0, -.15, 0);

    // a tiny light studio baked into an environment map, so the facets sparkle
    const pmrem = new T.PMREMGenerator(renderer);
    const env = new T.Scene();
    env.add(new T.Mesh(new T.SphereGeometry(20, 16, 8), new T.MeshBasicMaterial({ color: 0x1a0d06, side: T.BackSide })));
    const panel = (hex, k, pos, w, h) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(hex).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(0xfff1d6, 5, [0, 7, 3], 8, 2.5);
    panel(0xffb347, 3.5, [-7, 1.5, 2], 2.5, 6);
    panel(0xff5a2b, 2.5, [7, -1, 1], 2.5, 5);
    panel(0x9cc4ff, 1.6, [0, -3, -7], 9, 2);
    panel(0xffffff, 6, [3, 3, 7], 1.6, 1.6);
    scene.environment = pmrem.fromScene(env, .03).texture;

    // nugget geometry: a squircle blob, flattened, lumpy, with a notch
    const geo = (() => {
      const g = new T.SphereGeometry(1, 30, 20);
      const p = g.attributes.position, v = new T.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = 3.2;
        const s = Math.pow(Math.pow(Math.abs(v.x), n) + Math.pow(Math.abs(v.y), n) + Math.pow(Math.abs(v.z), n), -1 / n);
        let x = v.x * s * 1.5, y = v.y * s * .6, z = v.z * s * 1.05;
        const lump = 1 + .07 * Math.sin(v.x * 6.1 + 1.7) * Math.sin(v.z * 5.3 + .4) + .05 * Math.sin(v.y * 7 + v.x * 4.2) + .035 * Math.sin(v.z * 11 + v.x * 3);
        x *= lump; y *= lump; z *= lump;
        z -= .24 * Math.exp(-Math.pow((x - .2) * 1.6, 2)) * Math.max(0, v.z);
        y *= 1 + .12 * (x / 1.5);
        p.setXYZ(i, x, y, z);
      }
      g.computeVertexNormals();
      const ng = g.toNonIndexed();
      ng.setAttribute("color", new T.BufferAttribute(new Float32Array(ng.attributes.position.count * 3), 3));
      return ng;
    })();
    const faces = geo.attributes.position.count / 3;
    const shade = new Float32Array(faces), hueBase = new Float32Array(faces);
    {
      const pos = geo.attributes.position;
      for (let f = 0; f < faces; f++) {
        shade[f] = .78 + Math.random() * .3;
        const i = f * 3;
        const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
        const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
        const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
        hueBase[f] = Math.atan2(cz, cx) / (Math.PI * 2) + .5 + cx * .12 + cy * .5;
      }
    }
    const colAttr = geo.attributes.color, tmp = new T.Color();
    function paint(prism, time) {
      for (let f = 0; f < faces; f++) {
        if (prism) {
          tmp.setHSL((((hueBase[f] + time * .08) % 1) + 1) % 1, .95, .58).convertSRGBToLinear().multiplyScalar(shade[f]);
        } else tmp.setRGB(shade[f], shade[f], shade[f]);
        const i = f * 3;
        colAttr.setXYZ(i, tmp.r, tmp.g, tmp.b); colAttr.setXYZ(i + 1, tmp.r, tmp.g, tmp.b); colAttr.setXYZ(i + 2, tmp.r, tmp.g, tmp.b);
      }
      colAttr.needsUpdate = true;
    }

    const mat = new T.MeshPhysicalMaterial({
      color: 0xffffff, vertexColors: true, flatShading: true,
      roughness: .3, metalness: .1, clearcoat: 1, clearcoatRoughness: .15, envMapIntensity: 1.3,
    });
    const group = new T.Group();
    group.add(new T.Mesh(geo, mat));
    scene.add(group);

    scene.add(new T.AmbientLight(0xffe6c0, .25));
    const key = new T.DirectionalLight(0xfff1d6, 1.6); key.position.set(3, 5, 4); scene.add(key);
    const rim = new T.PointLight(0xff7af5, 2.4, 20); rim.position.set(-3.5, 1.5, -3); scene.add(rim);
    const under = new T.PointLight(0xff8a2a, 1.4, 12); under.position.set(0, -3, 2); scene.add(under);

    // sparkles
    const starTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.18, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      x.fillStyle = "#fff";
      x.beginPath(); x.moveTo(32, 0); x.quadraticCurveTo(35, 29, 64, 32); x.quadraticCurveTo(35, 35, 32, 64);
      x.quadraticCurveTo(29, 35, 0, 32); x.quadraticCurveTo(29, 29, 32, 0); x.fill();
      return new T.CanvasTexture(c);
    })();
    const sparkleGroup = new T.Group(); scene.add(sparkleGroup);
    const sparkles = [];
    for (let i = 0; i < 24; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: starTex, color: 0xffffff, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      const a = Math.random() * Math.PI * 2, r = 1.8 + Math.random() * 1.1;
      s.position.set(Math.cos(a) * r, (Math.random() - .35) * 1.9, Math.sin(a) * r * .75);
      s.userData = { ph: Math.random() * 6.28, sp: .8 + Math.random() * 1.6, base: .2 + Math.random() * .3 };
      sparkleGroup.add(s); sparkles.push(s);
    }

    // per-rarity look
    const LOOK = {
      common:       { c: "#d9982c", r: .78, m: 0,   cc: 0, e: "#000000", rim: "#ffb347" },
      uncommon:     { c: "#2fcf3e", r: .2,  m: .15, cc: 1, e: "#0b4a12", rim: "#8dff7a" },
      rare:         { c: "#2b63ff", r: .16, m: .2,  cc: 1, e: "#0a1d6e", rim: "#7fb0ff" },
      super_rare:   { c: "#18cfe8", r: .14, m: .2,  cc: 1, e: "#04505a", rim: "#a5f6ff" },
      epic:         { c: "#9040ff", r: .14, m: .25, cc: 1, e: "#2e0a78", rim: "#d1a8ff" },
      legendary:    { c: "#ff8d14", r: .18, m: .35, cc: 1, e: "#6a2400", rim: "#ffd27a" },
      mythic:       { c: "#ff2f6a", r: .14, m: .25, cc: 1, e: "#6a0020", rim: "#ff9cbc" },
      super_mythic: { c: "#d60f2c", r: .12, m: .3,  cc: 1, e: "#5a000e", rim: "#ff6a6a" },
      prismatic:    { c: "#ffffff", r: .1,  m: .15, cc: 1, e: "#1a0a26", rim: "#ff7af5", prism: true },
    };
    const targetCol = new T.Color(), targetEm = new T.Color(), WHITE = new T.Color(1, 1, 1);
    let curIdx = RARITIES.length - 1, prism = true;
    const label = $("#hvLabel"), nameEl = $("#hvName"), tierEl = $("#hvTier");
    function apply(idx, instant) {
      const r = RARITIES[idx], L = LOOK[r.id];
      prism = !!L.prism;
      targetCol.set(L.c).convertSRGBToLinear();
      targetEm.set(L.e).convertSRGBToLinear();
      mat.roughness = L.r; mat.metalness = L.m; mat.clearcoat = L.cc;
      rim.color.set(L.rim);
      sparkles.forEach(s => s.material.color.set(prism ? "#ffffff" : L.rim));
      if (!prism) paint(false, 0);
      if (instant) { mat.color.copy(targetCol); mat.emissive.copy(targetEm); }
      wrap.style.setProperty("--hv", r.color);
      wrap.classList.toggle("is-prism", prism);
      nameEl.textContent = r.name;
      tierEl.textContent = `Tier ${idx + 1} / 9`;
      restart(label, "swap");
    }
    apply(curIdx, true);
    paint(true, 0);

    // motion state
    const baseSpin = reduceMotion ? 0 : .007;
    let rotY = -.6, rotVel = baseSpin, spinBoost = 0, tiltX = 0, tiltY = 0, mx = 0, my = 0;
    let dropY = reduceMotion ? 0 : 3.2, dropV = 0, landed = reduceMotion, splashed = false;
    let sq = 0, sqV = 0, flash = 0, idle = 0, t = 0;
    let dragging = false, lastX = 0, dragDist = 0;

    function reroll(user) {
      curIdx = (curIdx + 1) % RARITIES.length;
      spinBoost = .45; flash = 1; sq = .28; sqV = 0;
      apply(curIdx);
      if (user) Sound.pop(curIdx);
      if (!reduceMotion) {
        const r = cv.getBoundingClientRect();
        const c = RARITIES[curIdx].id === "prismatic" ? RAINBOW : [RARITIES[curIdx].color, "#fff0d4"];
        crumbs(r.left + r.width / 2, r.top + r.height * .45, c, 16, r.width * .4);
      }
    }
    function splash() {
      splashed = true;
      const ped = $("#pedestal");
      restart(ped, "splash");
      const r = ped.getBoundingClientRect();
      crumbs(r.left + r.width / 2, r.top + r.height / 2, ["#ffc72c", "#ff8a2a", "#fff0d4"], 20, 160);
    }

    cv.tabIndex = 0;
    cv.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; dragDist = 0; try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } });
    cv.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX; dragDist += Math.abs(dx);
      rotY += dx * .012; rotVel = dx * .004; idle = 0;
    });
    cv.addEventListener("pointerup", () => { if (dragging && dragDist < 6) reroll(true); dragging = false; idle = 0; });
    cv.addEventListener("pointercancel", () => { dragging = false; });
    cv.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reroll(true); idle = 0; } });
    if (canHover) window.addEventListener("pointermove", e => { mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; }, { passive: true });

    function resize() {
      const w = Math.max(1, wrap.clientWidth);
      renderer.setSize(w, w, false);
      camera.aspect = 1; camera.updateProjectionMatrix();
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap); else window.addEventListener("resize", resize);

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);
    const clock = new T.Clock();

    function frame() {
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), .1);
      if (!visible) return;
      const k = dt * 60; t += dt;

      if (!landed) {
        dropV -= .02 * k; dropY += dropV * k;
        if (dropY <= 0) {
          dropY = 0;
          if (!splashed) splash();
          if (Math.abs(dropV) < .06) { landed = true; dropV = 0; }
          else { sq = Math.min(.35, Math.abs(dropV) * 1.6); sqV = 0; dropV = -dropV * .32; }
        }
      }
      if (!dragging) rotVel += (baseSpin - rotVel) * .03 * k;
      rotY += (rotVel + spinBoost) * k;
      spinBoost *= Math.pow(.92, k);
      tiltX += (my * .45 - tiltX) * .06 * k;
      tiltY += (mx * .7 - tiltY) * .06 * k;
      sqV += -sq * .28 * k; sqV *= Math.pow(.8, k); sq += sqV * k;
      flash *= Math.pow(.9, k);

      group.position.y = dropY + (landed && !reduceMotion ? Math.sin(t * 1.6) * .09 : 0);
      group.rotation.set(.38 + tiltX, rotY + tiltY, .1 + (reduceMotion ? 0 : Math.sin(t * .9) * .05));
      group.scale.set(1 + sq * .55, 1 - sq, 1 + sq * .55);

      const lerpK = 1 - Math.pow(.86, k);
      mat.color.lerp(targetCol, lerpK);
      mat.emissive.copy(targetEm).lerp(WHITE, flash * .6);
      if (prism) paint(true, t);

      sparkleGroup.rotation.y = t * .15;
      const tierBoost = 1 + curIdx / 9;
      for (const s of sparkles) {
        const u = s.userData, tw = Math.max(0, Math.sin(t * u.sp + u.ph));
        s.scale.setScalar(u.base * tw * tw * tw * tierBoost + .001);
      }

      if (landed && !reduceMotion && !dragging) { idle += dt; if (idle > 3.6) { idle = 0; reroll(false); } }
      renderer.render(scene, camera);
    }
    frame();
    wrap.classList.add("has-3d");
  })();

  /* =========================================================
     HOW: income ticker
     ========================================================= */
  const cash = $("#cashTick");
  if (cash) {
    let v = 0;
    if (reduceMotion) cash.textContent = "$1,250";
    else setInterval(() => { v += Math.round(rand(3, 17)); cash.textContent = "$" + v.toLocaleString("en-US"); }, 450);
  }

  /* ---------- steps swipe row (phones): dots follow the scroll ---------- */
  (function stepDots() {
    const row = $(".steps"), dots = $$("#stepDots button");
    if (!row || !dots.length) return;
    const steps = $$(".step", row);
    let raf = 0;
    const sync = () => {
      raf = 0;
      const mid = row.scrollLeft + row.clientWidth / 2;
      let best = 0, bestD = Infinity;
      steps.forEach((s, i) => { const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
      dots.forEach((d, i) => d.classList.toggle("on", i === best));
    };
    row.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });
    dots.forEach((d, i) => d.addEventListener("click", () => {
      const s = steps[i];
      row.scrollTo({ left: s.offsetLeft - (row.clientWidth - s.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
    }));
  })();

  /* =========================================================
     FRYER
     ========================================================= */
  const fryBtn = $("#fryBtn"), fryer = $("#fryerBox"), result = $("#result"), burst = $("#burst");
  const oilTemp = $("#oilTemp"), pullCount = $("#pullCount"), bestPull = $("#bestPull"), history = $("#history");
  const pullFlash = $("#pullFlash"), pullFlashText = $("#pullFlashText");
  let pulls = 0, best = -1;

  const total = RARITIES.reduce((s, r) => s + r.odds, 0);
  const oddsBar = $("#oddsBar");
  if (oddsBar) {
    RARITIES.forEach(r => {
      const s = document.createElement("span");
      s.style.width = (r.odds / total * 100) + "%";
      s.style.setProperty("--c", r.color);
      s.title = `${r.name}: ${r.odds}%`;
      oddsBar.appendChild(s);
    });
    const legend = document.createElement("ul");
    legend.className = "odds-legend";
    legend.innerHTML = RARITIES.map(r => `<li style="--c:${r.color}">${r.name} ${r.odds}%</li>`).join("");
    oddsBar.after(legend);
  }

  function roll() {
    let n = Math.random() * total;
    for (const r of RARITIES) { n -= r.odds; if (n <= 0) return r; }
    return RARITIES[0];
  }

  function setResult(r, mutKey) {
    const tier = RARITIES.indexOf(r) + 1;
    result.dataset.rarity = r.id;
    result.style.setProperty("--rc", r.color);
    $("#resultImg").src = `${r.id}.webp`;
    $("#resultImg").alt = `${r.name} nugget`;
    $("#resultName").textContent = r.name;
    $("#resultTier").textContent = `Tier ${tier} / 9`;
    $("#resultStars").innerHTML = RARITIES.map((_, i) => `<i class="${i < tier ? "" : "off"}" style="animation-delay:${.4 + i * .05}s"></i>`).join("");
    const mut = $("#resultMut");
    if (mutKey) {
      const m = MUTATIONS[mutKey];
      mut.hidden = false; mut.textContent = m.name;
      mut.style.setProperty("--mc", m.color);
      mut.style.animation = "none"; void mut.offsetWidth; mut.style.animation = "";
    } else mut.hidden = true;
  }

  function doBurst(color, big, prismatic) {
    if (reduceMotion) return;
    burst.innerHTML = "";
    const n = big ? 30 : 16;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.style.setProperty("--r", (360 / n * i + rand(-8, 8)) + "deg");
      p.style.setProperty("--dist", (big ? rand(-280, -190) : rand(-190, -130)) + "px");
      p.style.setProperty("--c", prismatic ? RAINBOW[i % RAINBOW.length] : (i % 3 === 0 ? "#fff0d4" : color));
      p.style.animationDelay = rand(0, .1) + "s";
      burst.appendChild(p);
    }
  }

  function bigPull(r) {
    if (reduceMotion || !pullFlash) return;
    pullFlash.style.setProperty("--pf", r.color);
    pullFlash.classList.toggle("prism", r.id === "prismatic");
    pullFlashText.textContent = r.name + "!";
    restart(pullFlash, "on");
  }

  fryBtn?.addEventListener("click", () => {
    // on phones the result card sits below the fryer: bring it into view
    const rr = result.getBoundingClientRect();
    if (rr.top < 70 || rr.bottom > window.innerHeight) {
      result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
    fryBtn.disabled = true;
    fryBtn.textContent = "Frying…";
    fryer.classList.add("frying");
    result.classList.remove("flipped");
    result.classList.add("flipping");
    const wait = reduceMotion ? 200 : 1700;
    Sound.sizzle(wait / 1000);

    const tempI = setInterval(() => { oilTemp.textContent = 180 + Math.round(rand(-6, 14)); }, 120);
    const r = roll();
    const mutKey = Math.random() < MUTATION_CHANCE ? Object.keys(MUTATIONS)[Math.floor(Math.random() * 8)] : null;

    setTimeout(() => {
      clearInterval(tempI); oilTemp.textContent = 180;
      fryer.classList.remove("frying");
      setResult(r, mutKey);
      result.classList.remove("flipping");
      result.classList.add("flipped");
      const tier = RARITIES.indexOf(r);
      doBurst(r.color, tier >= 6, r.id === "prismatic");
      Sound.reveal(tier);
      if (tier >= 6) { bigPull(r); if (!reduceMotion) restart(result, "shake"); }

      pulls++; pullCount.textContent = pulls;
      if (tier > best) { best = tier; bestPull.textContent = r.name; bestPull.style.color = r.color; }
      const empty = $(".empty", history); if (empty) empty.remove();
      const li = document.createElement("li");
      li.style.setProperty("--rc", r.color);
      li.title = r.name + (mutKey ? ` · ${MUTATIONS[mutKey].name}` : "");
      li.innerHTML = `<img src="${r.id}.webp" alt="${li.title}">`;
      history.prepend(li);
      while (history.children.length > 8) history.lastElementChild.remove();

      fryBtn.disabled = false;
      fryBtn.textContent = "Fry another";
    }, wait);
  });

  /* =========================================================
     RARITIES: holo cards
     ========================================================= */
  $$(".hcard").forEach((c, i) => {
    const gems = $(".hc-gems", c);
    if (gems) gems.innerHTML = Array.from({ length: 9 }, (_, k) => `<i class="${k <= i ? "" : "off"}"></i>`).join("");
  });
  // tilt + glare that follows the mouse (rarity cards and the mutation card)
  if (canHover && !reduceMotion) $$(".hcard, .mut-card").forEach(c => {
    c.addEventListener("pointermove", e => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--ry", `${(x - .5) * 22}deg`);
      c.style.setProperty("--rx", `${(.5 - y) * 20}deg`);
      c.style.setProperty("--px", `${x * 100}%`);
      c.style.setProperty("--py", `${y * 100}%`);
    });
    c.addEventListener("pointerleave", () => {
      c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg");
      c.style.setProperty("--px", "50%"); c.style.setProperty("--py", "50%");
    });
  });

  /* =========================================================
     RAINS: tabs + particle weather
     ========================================================= */
  const rainsSec = $("#rains"), rainCv = $("#rainCanvas");
  let rainType = "lava";

  // preload every mutation image so switching never flashes the previous one
  const mutImages = {};
  Object.entries(MUTATIONS).forEach(([k, m]) => { const im = new Image(); im.src = `${m.img}.webp`; mutImages[k] = im; });
  let rainToken = 0;

  function setRain(key, focus) {
    const m = MUTATIONS[key]; if (!m) return;
    $$("#rainTabs button").forEach(b => {
      const on = b.dataset.rain === key;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    const tabRow = $("#rainTabs"), sel = $(`#rainTabs [data-rain="${key}"]`);
    if (tabRow && sel && tabRow.scrollWidth > tabRow.clientWidth + 2) {
      tabRow.scrollTo({ left: sel.offsetLeft - (tabRow.clientWidth - sel.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
    }
    const token = ++rainToken;
    const pre = mutImages[key];
    const ready = pre.complete && pre.naturalWidth ? Promise.resolve()
      : (pre.decode ? pre.decode() : new Promise(res => { pre.onload = pre.onerror = res; })).catch(() => {});
    ready.then(() => {
      if (token !== rainToken) return; // a newer tab was clicked meanwhile
      const img = $("#rainImg"), name = $("#rainName");
      rainType = key;
      rainsSec.dataset.rain = key;
      img.src = pre.src; img.alt = `${m.name} mutation nugget`;
      $("#rainTitle").textContent = `${m.name} Rain`;
      name.textContent = `${m.name} Mutation`;
      $("#rainDesc").textContent = m.desc;
      [img, name].forEach(el => restart(el, "swap"));
      resetRain();
    });
  }
  const tabs = $$("#rainTabs button");
  tabs.forEach((b, i) => {
    b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1;
    b.addEventListener("click", () => { setRain(b.dataset.rain); Sound.swoosh(); });
    b.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      setRain(n.dataset.rain, true);
    });
  });

  let rctx, rw, rh, drops = [], flashA = 0, rainVisible = false;
  function sizeRain() {
    const dpr = Math.min(window.devicePixelRatio || 1, canHover ? 2 : 1.5);
    rw = rainCv.clientWidth; rh = rainCv.clientHeight;
    rainCv.width = rw * dpr; rainCv.height = rh * dpr; rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function makeDrop(initial) {
    const t = rainType;
    const d = { x: rand(0, rw), y: initial ? rand(0, rh) : rand(-60, -10), s: rand(.6, 1.4), rot: rand(0, 6.28), vr: rand(-.05, .05), tw: rand(0, 6.28) };
    if (t === "lava") Object.assign(d, { vy: rand(3, 6), vx: rand(-.4, .4), r: rand(2.5, 6) });
    if (t === "frost") Object.assign(d, { vy: rand(.6, 1.6), vx: rand(-.5, .5), r: rand(3, 8) });
    if (t === "candy") Object.assign(d, { vy: rand(2, 4), vx: rand(-.6, .6), r: rand(3, 6), c: ["#ff7ab8", "#ffe36e", "#7fe7ff", "#ffffff", "#b38cff"][Math.floor(rand(0, 5))] });
    if (t === "toxic") Object.assign(d, { vy: rand(3, 6), vx: 0, r: rand(2, 4.5) });
    if (t === "electric") Object.assign(d, { vy: rand(6, 11), vx: rand(-1, 1), r: rand(1, 2) });
    if (t === "chrome") Object.assign(d, { vy: rand(4, 8), vx: rand(1.5, 3), r: rand(6, 16) });
    if (t === "void") { const a = rand(0, 6.28), dist = initial ? rand(40, Math.max(rw, rh) * .6) : Math.max(rw, rh) * .6; Object.assign(d, { a, dist, r: rand(1.5, 4), vy: 0, vx: 0 }); }
    if (t === "cosmic") Object.assign(d, { vy: 0, vx: 0, r: rand(.8, 2.6), y: rand(0, rh), shoot: Math.random() < .04 });
    return d;
  }
  function resetRain() {
    if (!rctx) return;
    const count = { lava: 90, frost: 110, candy: 120, toxic: 120, electric: 140, chrome: 60, void: 160, cosmic: 160 }[rainType];
    const scale = Math.min(1, rw / 1100) * .7 + .3;
    drops = Array.from({ length: Math.round(count * scale) }, () => makeDrop(true));
    if (reduceMotion) drawRain();
  }
  function drawBolt(ctx, x, a) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,250,200,${a})`; ctx.lineWidth = 3; ctx.shadowColor = "#ffe23d"; ctx.shadowBlur = 20;
    ctx.beginPath(); let y = 0; ctx.moveTo(x, y);
    while (y < rh * .7) { y += rand(20, 50); x += rand(-30, 30); ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  function drawRain() {
    const t = rainType, ctx = rctx;
    ctx.clearRect(0, 0, rw, rh);
    if (t === "electric") {
      if (Math.random() < .012) flashA = 1;
      if (flashA > 0) {
        ctx.fillStyle = `rgba(255,240,140,${flashA * .18})`; ctx.fillRect(0, 0, rw, rh);
        drawBolt(ctx, rand(rw * .1, rw * .9), flashA);
        flashA -= .08;
      }
    }
    for (const d of drops) {
      d.tw += .05; d.rot += d.vr;
      if (t === "void") {
        d.a += .012 * (300 / (d.dist + 60)); d.dist -= 1.1 + 120 / (d.dist + 20);
        d.x = rw / 2 + Math.cos(d.a) * d.dist; d.y = rh / 2 + Math.sin(d.a) * d.dist * .6;
        if (d.dist < 8) Object.assign(d, makeDrop(false));
        ctx.fillStyle = Math.random() < .5 ? "rgba(122,77,255,.8)" : "rgba(200,170,255,.7)";
        ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(.1, d.r * Math.min(1, d.dist / 120)), 0, 6.28); ctx.fill();
        continue;
      }
      if (t === "cosmic") {
        const a = .4 + Math.sin(d.tw * 2) * .4;
        ctx.fillStyle = `rgba(255,240,255,${a})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.28); ctx.fill();
        if (d.shoot) {
          d.x += 9; d.y += 4;
          const g = ctx.createLinearGradient(d.x - 90, d.y - 40, d.x, d.y);
          g.addColorStop(0, "rgba(192,91,255,0)"); g.addColorStop(1, "rgba(255,230,255,.9)");
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x - 90, d.y - 40); ctx.lineTo(d.x, d.y); ctx.stroke();
          if (d.x > rw + 100 || d.y > rh + 50) Object.assign(d, { x: rand(-200, rw * .6), y: rand(-50, rh * .4), shoot: Math.random() < .5 });
        } else if (Math.random() < .0004) d.shoot = true;
        continue;
      }
      d.x += d.vx; d.y += d.vy;
      if (t === "frost") d.x += Math.sin(d.tw) * .6;
      ctx.save(); ctx.translate(d.x, d.y);
      if (t === "lava") {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, d.r * 2.2);
        g.addColorStop(0, "rgba(255,230,120,1)"); g.addColorStop(.4, "rgba(255,90,23,.9)"); g.addColorStop(1, "rgba(255,40,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, d.r * 2.2, 0, 6.28); ctx.fill();
        ctx.strokeStyle = "rgba(255,90,23,.35)"; ctx.lineWidth = d.r; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, -d.r * 5); ctx.lineTo(0, 0); ctx.stroke();
      } else if (t === "frost") {
        ctx.rotate(d.rot); ctx.strokeStyle = "rgba(220,240,255,.85)"; ctx.lineWidth = 1.4;
        for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, d.r); ctx.moveTo(0, d.r * .6); ctx.lineTo(d.r * .25, d.r * .8); ctx.stroke(); }
      } else if (t === "candy") {
        ctx.rotate(d.rot); ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.arc(-d.r * .65, 0, d.r * .35, Math.PI / 2, Math.PI * 1.5); ctx.arc(d.r * .65, 0, d.r * .35, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
      } else if (t === "toxic") {
        ctx.fillStyle = "rgba(166,242,42,.85)";
        ctx.beginPath(); ctx.moveTo(0, -d.r * 2.4); ctx.quadraticCurveTo(d.r, -d.r * .2, d.r, d.r * .3); ctx.arc(0, d.r * .3, d.r, 0, Math.PI); ctx.quadraticCurveTo(-d.r, -d.r * .2, 0, -d.r * 2.4); ctx.fill();
      } else if (t === "electric") {
        ctx.strokeStyle = "rgba(255,226,61,.75)"; ctx.lineWidth = d.r;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-d.vx * 3, -d.vy * 3); ctx.stroke();
      } else if (t === "chrome") {
        ctx.rotate(-.5);
        const g = ctx.createLinearGradient(-d.r, 0, d.r, 0);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, `rgba(240,244,250,${.5 + Math.sin(d.tw * 3) * .4})`); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(-d.r, -1, d.r * 2, 2); ctx.fillRect(-1, -d.r * .4, 2, d.r * .8);
      }
      ctx.restore();
      if (d.y > rh + 40 || d.x > rw + 60 || d.x < -60) Object.assign(d, makeDrop(false));
    }
    if (t === "void") {
      const g = ctx.createRadialGradient(rw / 2, rh / 2, 0, rw / 2, rh / 2, 120);
      g.addColorStop(0, "rgba(0,0,0,.9)"); g.addColorStop(.5, "rgba(60,20,140,.25)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(rw / 2, rh / 2, 120, 0, 6.28); ctx.fill();
    }
  }
  if (rainCv) {
    rctx = rainCv.getContext("2d");
    sizeRain(); resetRain();
    window.addEventListener("resize", () => { sizeRain(); resetRain(); });
    new IntersectionObserver(([e]) => { rainVisible = e.isIntersecting; }).observe(rainsSec);
    if (!reduceMotion) (function loop() { if (rainVisible) drawRain(); requestAnimationFrame(loop); })();
    else drawRain();
  }

  /* =========================================================
     TREADMILL / SPEED GATES
     ========================================================= */
  const trainBtn = $("#trainBtn"), speedVal = $("#speedVal"), needle = $("#needle"), gFill = $("#gaugeFill");
  const tread = $("#treadmill"), gates = $$("#gates li");
  const BASE = 16, MAX = 120;
  let speed = BASE, holding = false;
  function renderSpeed() {
    const p = speed / MAX;
    speedVal.textContent = Math.round(speed);
    needle.style.transform = `rotate(${-90 + p * 180}deg)`;
    gFill.style.strokeDashoffset = 283 - 283 * p;
    gFill.style.stroke = p > .8 ? "var(--ketchup)" : "var(--mustard)";
    tread.style.setProperty("--spd", p.toFixed(3));
    tread.classList.toggle("fast", p > .45);
    gates.forEach(g => {
      const open = speed >= +g.dataset.min;
      if (open && !g.classList.contains("open")) {
        g.classList.add("open", "just");
        if (holding) Sound.unlock();
        setTimeout(() => g.classList.remove("just"), 700);
      }
      if (!open) g.classList.remove("open");
    });
  }
  function trainLoop() {
    if (holding) speed = Math.min(MAX, speed + .45);
    renderSpeed();
    if (holding) requestAnimationFrame(trainLoop);
  }
  const startTrain = e => { e.preventDefault(); if (holding) return; holding = true; trainBtn.classList.add("held"); trainLoop(); };
  const stopTrain = () => { holding = false; trainBtn.classList.remove("held"); };
  trainBtn?.addEventListener("pointerdown", startTrain);
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => trainBtn?.addEventListener(ev, stopTrain));
  trainBtn?.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) startTrain(e); });
  trainBtn?.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") stopTrain(); });
  $("#trainReset")?.addEventListener("click", () => { speed = BASE; renderSpeed(); });
  if (speedVal) renderSpeed();

  /* =========================================================
     PETS: fuse machine
     ========================================================= */
  const fuse = $("#fuse"), fuseBtn = $("#fuseBtn");
  fuseBtn?.addEventListener("click", () => {
    fuse.classList.remove("go", "done"); void fuse.offsetWidth;
    fuseBtn.disabled = true;
    fuse.classList.add("go");
    Sound.fuse();
    setTimeout(() => {
      fuse.classList.remove("go"); fuse.classList.add("done");
      const r = $(".fm-window", fuse).getBoundingClientRect();
      crumbs(r.left + r.width / 2, r.top + r.height * .6, ["#a050ff", "#ffc72c", "#fff0d4"], 22, 160);
      fuseBtn.disabled = false; fuseBtn.textContent = "Fuse again";
    }, reduceMotion ? 50 : 2300);
  });

  /* =========================================================
     BOSSES: rotation timer + click-to-attack mini game
     Bosses swap every 4 hours, anchored to midnight UTC:
     00–04 Nugget King, 04–08 Lava Dragon, 08–12 Nugget King, …
     Change ANCHOR_UTC_HOUR if the real rotation starts at another hour.
     ========================================================= */
  const ANCHOR_UTC_HOUR = 0, BLOCK = 4 * 3600 * 1000;
  const bossTimer = $("#bossTimer"), king = $("#bossKing"), dragon = $("#bossDragon");
  function tickBoss() {
    const now = Date.now() - ANCHOR_UTC_HOUR * 3600 * 1000;
    const idx = Math.floor(now / BLOCK), left = BLOCK - (now % BLOCK);
    const live = idx % 2 === 0 ? king : dragon, other = live === king ? dragon : king;
    live.classList.add("live"); other.classList.remove("live");
    $(".boss-state", live).textContent = "Live now";
    $(".boss-state", other).textContent = "Up next";
    const s = Math.floor(left / 1000);
    bossTimer.textContent = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, "0")).join(":");
  }
  if (bossTimer) { tickBoss(); setInterval(tickBoss, 1000); }

  $$(".boss").forEach(b => {
    const max = +b.dataset.hp; let hp = max;
    const n = $(".hp-n", b), art = $(".boss-art", b), win = $(".boss-win", b);
    const render = () => { b.style.setProperty("--hp", (hp / max).toFixed(4)); n.textContent = hp.toLocaleString("en-US"); };
    art.addEventListener("click", e => {
      if (hp <= 0) return;
      const crit = Math.random() < .18;
      const dmg = Math.round(rand(60, 140) * (crit ? 2.5 : 1));
      hp = Math.max(0, hp - dmg); render();
      const r = b.getBoundingClientRect();
      const ar = art.getBoundingClientRect();
      const cx = e.clientX || ar.left + ar.width / 2, cy = e.clientY || ar.top + ar.height / 2;
      const d = document.createElement("span");
      d.className = "dmg" + (crit ? " crit" : "");
      d.textContent = (crit ? "CRIT -" : "-") + dmg;
      d.style.left = (cx - r.left) + "px"; d.style.top = (cy - r.top) + "px";
      d.style.setProperty("--dx", rand(-50, 50) + "px");
      b.appendChild(d); d.addEventListener("animationend", () => d.remove());
      restart(b, "hit");
      Sound.hit(crit);
      crumbs(cx, cy, b === dragon ? ["#ff5a17", "#ffc72c"] : ["#ffc72c", "#fff0d4"], crit ? 12 : 6, crit ? 110 : 70);
      if (hp === 0) {
        setTimeout(() => {
          win.hidden = false; Sound.win();
          const wr = b.getBoundingClientRect();
          crumbs(wr.left + wr.width / 2, wr.top + wr.height / 2, RAINBOW, 30, 220);
          $(".boss-again", b).focus({ preventScroll: true });
        }, 350);
      }
    });
    $(".boss-again", b).addEventListener("click", () => { hp = max; render(); win.hidden = true; art.focus({ preventScroll: true }); });
    render();
  });

  /* ---------- dragon embers ---------- */
  (function embers() {
    const cv = $("#emberCanvas"); if (!cv || reduceMotion) return;
    const ctx = cv.getContext("2d");
    let w, h, ps = [], vis = false;
    const size = () => { const d = Math.min(window.devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); window.addEventListener("resize", size);
    const mk = init => ({ x: rand(0, w), y: init ? rand(0, h) : h + 10, vy: rand(-.6, -1.8), r: rand(1, 3), life: rand(.5, 1), ph: rand(0, 6) });
    ps = Array.from({ length: 50 }, () => mk(true));
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(cv);
    (function loop() {
      if (vis) {
        ctx.clearRect(0, 0, w, h);
        for (const p of ps) {
          p.y += p.vy; p.ph += .05; p.x += Math.sin(p.ph) * .5;
          const a = Math.max(0, p.y / h) * p.life;
          ctx.fillStyle = `rgba(255,${120 + Math.round(rand(0, 80))},40,${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
          if (p.y < -10) Object.assign(p, mk(false));
        }
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------- copyright year ---------- */
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
