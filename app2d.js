// I CAN FEEL IT · Greg Tecoz
// A light tunnel that follows the song: calm intro, hazy verse, clear chorus, open sky outro.
(() => {
"use strict";

const LINKS = {
  stream: "https://www.youtube.com/watch?v=F1qITIkNXLw",
  presave: "https://www.youtube.com/watch?v=F1qITIkNXLw"
};

// song map (seconds), from the asset sheet
const SECTIONS = [
  { name: "INTRO",  from: 0,   to: 41,  label: "0:00 – 0:41" },
  { name: "VERSE",  from: 41,  to: 80,  label: "0:41 – 1:20" },
  { name: "CHORUS", from: 80,  to: 137, label: "1:20 – 2:17" },
  { name: "OUTRO",  from: 137, to: 999, label: "2:17 – END" }
];
// lyric moments from the transcript
const LYRICS = [
  [19.3, "I CAN FEEL IT"], [24.5, "I CAN FEEL IT"], [33.0, "I CAN FEEL IT"], [38.2, "I CAN FEEL IT"],
  [41.9, "I remember times that I couldn't get it right", 1], [44.6, "Couldn't gather all my thoughts", 1],
  [46.7, "Do I fight or do I fly?", 1], [51.3, "Had to elevate my life", 1],
  [87.9, "I CAN FEEL IT"], [92.6, "I CAN FEEL IT"], [101.6, "I CAN FEEL IT"], [106.7, "I CAN FEEL IT"],
  [130.7, "I CAN FEEL IT"], [137.2, "CAN YOU FEEL IT?"], [144.4, "I CAN FEEL IT"],
  [151.7, "CAN YOU FEEL IT?"], [161.9, "CAN YOU FEEL IT?"]
];
// palettes per section (asset sheet colour reference)
const PALS = [
  ["#ff2a3a", "#ff1f8f", "#ff2bd6", "#9b3cff", "#00e5ff", "#00f0a0", "#ff7a1a", "#ffffff"],             // intro: the cover's streaks
  ["#ff1f8f", "#ff2bd6", "#9b3cff", "#00e5ff", "#00f0a0", "#9cff3c", "#ffd400", "#ff7a1a", "#ff2a3a"], // verse: the haze
  ["#ff2bd6", "#ff1f8f", "#00e5ff", "#9b3cff", "#ffffff", "#7ff9ff"],                                   // chorus: focused
  ["#ff9a3c", "#ff3d7f", "#ffd27a", "#ff2bd6", "#ffffff"]                                               // outro: warm
];
const RING = ["#ff2bd6", "#00e5ff", "#9b3cff", "#ff1f8f", "#7ff9ff"];

const $ = s => document.querySelector(s);
const app = $("#app"), cv = $("#tunnel"), mctx = cv.getContext("2d");
let ctx = mctx;
const fig = $("#fig"), ghost = fig.querySelector(".ghost"), covImg = fig.querySelector(".cov");
const POSES = {}, poseW = {};
for (const n of ["stand", "fly", "fly-a", "steer-left", "steer-right", "hit", "arms", "wave", "back"]) {
  const im = new Image(); im.src = `img/poses/${n}.png`; im.className = "pose"; im.alt = ""; im.style.opacity = 0;
  fig.insertBefore(im, ghost); POSES[n] = im; poseW[n] = 0;
}
let waveT = 0, streak = 0, lastFx = 0, lastFy = 0, lastFigH = 100;
const fx = [];
const song = $("#song"), lyricEl = $("#lyric"), flashEl = $("#flash"), sky = $("#sky");
const wave = $("#wave"), wctx = wave.getContext("2d");
$("#streamBtn").href = LINKS.stream; $("#presaveBtn").href = LINKS.presave;

// offscreen buffers: previous frame (zoom trails) and two bloom levels
const prev = document.createElement("canvas"), pctx = prev.getContext("2d");
const tr = document.createElement("canvas"), tctx = tr.getContext("2d");
const coverImg = new Image(); coverImg.src = "img/cover.jpg";
const b1 = document.createElement("canvas"), b1x = b1.getContext("2d");
const b2 = document.createElement("canvas"), b2x = b2.getContext("2d");
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 700;

let W = 0, H = 0, DPR = 1, F = 1;
function size() {
  DPR = Math.min(devicePixelRatio || 1, MOBILE ? 1.25 : 1.75);
  W = innerWidth; H = innerHeight;
  cv.width = prev.width = tr.width = Math.round(W * DPR); cv.height = prev.height = tr.height = Math.round(H * DPR);
  b1.width = Math.max(1, Math.round(W / 5)); b1.height = Math.max(1, Math.round(H / 5));
  b2.width = Math.max(1, Math.round(W / 14)); b2.height = Math.max(1, Math.round(H / 14));
  wave.width = wave.clientWidth * DPR; wave.height = wave.clientHeight * DPR;
  F = Math.min(W, H) * 0.55;
}
addEventListener("resize", size); size();

// nebula fog, painted once (the purple haze in the cover art)
const neb = document.createElement("canvas"); neb.width = neb.height = 512;
(() => {
  const g = neb.getContext("2d");
  const blobs = [["255,43,214", 0.55], ["155,60,255", 0.6], ["0,150,255", 0.45], ["255,31,90", 0.4], ["120,40,200", 0.5], ["0,229,255", 0.25]];
  for (let i = 0; i < 26; i++) {
    const [c, a] = blobs[i % blobs.length];
    const ang = Math.random() * 6.28, d = 60 + Math.random() * 190;
    const x = 256 + Math.cos(ang) * d, y = 256 + Math.sin(ang) * d, r = 50 + Math.random() * 120;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${c},${a * 0.5})`); rg.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
  }
  // fine dust baked in
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(${Math.random() < .5 ? "255,120,230" : "170,140,255"},${Math.random() * 0.5})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }
})();

// ---------- streaks ----------
const N = MOBILE ? 620 : 820, P = [];
const rnd = (a, b) => a + Math.random() * (b - a);
let pal = PALS[0];
function spawn(p, far) {
  p.a = Math.random() * Math.PI * 2;
  p.r = rnd(0.5, 3.4);
  p.z = far ? rnd(3.2, 4) : rnd(0.1, 4);
  p.w = rnd(0.5, 1.5);
  p.c = pal[(Math.random() * pal.length) | 0];
  p.hot = Math.random() < 0.18;     // a few white-hot streaks
}
for (let i = 0; i < N; i++) { const p = {}; spawn(p); P.push(p); }
// floating dust motes (particle glow)
const DUST = [];
for (let i = 0; i < 140; i++) DUST.push({ a: Math.random() * 6.28, r: rnd(0.2, 2.5), z: rnd(0.2, 4), tw: rnd(0, 6) });

// ---------- state ----------
let state = "start", last = performance.now(), T = 0;
let px = 0, pxS = 0, pxPrev = 0, tilt = 0, cam = 0;
let hitHaze = 0, haze = 0.15, speed = 0.5, clarity = 0, penalty = 0, bonus = 0, hits = 0, dodged = 0;
let rings = [], orbs = [], sparks = [], pops = [], nextOrb = 0, beatCool = 0, energyAvg = 0, flash = 0, lyricIdx = 0;
let camStart = 0, camK = 0, camE = 0;
let shake = 0, sectIdx = -1, outroK = 0, ended = false, pulse = 0, bassNow = 0, impact = 0;

// ---------- audio ----------
let actx, analyser, freq;
function initAudio() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(song);
    analyser = actx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.72;
    src.connect(analyser); analyser.connect(actx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  } catch (e) { analyser = null; }
}
const now = () => song.currentTime || 0;
const DUR = () => (isFinite(song.duration) && song.duration) || 171.5;

// ---------- input ----------
let drag = null, tapped = false;
app.addEventListener("pointerdown", e => {
  tapped = true;
  if (state !== "play" || e.target.closest("button,a")) return;
  drag = { x: e.clientX, p: px };
});
addEventListener("pointermove", e => {
  if (!drag) return;
  px = Math.max(-1, Math.min(1, drag.p + (e.clientX - drag.x) / (W * 0.32)));
});
addEventListener("pointerup", () => drag = null);
addEventListener("pointercancel", () => drag = null);
const keys = {};
addEventListener("keydown", e => { keys[e.key] = 1; if (e.key === " " && state === "start") start(); });
addEventListener("keyup", e => keys[e.key] = 0);

// ---------- flow ----------
$("#go").addEventListener("click", start);
$("#again").addEventListener("click", () => { reset(); start(); });
$("#muteBtn").addEventListener("click", e => { song.muted = !song.muted; e.currentTarget.classList.toggle("off", song.muted); });
song.addEventListener("ended", finish);

function reset() {
  px = pxS = cam = 0; hitHaze = 0; clarity = penalty = bonus = hits = dodged = 0;
  rings = []; orbs = []; sparks = []; pops = []; fx.length = 0; streak = 0; setStreak(); lyricIdx = 0; outroK = 0; ended = false; sectIdx = -1;
  sky.style.opacity = 0; song.currentTime = 0; camE = 0;
}
function start() {
  if (state === "play") return;
  initAudio(); actx && actx.resume();
  if (state === "end") song.currentTime = 0;
  song.play().catch(() => {});
  state = "play"; app.dataset.state = "play";
  // the canvas takes over from the cover in the exact same spot, then the camera swings in behind him
  // canvas draws the same cover in the same spot, so this crossfade is invisible
  $("#start").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" });
  $(".start-ui").animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(30px)" }], { duration: 500, fill: "forwards" });
  camStart = performance.now(); camK = 0;
  for (const p of P) { p.z = rnd(0.3, 4); }
  $("#hint").classList.add("on"); setTimeout(() => $("#hint").classList.remove("on"), 6500);
}
function coverRect() {
  if (W / H <= 0.75) { const s = W; return { x: 0, y: (H - s) * 0.38, s }; }
  const s = Math.min(W, H); return { x: (W - s) / 2, y: (H - s) * 0.42, s };
}
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
function finish() {
  if (ended) return; ended = true; orbs = []; sparks = []; pops = [];
  state = "end"; app.dataset.state = "end";
  const c = Math.round(clarity);
  $("#endN").textContent = c + "%";
  $("#ringFill").style.strokeDashoffset = 327 * (1 - c / 100);
  $("#endNote").textContent = c >= 95 ? "You stayed clear the whole way." : c >= 75 ? "A little haze, but you came through clear." : "The haze hit, but you kept going. That's the point.";
}

function setStreak() {
  const el = $("#streak"); if (!el) return;
  el.querySelector("b").textContent = "×" + streak;
  el.classList.toggle("on", streak >= 3);
  if (streak >= 3) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
}
function sectionAt(t) { for (let i = 0; i < SECTIONS.length; i++) if (t < SECTIONS[i].to) return i; return 3; }

// ---------- lyrics ----------
let lyricAnim;
function showLyric(txt, small) {
  lyricEl.textContent = txt; lyricEl.className = "lyric" + (small ? " small" : "");
  lyricAnim && lyricAnim.cancel();
  lyricAnim = lyricEl.animate(small
    ? [{ opacity: 0, transform: "translateY(-40%)", letterSpacing: ".2em" }, { opacity: 1, transform: "translateY(-50%)", letterSpacing: ".01em", offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0, transform: "translateY(-60%)" }]
    : [{ opacity: 0, transform: "translateY(-50%) scale(1.7)", filter: "blur(14px)" }, { opacity: 1, transform: "translateY(-50%) scale(1)", filter: "blur(0)", offset: .1 }, { opacity: 1, transform: "translateY(-50%) scale(1.03)", offset: .55 }, { opacity: 0, transform: "translateY(-50%) scale(.9)", filter: "blur(6px)" }],
    { duration: small ? 2600 : 2000, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  if (!small) lightWave();
}
function mkRing(z, big) { return { z, big, rot: Math.random() * 6.28, seg: 3 + ((Math.random() * 3) | 0), c: RING[(Math.random() * RING.length) | 0] }; }
function lightWave() {
  waveT = 1.3;
  const late = sectIdx >= 3;
  flash = Math.max(flash, late ? 0.15 : 0.3); pulse = late ? 0.5 : 0.85;
  if (!late) for (let i = 0; i < 2; i++) rings.push(mkRing(0.9 + i * 0.4, 1));
  // beat-pulse sparkles around the words + the "feel it" heart
  for (let i = 0; i < 7; i++) fx.push({ k: "star4", x: W / 2 + rnd(-W * 0.36, W * 0.36), y: H * 0.4 + rnd(-H * 0.12, H * 0.1), r: rnd(9, 20), c: ["#ff4fd8", "#ffd76a", "#b46bff", "#ffffff"][i % 4], l: 1, d: rnd(0, 0.35), vy: -10 });
  if (sectIdx >= 2) fx.push({ k: "heart", x: lastFx, y: lastFy - lastFigH * 0.9, r: 26, c: "#ff4fa8", l: 1.4, d: 0.15, vy: -55 });
  for (let i = 0; i < (late ? 0 : 18); i++) { const a = Math.random() * 6.28; sparks.push({ x: W / 2 - cam * W * 0.2, y: H * 0.44, vx: Math.cos(a) * rnd(200, 520), vy: Math.sin(a) * rnd(200, 520), l: rnd(0.5, 0.9), c: RING[i % RING.length], g: 0 }); }
}

// ---------- orbs ----------
const ORB = [
  { k: "money", c: "#ffd400", hi: "#fff3a0", lo: "#a66a00", rgb: "255,200,0" },
  { k: "cup",   c: "#c46bff", hi: "#f0c6ff", lo: "#4b108f", rgb: "180,80,255" },
  { k: "noise", c: "#3fb6ff", hi: "#c8ecff", lo: "#0a3f8f", rgb: "50,170,255" }
];
function spawnOrb() {
  const aim = Math.random() < 0.45 ? px + rnd(-0.25, 0.25) : rnd(-0.95, 0.95);
  orbs.push({ t: ORB[(Math.random() * 3) | 0], x: Math.max(-1, Math.min(1, aim)), z: 4, done: 0, hit: 0, spin: rnd(0, 6) });
}
function drawIcon(o, x, y, r) {
  ctx.save(); ctx.translate(x, y);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.shadowColor = o.t.c; ctx.shadowBlur = r * 0.5;
  if (o.t.k === "money") {
    ctx.font = `800 ${r * 1.2}px Montserrat, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const g = ctx.createLinearGradient(0, -r * .6, 0, r * .6); g.addColorStop(0, "#fffbe0"); g.addColorStop(1, "#ffc400");
    ctx.fillStyle = g; ctx.fillText("$", 0, r * 0.07);
  } else if (o.t.k === "cup") {
    const s = r * 0.52, g = ctx.createLinearGradient(0, -s, 0, s); g.addColorStop(0, "#fff2b0"); g.addColorStop(1, "#ffb800");
    ctx.fillStyle = g; ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath(); ctx.moveTo(-s * .8, -s * .8); ctx.lineTo(s * .8, -s * .8); ctx.quadraticCurveTo(s * .8, s * .3, 0, s * .45); ctx.quadraticCurveTo(-s * .8, s * .3, -s * .8, -s * .8); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * .85, -s * .35, s * .35, Math.PI * .5, Math.PI * 1.5); ctx.arc(s * .85, -s * .35, s * .35, -Math.PI * .5, Math.PI * .5); ctx.stroke();
    ctx.fillRect(-s * .12, s * .4, s * .24, s * .35); ctx.fillRect(-s * .5, s * .72, s, s * .2);
  } else {
    const s = r * 0.44; ctx.fillStyle = "#eaf7ff"; ctx.strokeStyle = "#eaf7ff"; ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath(); ctx.moveTo(-s, -s * .4); ctx.lineTo(-s * .45, -s * .4); ctx.lineTo(s * .1, -s); ctx.lineTo(s * .1, s); ctx.lineTo(-s * .45, s * .4); ctx.lineTo(-s, s * .4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(s * .2, 0, s * .7, -.8, .8); ctx.stroke(); ctx.beginPath(); ctx.arc(s * .2, 0, s * 1.15, -.8, .8); ctx.stroke();
  }
  ctx.restore();
}

// ---------- main loop ----------
function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs; T += dt;
  const t = state === "play" || state === "end" ? now() : 0;
  const si = state === "start" ? 0 : sectionAt(t), S = SECTIONS[si];
  pal = PALS[si];
  if (state === "play" && camK < 1) { camK = Math.min(1, (nowMs - camStart) / 3000); camE = ease(camK); }
  if (state !== "play" && state !== "end") camE = 0;

  // beat + spectrum
  let beat = false, bass = 0;
  if (analyser && state === "play") {
    analyser.getByteFrequencyData(freq);
    for (let i = 1; i < 7; i++) bass += freq[i]; bass /= 6 * 255;
    energyAvg += (bass - energyAvg) * 0.05;
    beatCool -= dt;
    if (bass > energyAvg * 1.16 && bass > 0.42 && beatCool <= 0) { beat = true; beatCool = 0.28; }
  } else if (state === "play") {
    beatCool -= dt; if (beatCool <= 0) { beat = true; beatCool = 60 / 140 * 2; }
  }
  bassNow += (bass - bassNow) * Math.min(1, dt * 12);
  if (beat) pulse = Math.max(pulse, 0.7);
  pulse = Math.max(0, pulse - dt * 2.4);

  // steering
  if (keys.ArrowLeft || keys.a) px = Math.max(-1, px - dt * 2.2);
  if (keys.ArrowRight || keys.d) px = Math.min(1, px + dt * 2.2);
  pxPrev = pxS; pxS += (px - pxS) * Math.min(1, dt * 9);
  tilt += (((pxS - pxPrev) / Math.max(dt, 1e-3)) * 14 - tilt) * Math.min(1, dt * 8);
  cam += (pxS * 0.55 - cam) * Math.min(1, dt * 4);

  // section changes
  if (si !== sectIdx && state === "play") {
    sectIdx = si; $("#sect").textContent = `♫ ${S.label} · ${S.name}`;
    if (si === 2) { // focus snap: haze to clear
      flash = 1; pulse = 1;
      for (let i = 0; i < 7; i++) rings.push(mkRing(0.35 + i * 0.45, 1));
      for (const p of P) if (Math.random() < 0.7) p.c = pal[(Math.random() * pal.length) | 0];
    }
  }
  let baseHaze = 0.12, targetSpeed = 0.55;
  if (state === "start") { baseHaze = 0.05; targetSpeed = 0.18; }
  else if (si === 0) { baseHaze = 0.06 + Math.min(1, t / 41) * 0.1; targetSpeed = 0.45 + Math.min(1, t / 41) * 0.55; }
  else if (si === 1) { const k = Math.min(1, (t - 41) / 8); baseHaze = 0.2 + k * 0.5; targetSpeed = 1.2; }
  else if (si === 2) { baseHaze = 0; targetSpeed = 1.5; }
  else { outroK = Math.min(1, (t - 137) / 14); baseHaze = 0; targetSpeed = 1.3 - outroK * 1.12; }
  hitHaze = Math.max(0, hitHaze - dt * 0.9);
  haze += (Math.min(1, baseHaze + hitHaze) - haze) * Math.min(1, dt * 3);
  speed += (targetSpeed + (beat ? 0.4 : 0) - speed) * Math.min(1, dt * 2.5);
  if (beat && state === "play" && si !== 1 && outroK < 0.3 && rings.length < 10) rings.push(mkRing(4, 0));
  flash = Math.max(0, flash - dt * 1.6);
  shake = Math.max(0, shake - dt * 3);
  impact = Math.max(0, impact - dt * 2.2);

  // lyrics
  while (state === "play" && lyricIdx < LYRICS.length && t >= LYRICS[lyricIdx][0]) {
    const L = LYRICS[lyricIdx++]; if (t - L[0] < 1.5) showLyric(L[1], L[2]);
  }

  // orbs in the verse (and a few late in the intro)
  if (state === "play" && ((si === 1 && t < 78) || (si === 0 && t > 34))) {
    nextOrb -= dt; if (nextOrb <= 0) { spawnOrb(); nextOrb = si === 1 ? rnd(0.75, 1.2) : rnd(1.6, 2.4); }
  }

  // clarity: grows with the song, haze hits cost, clean dodges pay back a little
  if (state === "play") {
    clarity = Math.max(0, Math.min(100, (t / DUR()) * 100 - penalty + bonus));
    $("#clarN").textContent = Math.round(clarity) + "%";
    $("#clarBar").style.width = clarity + "%";
  }

  render(dt, si);
  requestAnimationFrame(frame);
}

function render(dt, si) {
  if (!cv.width || !cv.height || cv.width !== Math.round(innerWidth * DPR)) size();
  if (!cv.width || !cv.height) return;
  // camera: starts on the cover (side view, streaks running out of its left edge) and swings in behind him
  const cr = coverRect();
  const gx = W / 2 - cam * W * 0.2 + (Math.random() - .5) * shake * 18;
  const gy = H * 0.44 + (Math.random() - .5) * shake * 12;
  const cvx = cr.x - cr.s * 0.08, cvy = cr.y + cr.s * 0.44;
  const vx = cvx + (gx - cvx) * camE, vy = cvy + (gy - cvy) * camE;
  const side = 1 - camE;                 // 1 = album side view, 0 = behind the figure
  const fade = 1 - outroK * 0.8;

  // ---- trail buffer: streaks + rings only, zoomed toward camera each frame (no bloom in here) ----
  pctx.globalCompositeOperation = "copy"; pctx.drawImage(tr, 0, 0);
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalAlpha = 1; tctx.globalCompositeOperation = "source-over";
  tctx.clearRect(0, 0, tr.width, tr.height);
  const zoom = 1 + (0.01 + speed * 0.016) * (1 + haze) * (1 - outroK * 0.7);
  const trailA = Math.min(0.8, 0.42 + haze * 0.3 + side * 0.25) * fade * (si >= 2 ? 0.8 : 1) * (1 - outroK * 0.6);
  tctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  tctx.save(); tctx.globalAlpha = trailA;
  tctx.translate(vx, vy); tctx.scale(zoom, zoom); tctx.rotate(Math.sin(T * 0.7) * haze * 0.012); tctx.translate(-vx, -vy);
  tctx.drawImage(prev, 0, 0, W, H); tctx.restore();
  ctx = tctx;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(Math.sin(T * 0.7) * haze * 0.07); ctx.translate(-W / 2, -H / 2);
  ctx.globalCompositeOperation = "lighter";

  // speed streaks: coloured body + white-hot core near the camera
  const count = si === 0 ? Math.round(420 + Math.min(1, now() / 41) * (N - 420)) : N;
  const passes = haze > 0.08 ? 2 : 1;
  const stretch = 1 + side * 3.5;        // the cover's long streaks
  for (let pass = 0; pass < passes; pass++) {
    const ox = pass ? Math.sin(T * 1.7) * haze * 26 : 0, oy = pass ? Math.cos(T * 1.3) * haze * 9 : 0;
    for (let i = 0; i < count; i++) {
      const p = P[i];
      if (pass === 0) { p.z -= speed * dt * 1.6; if (p.z < 0.06) spawn(p, true); }
      const tail = p.z + (0.1 + speed * 0.2 + haze * 0.3) * stretch;
      const s1 = F / p.z, s2 = F / tail;
      // side view flattens the tunnel into the cover's near-horizontal fan
      const ca = Math.cos(p.a), sa = Math.sin(p.a) * (1 - side * 0.72);
      const xs = 1 + side * 1.6;
      const x1 = vx + Math.abs(ca) * (side ? 1 : 0) * 0 + ca * (1 - side) * p.r * s1 + side * Math.abs(ca) * p.r * s1 * xs + ox;
      const y1 = vy + sa * p.r * s1 * 0.9 + oy;
      const x2 = vx + ca * (1 - side) * p.r * s2 + side * Math.abs(ca) * p.r * s2 * xs + ox;
      const y2 = vy + sa * p.r * s2 * 0.9 + oy;
      if ((x1 < -60 || x1 > W + 60 || y1 < -60 || y1 > H + 60) && (x2 < 0 || x2 > W || y2 < 0 || y2 > H)) continue;
      const near = Math.min(1, 1.5 / p.z), far = Math.min(1, (4 - p.z) * 0.9);
      const lw = Math.min(6, p.w * (0.5 + 1.5 / p.z)) * (1 + haze * 0.9) * (1 - side * 0.35);
      ctx.strokeStyle = pass ? (i & 1 ? "#00e5ff" : "#ff2bd6") : p.c;
      ctx.globalAlpha = (pass ? haze * 0.35 : 0.8 - haze * 0.35) * near * far * fade;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
      if (!pass && (p.hot || p.z < 1.1) && haze < 0.6) {
        ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.85 * near * fade * (1 - haze);
        ctx.lineWidth = Math.max(0.6, lw * 0.32);
        ctx.beginPath(); ctx.moveTo(x1 + (x2 - x1) * 0.45, y1 + (y2 - y1) * 0.45); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
  }

  // neon rings: segmented arcs, glow pass + thin hot core
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.z -= speed * dt * (r.big ? 2.1 : 1.5); r.rot += dt * (r.big ? 0.6 : 0.3);
    if (r.z < 0.12) { rings.splice(i, 1); continue; }
    if (side > 0.3) continue;
    const R = (r.big ? 1.9 : 1.45) * F / r.z;
    const a = Math.min(1, (4 - r.z) / 1.1) * Math.min(1, r.z * 2.2) * fade * (si === 1 ? 0.3 : 1) * (1 - side);
    const segs = r.seg, gap = 0.22;
    for (let k = 0; k < 2; k++) {
      ctx.globalAlpha = a * (k ? 1 : 0.28);
      ctx.strokeStyle = k ? "#fff" : r.c;
      ctx.lineWidth = k ? 1 + 1.2 / r.z : (r.big ? 5 : 3) + 9 / r.z;
      for (let s = 0; s < segs; s++) {
        const a0 = r.rot + (s / segs) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / segs) - gap;
        ctx.beginPath(); ctx.ellipse(vx, vy, R, R * 0.9, 0, a0, a1); ctx.stroke();
      }
    }
  }
  ctx.restore();
  ctx = mctx;

  // ---- main frame ----
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (outroK < 1) { ctx.fillStyle = `rgba(5,2,12,${1 - outroK})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  sky.style.opacity = outroK;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // the album cover itself, handing off to the live tunnel
  if (side > 0.001 && coverImg.complete) {
    const k = camE, sc = 1 + k * k * 2.6;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * 1.5);
    ctx.translate(cvx, cvy); ctx.scale(sc, sc); ctx.translate(-cvx, -cvy);
    ctx.drawImage(coverImg, cr.x, cr.y, cr.s, cr.s);
    ctx.restore();
  }

  // nebula fog
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = ((si === 1 ? 0.4 : si === 0 ? 0.3 : 0.4) * fade + pulse * 0.12) * (1 - side * 0.6);
  ctx.translate(vx, vy); ctx.rotate(T * 0.03 + haze * Math.sin(T * 0.6) * 0.3);
  const ns = Math.max(W, H) * (1.5 + haze * 0.3);
  ctx.drawImage(neb, -ns / 2, -ns / 2, ns, ns);
  ctx.restore();

  // vanishing-point glow, breathes with the bass
  ctx.globalCompositeOperation = "lighter";
  const cg = ctx.createRadialGradient(vx, vy, 0, vx, vy, F * (0.5 + bassNow * 0.6 + pulse * 0.3));
  const cgc = si === 1 ? "255,60,200" : si === 2 ? "120,200,255" : si === 3 ? "255,180,120" : "150,60,255";
  cg.addColorStop(0, `rgba(255,255,255,${(0.1 + pulse * 0.22) * fade})`);
  cg.addColorStop(0.25, `rgba(${cgc},${(0.15 + bassNow * 0.18) * fade})`);
  cg.addColorStop(1, `rgba(${cgc},0)`);
  ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

  // trails layer
  ctx.globalAlpha = 1; ctx.drawImage(tr, 0, 0, W, H);

  // dust motes
  for (const d of DUST) {
    d.z -= speed * dt * 0.5; if (d.z < 0.15) { d.z = 4; d.a = Math.random() * 6.28; d.r = rnd(0.2, 2.5); }
    const s = F / d.z, x = vx + Math.cos(d.a) * d.r * s, y = vy + Math.sin(d.a) * d.r * s * 0.9;
    if (x < 0 || x > W || y < 0 || y > H) continue;
    ctx.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(T * 3 + d.tw))) * Math.min(1, 1.4 / d.z) * fade;
    ctx.fillStyle = si === 1 ? "#ff9af0" : si === 3 ? "#ffd9a0" : "#d8f6ff";
    const r = Math.min(2.6, 0.5 + 1.2 / d.z);
    ctx.fillRect(x - r / 2, y - r / 2, r, r);
  }
  ctx.globalAlpha = 1;

  // player position
  const zp = 0.4;
  const B = fig.offsetWidth || 1;
  const laneW = W * 0.36;
  const gameSc = (1 + outroK * 0.35) * (1 + pulse * 0.03);
  const coverSc = 0.195 * cr.s / (0.86 * B);
  const figSc = coverSc + (gameSc - coverSc) * camE;
  const figH = B * 0.86 * figSc;
  const fX = (cr.x + 0.4626 * cr.s) + ((W / 2 + (pxS - cam) * laneW * (1 - outroK)) - (cr.x + 0.4626 * cr.s)) * camE;
  const fY = (cr.y + 0.653 * cr.s) + (H * (0.8 - outroK * 0.12) - (cr.y + 0.653 * cr.s)) * camE;

  lastFx = fX; lastFy = fY; lastFigH = figH;
  // figure aura (red glow behind him, pulses on the beat)
  if (state !== "start") {
    const ar = figH * (0.75 + pulse * 0.35 + bassNow * 0.2);
    const ag = ctx.createRadialGradient(fX, fY - figH * 0.5, 0, fX, fY - figH * 0.5, ar);
    ag.addColorStop(0, `rgba(255,40,80,${0.45 + pulse * 0.25})`); ag.addColorStop(0.4, "rgba(255,30,140,.16)"); ag.addColorStop(1, "rgba(255,30,140,0)");
    ctx.globalAlpha = state === "end" ? 0 : camE; ctx.fillStyle = ag; ctx.fillRect(fX - ar, fY - figH * 0.5 - ar, ar * 2, ar * 2);
    // speed lines streaming past him
    if (outroK < 0.9 && state === "play" && camE > 0.95) {
      ctx.strokeStyle = "rgba(255,120,170,.55)"; ctx.lineWidth = 1.4;
      for (let i = 0; i < 9; i++) {
        const sx = fX + (((i * 73 + T * 900) % (figH * 1.4)) - figH * 0.7), sy = fY - figH * (0.15 + ((i * 37) % 80) / 100);
        const len = 18 + speed * 26;
        ctx.globalAlpha = 0.25 + 0.5 * ((i * 13) % 10) / 10;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (sx - vx) * 0.04, sy + len); ctx.stroke();
      }
    }
  }

  // 4) orbs: glossy spheres with speed trails
  ctx.globalCompositeOperation = "source-over";
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i]; o.z -= speed * dt * 1.05; o.spin += dt * 2;
    const k = zp / o.z;
    if (o.z < 0.08) { orbs.splice(i, 1); continue; }
    const ox = W / 2 + (o.x - cam) * laneW * k, oy = vy + (fY - figH * 0.45 - vy) * k;
    if (!o.done && o.z < zp + 0.04) {
      o.done = 1;
      if (Math.abs(o.x - pxS) < 0.27) {
        o.hit = 1; hits++; penalty += 4; streak = 0; setStreak(); hitHaze = Math.min(0.9, hitHaze + 0.6); shake = 1; impact = 1;
        tapped && navigator.vibrate && navigator.vibrate(35);
        pops.push({ x: fX, y: fY - figH * 1.05, txt: "−4%", c: "#ff6aa8", l: 1 });
        for (let s = 0; s < 22; s++) { const a = Math.random() * 6.28; sparks.push({ x: ox, y: oy, vx: Math.cos(a) * rnd(80, 380), vy: Math.sin(a) * rnd(80, 380), l: rnd(.4, .8), c: o.t.c, g: 0 }); }
      } else {
        dodged++; bonus += 0.6; streak++;
        pops.push({ x: fX, y: fY - figH * 1.05, txt: "+CLEAR", c: "#7ff9ff", l: 1 });
        fx.push({ k: "burst", x: fX, y: fY - figH * 0.55, r: 34, c: "#bff8ff", l: 0.8, d: 0, vy: 0 });
        setStreak();
        for (let s = 0; s < 16; s++) sparks.push({ x: fX + rnd(-20, 20), y: fY - figH * 0.5, vx: rnd(-160, 160), vy: rnd(-280, -60), l: rnd(.5, .9), c: "#7ff9ff", g: 300 });
      }
    }
    if (o.hit) continue;
    const r = Math.min(120, 34 * k) * (W < 600 ? 0.85 : 1);
    const a = Math.min(1, (4 - o.z) * 0.8);
    // trail toward the vanishing point
    ctx.globalCompositeOperation = "lighter";
    const tg = ctx.createLinearGradient(ox, oy, ox + (vx - ox) * 0.35, oy + (vy - oy) * 0.35);
    tg.addColorStop(0, `rgba(${o.t.rgb},${0.55 * a})`); tg.addColorStop(1, `rgba(${o.t.rgb},0)`);
    ctx.strokeStyle = tg; ctx.lineWidth = r * 1.5; ctx.lineCap = "round"; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + (vx - ox) * 0.35, oy + (vy - oy) * 0.35); ctx.stroke();
    // outer glow
    const g = ctx.createRadialGradient(ox, oy, r * 0.5, ox, oy, r * 2.3);
    g.addColorStop(0, `rgba(${o.t.rgb},${0.7 * a})`); g.addColorStop(1, `rgba(${o.t.rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, r * 2.3, 0, Math.PI * 2); ctx.fill();
    // glass body
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a;
    const body = ctx.createRadialGradient(ox - r * .35, oy - r * .4, r * .1, ox, oy, r);
    body.addColorStop(0, o.t.hi); body.addColorStop(0.35, o.t.c); body.addColorStop(1, o.t.lo);
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(15,4,28,.45)"; ctx.beginPath(); ctx.arc(ox, oy, r * 0.74, 0, Math.PI * 2); ctx.fill();
    // rim + spinning highlight
    ctx.strokeStyle = o.t.hi; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.arc(ox, oy, r * 0.88, o.spin, o.spin + 1.1); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.beginPath(); ctx.ellipse(ox - r * .38, oy - r * .5, r * .22, r * .1, -0.6, 0, Math.PI * 2); ctx.fill();
    drawIcon(o, ox, oy, r);
  }

  // sparks
  ctx.globalCompositeOperation = "lighter";
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.l -= dt; if (s.l <= 0) { sparks.splice(i, 1); continue; }
    const ox = s.x, oy = s.y;
    s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.g * dt; s.vx *= 0.98; s.vy *= 0.98;
    ctx.globalAlpha = Math.min(1, s.l * 1.6); ctx.strokeStyle = s.c; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox - s.vx * 0.03, oy - s.vy * 0.03); ctx.lineTo(s.x, s.y); ctx.stroke();
  }

  // dopamine moments
  ctx.globalCompositeOperation = "lighter";
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i];
    if (e.d > 0) { e.d -= dt; continue; }
    e.l -= dt; if (e.l <= 0) { fx.splice(i, 1); continue; }
    e.y += e.vy * dt;
    const age = 1 - e.l, a = Math.min(1, e.l * 2.2);
    ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = a;
    ctx.shadowColor = e.c; ctx.shadowBlur = 18; ctx.strokeStyle = ctx.fillStyle = e.c;
    if (e.k === "burst") {           // clarity increase: 12-ray starburst
      const R = e.r * (0.6 + age * 1.4); ctx.lineWidth = 2;
      for (let j = 0; j < 12; j++) { const an = j / 12 * 6.283, L = j % 2 ? R * 0.55 : R;
        ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.15, Math.sin(an) * R * 0.15); ctx.lineTo(Math.cos(an) * L, Math.sin(an) * L); ctx.stroke(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 4 + (1 - age) * 4, 0, 6.283); ctx.fill();
    } else if (e.k === "star4") {    // beat pulse: four-point sparkle
      const R = e.r * (0.4 + Math.sin(Math.min(1, age * 1.4) * Math.PI) * 0.8);
      ctx.rotate(age * 0.6); ctx.beginPath();
      for (let j = 0; j < 4; j++) { const an = j * Math.PI / 2;
        ctx.lineTo(Math.cos(an) * R, Math.sin(an) * R); ctx.lineTo(Math.cos(an + Math.PI / 4) * R * 0.18, Math.sin(an + Math.PI / 4) * R * 0.18); }
      ctx.closePath(); ctx.fill();
    } else if (e.k === "heart") {    // feel it moment
      const R = e.r * (0.7 + Math.min(1, age * 3) * 0.4); ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(0, R * 0.35);
      ctx.bezierCurveTo(-R * 1.1, -R * 0.35, -R * 0.45, -R * 1.05, 0, -R * 0.45);
      ctx.bezierCurveTo(R * 0.45, -R * 1.05, R * 1.1, -R * 0.35, 0, R * 0.35);
      ctx.stroke(); ctx.globalAlpha = a * 0.25; ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0; ctx.globalAlpha = 1;

  // 5) bloom: downsample twice, add back blurred
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  b1x.globalCompositeOperation = "copy"; b1x.imageSmoothingQuality = "low";
  b1x.drawImage(cv, 0, 0, b1.width, b1.height);
  b2x.globalCompositeOperation = "copy"; b2x.drawImage(b1, 0, 0, b2.width, b2.height);
  ctx.globalCompositeOperation = "lighter";
  const bk = (1 - (1 - camE) * 0.85) * (1 - haze * 0.5) * (si === 2 ? 0.7 : si === 3 ? 0.55 : 1);   // keep the cover clean while it hands off
  ctx.globalAlpha = (0.5 + pulse * 0.15) * bk; ctx.drawImage(b1, 0, 0, cv.width, cv.height);
  ctx.globalAlpha = (0.5 + bassNow * 0.3) * bk; ctx.drawImage(b2, 0, 0, cv.width, cv.height);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

  // floating score pops (drawn after bloom so they stay crisp)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.l -= dt * 1.1; if (p.l <= 0) { pops.splice(i, 1); continue; }
    p.y -= dt * 60;
    ctx.globalAlpha = Math.min(1, p.l * 2); ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 14;
    ctx.font = "italic 800 18px Montserrat, sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.txt, p.x, p.y);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;

  // the figure: starts as the cover cut-out, then crossfades between poses
  const bob = Math.sin(T * 3.1) * 5 * (1 - outroK) * camE;
  const rot = Math.max(-14, Math.min(14, tilt * 0.45)) * (1 - outroK) * camE;
  fig.style.transform = `translate(${fX - B / 2}px, ${fY - B * 0.93 + bob}px) rotate(${rot}deg) scale(${figSc})`;
  const vel = (pxS - pxPrev) / Math.max(dt, 1e-3);
  waveT = Math.max(0, waveT - dt);
  let want = si === 1 ? "fly-a" : "fly";
  if (si === 2) want = "arms";
  if (waveT > 0) want = "wave";
  if (outroK > 0.35) want = "back";
  else if (impact > 0.35) want = "hit";
  else if (vel > 0.45) want = "steer-right";
  else if (vel < -0.45) want = "steer-left";
  const covK = camE < 1 ? Math.max(0, 1 - camE * 1.7) : 0;
  let best = "fly", bw = -1;
  for (const k in POSES) {
    const target = (k === want ? 1 : 0) * (1 - covK);
    poseW[k] += (target - poseW[k]) * Math.min(1, dt * 11);
    POSES[k].style.opacity = poseW[k].toFixed(3);
    if (poseW[k] > bw) { bw = poseW[k]; best = k; }
  }
  covImg.style.opacity = covK;
  if (ghost.dataset.p !== best) { ghost.dataset.p = best; ghost.src = `img/poses/${best}.png`; }
  ghost.style.opacity = Math.min(0.85, haze * 1.15 + impact * 0.6) * (1 - covK);
  ghost.style.transform = `translate(${Math.sin(T * 1.7) * (haze * 24 + impact * 30)}px, ${Math.cos(T * 1.3) * haze * 6}px)`;
  fig.style.opacity = state === "start" || state === "end" ? 0 : 1;
  fig.style.transition = state === "end" ? "opacity 1s" : "";
  app.style.setProperty("--imp", impact.toFixed(3));
  app.style.setProperty("--haze", haze.toFixed(3));

  flashEl.style.opacity = flash;

  // waveform: thin mirrored lines, louder in the middle, pink to violet to cyan
  if (analyser && state === "play") {
    const ww = wave.width, wh = wave.height, n = Math.min(150, Math.floor(ww / (5 * DPR))), step = ww / n;
    wctx.clearRect(0, 0, ww, wh);
    const grad = wctx.createLinearGradient(0, 0, ww, 0);
    grad.addColorStop(0, "#ff3b6b"); grad.addColorStop(0.3, "#ff2bd6"); grad.addColorStop(0.6, "#a64bff"); grad.addColorStop(1, "#00e5ff");
    wctx.strokeStyle = grad; wctx.lineCap = "round"; wctx.lineWidth = 1.6 * DPR;
    wctx.shadowColor = "rgba(255,60,220,.9)"; wctx.shadowBlur = 6 * DPR;
    wctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), d = Math.abs(u - 0.5) * 2;
      const bin = 2 + Math.floor(d * 90 + (i % 3));
      const v = freq[bin] / 255;
      const env = 0.3 + 0.7 * Math.exp(-d * d * 3.2);
      const h = Math.max(1.5 * DPR, Math.pow(v, 1.4) * wh * 0.95 * env);
      const x = i * step + step / 2;
      wctx.moveTo(x, (wh - h) / 2); wctx.lineTo(x, (wh + h) / 2);
    }
    wctx.stroke();
    // faint centre line
    wctx.shadowBlur = 0; wctx.globalAlpha = 0.35; wctx.lineWidth = 1 * DPR;
    wctx.beginPath(); wctx.moveTo(0, wh / 2); wctx.lineTo(ww, wh / 2); wctx.stroke(); wctx.globalAlpha = 1;
  }

  if (state === "play" && !ended && song.duration && song.currentTime >= song.duration - 0.25) finish();
}
requestAnimationFrame(frame);

// ---------- share card ----------
$("#shareBtn").addEventListener("click", async () => {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1920;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, "#14063a"); bg.addColorStop(.55, "#2a0830"); bg.addColorStop(1, "#05020c");
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
  const img = new Image(); img.src = "img/cover.jpg"; await img.decode().catch(() => {});
  g.save(); g.shadowColor = "rgba(255,40,160,.8)"; g.shadowBlur = 60;
  g.drawImage(img, 140, 220, 800, 800); g.restore();
  g.strokeStyle = "rgba(255,79,216,.9)"; g.lineWidth = 4; g.strokeRect(140, 220, 800, 800);
  g.textAlign = "center"; g.fillStyle = "#d7fbff"; g.font = "800 44px Montserrat, sans-serif";
  g.fillText("MY CLARITY", 540, 1170);
  g.font = "italic 800 230px Montserrat, sans-serif"; g.fillStyle = "#bff8ff";
  g.shadowColor = "#00e5ff"; g.shadowBlur = 40; g.fillText(Math.round(clarity) + "%", 540, 1400); g.shadowBlur = 0;
  g.font = "italic 800 92px Montserrat, sans-serif"; g.fillStyle = "#fff"; g.shadowColor = "#ff2bd6"; g.shadowBlur = 30;
  g.fillText("I CAN FEEL IT.", 540, 1580); g.shadowBlur = 0;
  g.font = "800 44px Montserrat, sans-serif"; g.fillStyle = "#fff";
  const w1 = g.measureText("GREG").width, w2 = g.measureText("+ECOZ").width, x0 = 540 - (w1 + w2 + 16) / 2;
  g.textAlign = "left"; g.fillText("GREG", x0, 1720);
  g.fillStyle = "#e8101e"; g.fillRect(x0 + w1 + 4, 1676, w2 + 12, 58); g.fillStyle = "#fff"; g.fillText("+ECOZ", x0 + w1 + 10, 1720);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const file = new File([blob], "i-can-feel-it-clarity.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: "I can feel it. " + location.href }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
});
})();
