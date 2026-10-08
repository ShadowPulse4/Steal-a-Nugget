/* =========================================================
   STEAL A NUGGET · Guide page interactions
   ========================================================= */
(() => {
  "use strict";

  // block selecting text, the right-click menu and dragging images (Firefox ignores the CSS drag rule)
  document.addEventListener("selectstart", e => e.preventDefault());
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("dragstart", e => { if (e.target instanceof HTMLImageElement) e.preventDefault(); });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- reading progress + receipt table of contents ---------- */
  const meter = $("#fryMeter"), readPct = $("#readPct"), readBar = $("#readBar");
  const chapters = $$(".chapter");
  const tocLinks = $$("#toc a");
  const chipTrack = $(".toc-chips-track");
  const chips = $$(".toc-chips a");
  let lastIdx = -2, ticking = false;

  function update() {
    ticking = false;
    const h = document.documentElement;
    const p = Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
    meter.style.transform = `scaleX(${p})`;

    let idx = -1;
    chapters.forEach((c, i) => { if (c.getBoundingClientRect().top < window.innerHeight * .4) idx = i; });
    // reading % is based on how far through the chapters you are
    const first = chapters[0].getBoundingClientRect().top + window.scrollY;
    const last = chapters[chapters.length - 1];
    const end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * .6;
    const rp = Math.min(1, Math.max(0, (window.scrollY + window.innerHeight * .4 - first) / Math.max(1, end - first)));
    readPct.textContent = Math.round(rp * 100) + "%";
    readBar.style.transform = `scaleX(${rp})`;

    if (idx === lastIdx) return;
    lastIdx = idx;
    tocLinks.forEach((a, i) => { a.classList.toggle("active", i === idx); a.classList.toggle("done", i < idx); });
    chips.forEach((a, i) => a.classList.toggle("active", i === idx));
    const chip = chips[idx];
    if (chip && chipTrack && getComputedStyle(chipTrack.parentElement).display !== "none") {
      chipTrack.scrollTo({ left: chip.offsetLeft - 16, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  /* ---------- run a callback only while an element is on screen ---------- */
  function whileVisible(el, fn) {
    if (!el) return;
    let on = false, raf = 0, t0 = 0;
    const loop = now => { if (!on) return; fn((now - t0) / 1000); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on) { t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    }).observe(el);
  }

  /* ---------- plot income counter ---------- */
  const plotCash = $("#plotCash");
  if (plotCash) {
    if (reduceMotion) plotCash.textContent = "$2,400";
    else {
      let total = 0, last = 0;
      whileVisible($(".plot-demo"), t => {
        if (t - last < .12) return;
        last = t; total += 7 + Math.round(Math.random() * 9);
        plotCash.textContent = "$" + total.toLocaleString("en-US");
      });
    }
  }

  /* ---------- speed gate track ---------- */
  const track = $(".gate-track");
  if (track) {
    const gates = $$("li", track);
    const marks = [.12, .38, .64, .9];
    const setP = p => {
      track.style.setProperty("--p", p.toFixed(3));
      gates.forEach((g, i) => g.classList.toggle("open", p >= marks[i]));
    };
    if (reduceMotion) setP(1);
    else whileVisible(track, t => {
      const cyc = t % 6.5;
      setP(cyc < 5 ? cyc / 5 : 1);
    });
  }

  /* ---------- boss rotation schedule ----------
     Same rule as the home page: bosses swap every 4 hours, anchored to
     midnight UTC (00–04 Nugget King, 04–08 Lava Dragon, …).
     Change ANCHOR_UTC_HOUR if the real rotation starts at another hour. */
  const ANCHOR_UTC_HOUR = 0, BLOCK = 4 * 3600 * 1000;
  const BOSSES = [
    { name: "Nugget King", reward: "King Nugget", color: "var(--mustard)", card: $("#gbKing") },
    { name: "Lava Dragon", reward: "Dragon Nugget", color: "var(--m-lava)", card: $("#gbDragon") },
  ];
  const body = $("#schedBody");
  function renderSchedule() {
    const now = Date.now() - ANCHOR_UTC_HOUR * 3600 * 1000;
    const idx = Math.floor(now / BLOCK);
    BOSSES.forEach((b, i) => b.card && b.card.classList.toggle("live", idx % 2 === i));
    if (!body) return;
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    const rows = [];
    for (let k = 0; k < 7; k++) {
      const block = idx + k, b = BOSSES[block % 2];
      const start = new Date(block * BLOCK + ANCHOR_UTC_HOUR * 3600 * 1000);
      rows.push(`<tr class="${k === 0 ? "now" : ""}" style="--bc:${b.color}">
        <td>${fmt.format(start)}${k === 0 ? '<span class="now-pill">Now</span>' : ""}</td>
        <td><span class="boss-chip">${b.name}</span></td>
        <td>${b.reward}</td></tr>`);
    }
    body.innerHTML = rows.join("");
  }
  renderSchedule();
  setInterval(renderSchedule, 30 * 1000);

  /* ---------- copyright year ---------- */
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
