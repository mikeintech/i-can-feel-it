// I CAN FEEL IT · Greg Tecoz — real-time 3D version (Three.js)
// Starts on the album cover rebuilt in 3D, swings the camera in behind Greg, then rides the song.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RGBShiftShader } from "three/addons/shaders/RGBShiftShader.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const LINKS = {
  stream: "https://ffm.to/gregtecozicanfeelit",
  presave: "https://www.youtube.com/watch?v=F1qITIkNXLw"
};
const SECTIONS = [
  { name: "INTRO",  to: 41,  label: "0:00 – 0:41" },
  { name: "VERSE",  to: 80,  label: "0:41 – 1:20" },
  { name: "CHORUS", to: 137, label: "1:20 – 2:17" },
  { name: "OUTRO",  to: 999, label: "2:17 – END" }
];
// full lyrics, transcribed from the track with Whisper (large-v3-turbo), cleaned into lines
const LINES = [
  [19.3, "Oh na na, I can feel it, I can feel it"], [24.0, "Oh na na, I can feel it, I can feel it"],
  [27.4, "Oh na na"], [33.0, "Oh na na, I can feel it, I can feel it"], [37.9, "Oh na na, I can feel it, I can feel it"], [39.9, "Oh na na"],
  [41.98, "I remember times that I couldn't get it right"], [44.88, "Couldn't gather all my thoughts, do I fight or do I fly?"],
  [48.88, "Music's in the highest, so it's never gonna die"], [52.3, "Standing at the top, had to elevate my life"],
  [54.84, "Like a, like a, like a, like a pop star"], [59.1, "Moving confident and I'm feeling like a rock star"],
  [62.38, "Now I'm at the top of my game like an all star"], [65.3, "Money piling up, running up like a trap star"],
  [68.3, "Yeah, yeah, I feel like money"], [70.56, "Yeah, yeah, I feel like sex"], [72.34, "Yeah, yeah, I feel it coming"],
  [74.08, "Yeah, yeah, I'm feeling great"], [75.72, "Yeah, yeah, I'm feeling money"], [77.52, "Yeah, yeah, I feel like sex"],
  [78.76, "Yeah, yeah, I feel it coming"], [82.76, "Yeah, yeah, yeah"],
  [88.02, "Oh na na"], [89.22, "I can feel it, I can feel it"], [91.32, "Oh na na"], [92.64, "I can feel it, I can feel it"], [94.74, "Oh na na"],
  [96.5, "Yeah, yeah, yeah"], [101.02, "Oh na na"], [102.98, "I can feel it, I can feel it"], [105.04, "Oh na na"], [106.32, "I can feel it, I can feel it"],
  [108.5, "I'm feeling great"], [110.0, "Yeah, yeah, I feel like money"], [111.7, "Yeah, yeah, I feel like sex"], [113.46, "Yeah, yeah, I feel it coming"],
  [115.2, "Yeah, yeah, I'm feeling great"], [116.86, "Yeah, yeah, I'm feeling money"], [118.66, "Yeah, yeah, I feel like sex"],
  [120.42, "Yeah, yeah, I feel it coming"], [122.18, "Yeah, yeah, yeah"],
  [128.36, "Oh na na"], [130.36, "I can feel it, I can feel it"], [132.48, "Oh na na"], [133.76, "I can feel it, I can feel it"], [135.88, "Oh na na"],
  [136.98, "Yeah, yeah, yeah, yeah"], [141.52, "Can you feel it?"], [142.82, "Oh na na"], [144.14, "I can feel it, I can feel it"],
  [146.18, "Oh na na"], [147.58, "I can feel it, I can feel it"], [149.64, "Oh na na"],
  [150.96, "Can you feel it, can you?"], [155.16, "Can you feel it, can you?"], [158.58, "Can you feel it, can you?"],
  [162.0, "Can you feel it?"], [163.44, "Oh na na"], [167.5, ""]
];
// only a few big moments
const BIG = [[19.3, "I CAN FEEL IT"], [89.22, "I CAN FEEL IT"], [141.52, "CAN YOU FEEL IT?"], [162.0, "CAN YOU FEEL IT?"]];
const PALS = [
  [0xff2a3a, 0xff1f8f, 0xff2bd6, 0x9b3cff, 0x00e5ff, 0x00f0a0, 0xff7a1a, 0xffffff],
  [0xff1f8f, 0xff2bd6, 0x9b3cff, 0x00e5ff, 0x00f0a0, 0x9cff3c, 0xffd400, 0xff7a1a, 0xff2a3a],
  [0xff2bd6, 0xff1f8f, 0x00e5ff, 0x9b3cff, 0xffffff, 0x7ff9ff],
  [0xff9a3c, 0xff3d7f, 0xffd27a, 0xff2bd6, 0xffffff]
];
const RINGC = [0xff2bd6, 0x00e5ff, 0x9b3cff, 0xff1f8f, 0x7ff9ff];

const $ = s => document.querySelector(s);
const app = $("#app"), song = $("#song"), lyricEl = $("#lyric"), flashEl = $("#flash");
const wave = $("#wave"), wctx = wave.getContext("2d");
const fx2 = $("#fx2d"), f2 = fx2.getContext("2d");
$("#streamBtn").href = LINKS.stream; $("#presaveBtn").href = LINKS.presave;
const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 700;

// ---------- renderer + post ----------
const canvas = $("#tunnel");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05020c);
scene.fog = new THREE.FogExp2(0x07031a, 0.011);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 600);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const after = new AfterimagePass(0.6); composer.addPass(after);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.45, 0.55); composer.addPass(bloom);
const rgb = new ShaderPass(RGBShiftShader); rgb.uniforms.amount.value = 0.0015; composer.addPass(rgb);
composer.addPass(new OutputPass());

let W = 1, H = 1;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false); composer.setSize(W, H);
  bloom.resolution.set(W / 2, H / 2);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  const d = Math.min(devicePixelRatio, 2);
  fx2.width = W * d; fx2.height = H * d; f2.setTransform(d, 0, 0, d, 0, 0);
  wave.width = wave.clientWidth * d; wave.height = wave.clientHeight * d;
}
addEventListener("resize", resize); resize();

// ---------- helpers: canvas textures ----------
function glowTex(stops, size = 256) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => r.addColorStop(o, col)); g.fillStyle = r; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textTex(txt, font, h, opts = {}) {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = font; const w = Math.ceil(g.measureText(txt).width) + h;
  c.width = w; c.height = Math.ceil(h * 1.35);
  g.font = font; g.textBaseline = "middle"; g.textAlign = "center";
  if (opts.box) { // GREG+ECOZ logo
    const a = g.measureText("GREG").width, b = g.measureText("+ECOZ").width, x0 = (w - a - b - h * 0.25) / 2;
    g.textAlign = "left"; g.fillStyle = "#fff"; g.fillText("GREG", x0, c.height / 2);
    g.fillStyle = "#e8101e"; g.fillRect(x0 + a + h * 0.06, c.height * 0.14, b + h * 0.2, c.height * 0.72);
    g.fillStyle = "#fff"; g.fillText("+ECOZ", x0 + a + h * 0.16, c.height / 2);
  } else {
    g.shadowColor = opts.glow || "rgba(255,255,255,.9)"; g.shadowBlur = h * 0.18;
    g.fillStyle = "#fff"; g.fillText(txt, w / 2, c.height / 2 + h * 0.04);
    g.shadowBlur = 0; g.fillText(txt, w / 2, c.height / 2 + h * 0.04);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, aspect: c.width / c.height };
}

// ---------- the tunnel world (rotates for the cover's side view) ----------
const world = new THREE.Group(); scene.add(world);
const TUN_Y = 1.0;

// speed streaks
const N = MOBILE ? 1100 : 1700;
const streakGeo = new THREE.BoxGeometry(1, 1, 1);
const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false });
const streaks = new THREE.InstancedMesh(streakGeo, streakMat, N);
streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); streaks.frustumCulled = false;
world.add(streaks);
const S = [];
let pal = PALS[0];
const tmpC = new THREE.Color(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3();
function spawnStreak(s, far) {
  s.a = Math.random() * Math.PI * 2;
  s.r = rnd(2.6, 11);
  s.z = far ? rnd(-170, -120) : rnd(-170, 10);
  s.th = rnd(0.01, 0.035) * (s.r > 6 ? 1.5 : 1);
  s.len = rnd(0.6, 1.4);
  s.hot = Math.random() < 0.12;
  const c = s.hot ? 0xffffff : pal[(Math.random() * pal.length) | 0];
  tmpC.setHex(c).multiplyScalar(s.hot ? 1.3 : rnd(0.55, 1.05));
  streaks.setColorAt(s.i, tmpC);
}
for (let i = 0; i < N; i++) { const s = { i }; spawnStreak(s); S.push(s); }
streaks.instanceColor.needsUpdate = true;

// dust
const dustGeo = new THREE.BufferGeometry(), DN = 500, dpos = new Float32Array(DN * 3);
for (let i = 0; i < DN; i++) { const a = Math.random() * 6.28, r = rnd(0.6, 9); dpos[i * 3] = Math.cos(a) * r; dpos[i * 3 + 1] = TUN_Y + Math.sin(a) * r; dpos[i * 3 + 2] = rnd(-150, 8); }
dustGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.06, color: 0xd8c8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, map: glowTex([[0, "#fff"], [0.4, "rgba(255,255,255,.6)"], [1, "rgba(255,255,255,0)"]], 64) }));
world.add(dust);

// nebula fog at the far end of the tunnel
const nebula = new THREE.Group(); world.add(nebula);
const nebCols = ["255,43,214", "155,60,255", "0,150,255", "255,31,90", "120,40,200"];
for (let i = 0; i < 9; i++) {
  const c = nebCols[i % nebCols.length];
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, `rgba(${c},.55)`], [0.5, `rgba(${c},.18)`], [1, `rgba(${c},0)`]]), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const a = i / 9 * 6.28; sp.position.set(Math.cos(a) * rnd(6, 22), TUN_Y + Math.sin(a) * rnd(4, 16), rnd(-180, -120));
  sp.scale.setScalar(rnd(60, 110)); nebula.add(sp);
}
const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, "rgba(255,255,255,1)"], [0.15, "rgba(200,140,255,.7)"], [0.5, "rgba(150,60,255,.18)"], [1, "rgba(150,60,255,0)"]]), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
coreGlow.position.set(0, TUN_Y, -160); coreGlow.scale.setScalar(70); world.add(coreGlow);

// neon rings (segmented arcs)
const rings = [];
function addRing(z = -150, big = 0) {
  if (rings.length > 11) return;
  const g = new THREE.Group(), seg = 3 + ((Math.random() * 3) | 0), col = RINGC[(Math.random() * RINGC.length) | 0];
  const R = big ? 5.2 : 4.4;
  for (let s = 0; s < seg; s++) {
    const arc = Math.PI * 2 / seg - 0.25;
    const glow = new THREE.Mesh(new THREE.TorusGeometry(R, big ? 0.09 : 0.06, 6, 64, arc), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const core = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 4, 64, arc), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.rotation.z = core.rotation.z = s * Math.PI * 2 / seg;
    g.add(glow, core);
  }
  g.position.set(0, TUN_Y, z); g.userData = { spin: rnd(-0.6, 0.6), big };
  world.add(g); rings.push(g);
}

// orbs: glossy spheres drawn to canvas sprites
const ORB = [
  { k: "money", c: "#ffd400", hi: "#fff3a0", lo: "#a66a00", rgb: "255,200,0" },
  { k: "cup", c: "#c46bff", hi: "#f0c6ff", lo: "#4b108f", rgb: "180,80,255" },
  { k: "noise", c: "#3fb6ff", hi: "#c8ecff", lo: "#0a3f8f", rgb: "50,170,255" }
];
for (const o of ORB) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  const cx = 128, r = 62;
  let gr = g.createRadialGradient(cx, cx, r * .6, cx, cx, 128); gr.addColorStop(0, `rgba(${o.rgb},.75)`); gr.addColorStop(1, `rgba(${o.rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  gr = g.createRadialGradient(cx - r * .35, cx - r * .4, r * .1, cx, cx, r); gr.addColorStop(0, o.hi); gr.addColorStop(.35, o.c); gr.addColorStop(1, o.lo);
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, r, 0, 6.283); g.fill();
  g.fillStyle = "rgba(15,4,28,.45)"; g.beginPath(); g.arc(cx, cx, r * .74, 0, 6.283); g.fill();
  g.strokeStyle = o.hi; g.lineWidth = 5; g.beginPath(); g.arc(cx, cx, r, 0, 6.283); g.stroke();
  g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.ellipse(cx - r * .38, cx - r * .5, r * .22, r * .1, -.6, 0, 6.283); g.fill();
  g.save(); g.translate(cx, cx); g.shadowColor = o.c; g.shadowBlur = 16; g.lineCap = g.lineJoin = "round";
  if (o.k === "money") { g.font = "800 74px Montserrat, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff3b0"; g.fillText("$", 0, 4); }
  else if (o.k === "cup") { const s = 32; g.fillStyle = "#ffd76a"; g.strokeStyle = "#ffd76a"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-s * .8, -s * .8); g.lineTo(s * .8, -s * .8); g.quadraticCurveTo(s * .8, s * .3, 0, s * .45); g.quadraticCurveTo(-s * .8, s * .3, -s * .8, -s * .8); g.fill();
    g.beginPath(); g.arc(-s * .85, -s * .35, s * .35, Math.PI * .5, Math.PI * 1.5); g.arc(s * .85, -s * .35, s * .35, -Math.PI * .5, Math.PI * .5); g.stroke();
    g.fillRect(-s * .12, s * .4, s * .24, s * .35); g.fillRect(-s * .5, s * .72, s, s * .2); }
  else { const s = 26; g.fillStyle = "#eaf7ff"; g.strokeStyle = "#eaf7ff"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-s, -s * .4); g.lineTo(-s * .45, -s * .4); g.lineTo(s * .1, -s); g.lineTo(s * .1, s); g.lineTo(-s * .45, s * .4); g.lineTo(-s, s * .4); g.closePath(); g.fill();
    g.beginPath(); g.arc(s * .2, 0, s * .7, -.8, .8); g.stroke(); g.beginPath(); g.arc(s * .2, 0, s * 1.15, -.8, .8); g.stroke(); }
  g.restore();
  o.tex = new THREE.CanvasTexture(c); o.tex.colorSpace = THREE.SRGBColorSpace;
}
const orbs = [];
function spawnOrb() {
  const t = ORB[(Math.random() * 3) | 0];
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  const aim = Math.random() < 0.45 ? px + rnd(-0.25, 0.25) : rnd(-0.95, 0.95);
  sp.userData = { t, x: Math.max(-1, Math.min(1, aim)), done: 0, hit: 0 };
  sp.position.set(sp.userData.x * LANE, TUN_Y - 0.05, -150); sp.scale.setScalar(1.25);
  world.add(sp); orbs.push(sp);
}

// ---------- sky + water for the outro ----------
const skyMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: { uK: { value: 0 }, uT: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec2 vUv; uniform float uK, uT;
    vec3 grad(float y){
      vec3 c = mix(vec3(1.,.85,.55), vec3(1.,.36,.45), smoothstep(0.,.08,y));
      c = mix(c, vec3(.78,.16,.56), smoothstep(.08,.25,y));
      c = mix(c, vec3(.42,.1,.55), smoothstep(.25,.45,y));
      c = mix(c, vec3(.16,.04,.38), smoothstep(.45,.75,y));
      return mix(c, vec3(.05,.02,.18), smoothstep(.75,1.,y)); }
    void main(){
      vec2 p = vUv; vec3 c = grad(p.y);
      float d = length((p - vec2(.5,0.)) * vec2(2.2,1.4));
      c += vec3(1.,.9,.7) * smoothstep(.09,.0,d) * 1.6 + vec3(1.,.5,.4) * smoothstep(.5,0.,d) * .45;
      float cl = smoothstep(.0,.6,sin(p.x*7.+uT*.05)*.5+.5) * smoothstep(.12,.22,p.y) * smoothstep(.4,.24,p.y);
      c = mix(c, vec3(1.,.55,.75), cl*.35);
      gl_FragColor = vec4(c*0.82, uK); }`
});
const sky = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), skyMat); sky.position.set(0, 150, -260); scene.add(sky);
const seaMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false, uniforms: { uK: { value: 0 }, uT: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec2 vUv; uniform float uK, uT;
    void main(){ vec2 p=vUv; float far=p.y;
      vec3 c = mix(vec3(.14,.04,.2), vec3(.34,.08,.34), pow(far,2.));
      float lines = smoothstep(.93,1.,sin(pow(far,.25)*420.-uT*1.2));
      float col = smoothstep(.12,0.,abs(p.x-.5)*(1.6-far*1.2));
      c += vec3(1.,.72,.5) * lines * col * pow(far,2.) * .9;
      c += vec3(.9,.5,.7) * lines * pow(far,3.) * .12;
      gl_FragColor = vec4(c, uK); }`
});
const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.02, -125 + 22); scene.add(sea);

// ---------- Greg: the 2D pose art, standing in the 3D world as camera-facing cards ----------
const greg = new THREE.Group(); scene.add(greg);
const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, "rgba(255,60,90,.85)"], [0.35, "rgba(255,30,120,.25)"], [1, "rgba(255,30,120,0)"]]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
aura.position.set(0, 0.95, -0.3); aura.scale.set(2.2, 3.0, 1); greg.add(aura);
const card = new THREE.Group(); greg.add(card);           // billboard: always faces the camera
const POSE_NAMES = ["cover", "stand", "fly", "steer-left", "steer-right", "dash", "hit", "arms", "back"];
const POSE = {}, poseW = {};
const CELL_H = 2.0;                                          // figure ≈ 1.8 m inside a 2 m card
const texLoader = new THREE.TextureLoader();
function poseCard(url, w, h, y0) {
  const t = texLoader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2 + y0, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, fog: false, opacity: 0 }));
  m.renderOrder = 5; card.add(m); return m;
}
for (const n of POSE_NAMES) { POSE[n] = poseCard(`img/poses2/${n}.webp`, CELL_H, CELL_H, -CELL_H * 0.045); poseW[n] = 0; }
// steering left is the right-lean art mirrored
POSE["steer-left"].material.map = POSE["steer-right"].material.map; POSE["steer-left"].scale.x = -1;
// the exact cut-out from the album cover, for a pixel-true first frame
POSE.coverCut = poseCard("img/figure.png", 1.8 * 229 / 390, 1.8, 0); poseW.coverCut = 1;
// haze double-vision: a tinted copy that drifts off the main card
const ghost = poseCard("img/poses2/fly.webp", CELL_H, CELL_H, -CELL_H * 0.045);
ghost.material.blending = THREE.AdditiveBlending; ghost.material.color.setRGB(0.2, 0.9, 1.0);
let ghostName = "fly";
texLoader.manager.onLoad = () => ready();

// ---------- the cover, rebuilt: title words + logo around him ----------
const coverTxt = new THREE.Group(); scene.add(coverTxt);
let tICan, tFeel, tLogo;
function mkPlane({ tex, aspect }, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  coverTxt.add(m); return m;
}
async function buildCoverText() {
  try { await document.fonts.load('400 200px "Bebas Neue"'); await document.fonts.load('800 120px Montserrat'); } catch (e) {}
  tICan = mkPlane(textTex("I CAN", '400 300px "Bebas Neue"', 300), 2.4);
  tFeel = mkPlane(textTex("FEEL IT", '400 300px "Bebas Neue"', 300), 2.4);
  tLogo = mkPlane(textTex("GREG+ECOZ", '800 160px Montserrat', 160, { box: 1 }), 0.56);
  tICan.material.color.setScalar(0.85); tFeel.material.color.setScalar(0.85); tLogo.material.color.setScalar(0.9);
}

// ---------- state ----------
const LANE = 2.1;
let state = "start", last = performance.now(), T = 0;
let px = 0, pxS = 0, pxPrev = 0, tilt = 0;
let hitHaze = 0, haze = 0.1, speed = 20, clarity = 0, penalty = 0, bonus = 0, hits = 0, dodged = 0, streak = 0;
let flash = 0, lyricIdx = 0, shake = 0, sectIdx = -1, outroK = 0, ended = false, pulse = 0, bassNow = 0, impact = 0;
let camStart = 0, camE = 0, waveT = 0, dashT = 0, nextOrb = 0, beatCool = 0, energyAvg = 0;
const pops = [], fxs = [];
let lineIdx = -2; const lineEl = $("#line");

// ---------- audio ----------
let actx, analyser, freq = new Uint8Array(256);
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
addEventListener("pointermove", e => { if (drag) px = Math.max(-1, Math.min(1, drag.p + (e.clientX - drag.x) / (W * 0.32))); });
addEventListener("pointerup", () => drag = null);
addEventListener("pointercancel", () => drag = null);
const keys = {};
addEventListener("keydown", e => { keys[e.key] = 1; if (e.key === " " && state === "start") start(); });
addEventListener("keyup", e => keys[e.key] = 0);

// ---------- flow ----------
let isReady = false;
async function ready() {
  if (isReady) return;
  await buildCoverText();
  isReady = true;
  // crossfade the flat cover image into the live 3D cover
  $("#start").classList.add("live");
  if (location.search.includes("ov")) { $("#cover").style.cssText = "opacity:.5;transition:none"; $(".start-ui").style.display = "none"; }
}
$("#go").addEventListener("click", start);
$("#again").addEventListener("click", () => { reset(); start(); });
$("#muteBtn").addEventListener("click", e => { song.muted = !song.muted; e.currentTarget.classList.toggle("off", song.muted); });
song.addEventListener("ended", finish);

function reset() {
  lineIdx = -2; lineEl.textContent = "";
  px = pxS = 0; hitHaze = 0; clarity = penalty = bonus = hits = dodged = streak = 0; setStreak();
  rings.forEach(r => world.remove(r)); rings.length = 0; orbs.forEach(o => world.remove(o)); orbs.length = 0;
  pops.length = 0; fxs.length = 0; lyricIdx = 0; outroK = 0; ended = false; sectIdx = -1; camE = 0;
  song.currentTime = 0;
}
function start() {
  if (state === "play" || !isReady) return;
  initAudio(); actx && actx.resume();
  if (state === "end") song.currentTime = 0;
  song.play().catch(() => {});
  state = "play"; app.dataset.state = "play";
  $("#start").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" });
  camStart = performance.now();
  $("#hint").classList.add("on"); setTimeout(() => $("#hint").classList.remove("on"), 7000);
}
function finish() {
  if (ended) return; ended = true;
  orbs.forEach(o => world.remove(o)); orbs.length = 0; pops.length = 0; fxs.length = 0;
  state = "end"; app.dataset.state = "end";
  const c = Math.round(clarity);
  $("#endN").textContent = c + "%";
  $("#ringFill").style.strokeDashoffset = 327 * (1 - c / 100);
  $("#endNote").textContent = c >= 95 ? "You stayed clear the whole way." : c >= 75 ? "A little haze, but you came through clear." : "The haze hit, but you kept going. That's the point.";
}
function setStreak() {
  const el = $("#streak"); el.querySelector("b").textContent = "×" + streak;
  el.classList.toggle("on", streak >= 3);
  if (streak >= 3) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
}
const sectionAt = t => { for (let i = 0; i < 4; i++) if (t < SECTIONS[i].to) return i; return 3; };

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
function sparkle(n) {
  for (let i = 0; i < n; i++) fxs.push({ k: "star4", x: W / 2 + rnd(-W * 0.36, W * 0.36), y: H * 0.42 + rnd(-H * 0.14, H * 0.1), r: rnd(8, 16), c: ["#ff4fd8", "#ffd76a", "#b46bff", "#ffffff"][i % 4], l: 1, d: rnd(0, 0.3), vy: -10 });
}
function toScreen(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; }
const gregTop = () => toScreen(new THREE.Vector3(greg.position.x, greg.position.y + 1.9, greg.position.z));
const gregMid = () => toScreen(new THREE.Vector3(greg.position.x, greg.position.y + 1.0, greg.position.z));
function lightWave() {
  waveT = 1.3;
  const late = sectIdx >= 3;
  flash = Math.max(flash, late ? 0.08 : 0.16); pulse = late ? 0.4 : 0.6;
  if (!late) { addRing(-20, 1); addRing(-35, 1); }
  sparkle(6);
  if (false) for (let i = 0; i < 7; i++) fxs.push({ k: "star4", x: W / 2 + rnd(-W * 0.36, W * 0.36), y: H * 0.4 + rnd(-H * 0.12, H * 0.1), r: rnd(9, 20), c: ["#ff4fd8", "#ffd76a", "#b46bff", "#ffffff"][i % 4], l: 1, d: rnd(0, 0.35), vy: -10 });
  if (sectIdx >= 2) { const p = gregTop(); fxs.push({ k: "heart", x: p.x, y: p.y, r: 26, c: "#ff4fa8", l: 1.4, d: 0.15, vy: -55 }); }
}

// ---------- camera rigs ----------
// cover: side-on to the tunnel, words either side of him. game: behind him, looking down the tunnel.
// measured from the cover: figure 19.5% of the square, words centred at 55%, logo at 17%
const COVER_SPAN = 9.2, COVER_FOV = 42, COVER_YAW = 0.40, COVER_PITCH = 0.06;
const camCover = { pos: new THREE.Vector3(0.344, 1.38, 12), look: new THREE.Vector3(0.344, 1.38, 0) };
function coverDist() { const a = W / H, tn = Math.tan(THREE.MathUtils.degToRad(COVER_FOV / 2)); return (a >= 1 ? COVER_SPAN : COVER_SPAN / a) / (2 * tn); }
const camGame = { pos: new THREE.Vector3(0, 1.1, 5.4), look: new THREE.Vector3(0, 1.0, -18) };
const look = new THREE.Vector3();

// ---------- main loop ----------
function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs; T += dt;
  const t = state === "play" || state === "end" ? now() : 0;
  const si = state === "start" ? 0 : sectionAt(t), Sx = SECTIONS[si];
  pal = PALS[si];
  if (state === "play") camE = ease(Math.min(1, (nowMs - camStart) / 3200));
  const side = 1 - camE;

  // beat + spectrum
  let beat = false, bass = 0;
  if (analyser && state === "play") {
    analyser.getByteFrequencyData(freq);
    for (let i = 1; i < 7; i++) bass += freq[i]; bass /= 6 * 255;
    energyAvg += (bass - energyAvg) * 0.05; beatCool -= dt;
    if (bass > energyAvg * 1.16 && bass > 0.42 && beatCool <= 0) { beat = true; beatCool = 0.28; }
  }
  bassNow += (bass - bassNow) * Math.min(1, dt * 12);
  if (beat) pulse = Math.max(pulse, 0.7);
  pulse = Math.max(0, pulse - dt * 2.4);

  // steering
  if (keys.ArrowLeft || keys.a) px = Math.max(-1, px - dt * 2.2);
  if (keys.ArrowRight || keys.d) px = Math.min(1, px + dt * 2.2);
  pxPrev = pxS; pxS += (px - pxS) * Math.min(1, dt * 8);
  const vel = (pxS - pxPrev) / Math.max(dt, 1e-3);
  tilt += (vel - tilt) * Math.min(1, dt * 8);

  if (si !== sectIdx && state === "play") {
    sectIdx = si; $("#sect").textContent = `♫ ${Sx.label} · ${Sx.name}`;
    if (si === 2) { flash = 0.7; pulse = 1; for (let i = 0; i < 4; i++) addRing(-10 - i * 18, 1); for (const s of S) if (Math.random() < 0.7) spawnStreak(s, false); streaks.instanceColor.needsUpdate = true; }
  }
  let baseHaze = 0.08, targetSpeed = 22;
  if (state === "start") { baseHaze = 0.04; targetSpeed = 9; }
  else if (si === 0) { baseHaze = 0.05 + Math.min(1, t / 41) * 0.08; targetSpeed = lerp(10, 45, camE) + Math.min(1, t / 41) * 15; }
  else if (si === 1) { baseHaze = 0.2 + Math.min(1, (t - 41) / 8) * 0.5; targetSpeed = 75; }
  else if (si === 2) { baseHaze = 0; targetSpeed = 90; }
  else { outroK = Math.min(1, (t - 137) / 14); baseHaze = 0; targetSpeed = lerp(80, 6, outroK); }
  hitHaze = Math.max(0, hitHaze - dt * 0.9);
  haze += (Math.min(1, baseHaze + hitHaze) - haze) * Math.min(1, dt * 3);
  speed += (targetSpeed + (beat ? 22 : 0) - speed) * Math.min(1, dt * 2.5);
  if (beat && state === "play" && si !== 1 && outroK < 0.3 && camE > 0.9) addRing(-150, 0);
  flash = Math.max(0, flash - dt * 1.6); shake = Math.max(0, shake - dt * 3); impact = Math.max(0, impact - dt * 2.2);
  waveT = Math.max(0, waveT - dt);

  while (state === "play" && lyricIdx < BIG.length && t >= BIG[lyricIdx][0]) {
    const L = BIG[lyricIdx++]; if (t - L[0] < 1.5) showLyric(L[1]);
  }
  if (state === "play") {
    let li = -1; for (let i = 0; i < LINES.length; i++) { if (LINES[i][0] <= t) li = i; else break; }
    if (li !== lineIdx) {
      lineIdx = li; const txt = li >= 0 ? LINES[li][1] : "";
      lineEl.textContent = txt;
      lineEl.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "ease-out" });
      if (/i can feel it/i.test(txt) && camE > 0.9) sparkle(3);
    }
  }
  if (state === "play" && camE > 0.95 && ((si === 1 && t < 78) || (si === 0 && t > 34))) {
    nextOrb -= dt; if (nextOrb <= 0) { spawnOrb(); nextOrb = si === 1 ? rnd(0.75, 1.2) : rnd(1.6, 2.4); }
  }
  if (state === "play") {
    clarity = Math.max(0, Math.min(100, (t / DUR()) * 100 - penalty + bonus));
    $("#clarN").textContent = Math.round(clarity) + "%";
    $("#clarBar").style.width = clarity + "%";
  }

  // ---- world ----
  // side view: tunnel turned ~80° so the streaks run in from the left like the cover
  world.rotation.set(side * COVER_PITCH, side * COVER_YAW, 0);
  world.position.set(0, 0, 0);
  const fade = 1 - outroK;
  let dirty = false;
  for (const s of S) {
    s.z += speed * dt;
    if (s.z > 12) { spawnStreak(s, true); dirty = true; }
    const L = (s.len * (0.6 + speed * 0.07) + haze * 4) * (1 + side * 3);
    V.set(Math.cos(s.a) * s.r, TUN_Y + Math.sin(s.a) * s.r, s.z);
    SC.set(s.th * (1 + haze), s.th * (1 + haze), L);
    M.compose(V, Q.identity(), SC); streaks.setMatrixAt(s.i, M);
  }
  streaks.instanceMatrix.needsUpdate = true; if (dirty) streaks.instanceColor.needsUpdate = true;
  streakMat.opacity = (0.68 - haze * 0.18) * (1 - outroK * 0.75);
  const dp = dustGeo.attributes.position.array;
  for (let i = 0; i < DN; i++) { dp[i * 3 + 2] += speed * dt * 0.35; if (dp[i * 3 + 2] > 8) dp[i * 3 + 2] = -150; }
  dustGeo.attributes.position.needsUpdate = true;
  nebula.rotation.z += dt * 0.02; nebula.children.forEach(n => n.material.opacity = (si === 1 ? 0.5 : 0.35) * fade + pulse * 0.06);
  coreGlow.material.opacity = (0.15 + bassNow * 0.2 + pulse * 0.12) * fade; coreGlow.scale.setScalar(45 + bassNow * 30);
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.position.z += speed * dt * (r.userData.big ? 1.15 : 1); r.rotation.z += dt * r.userData.spin;
    const z = r.position.z;
    if (z > 6) { world.remove(r); rings.splice(i, 1); continue; }
    const a = Math.min(1, (z + 150) / 40) * Math.min(1, (6 - z) / 6) * (si === 1 ? 0.3 : 1) * fade * camE;
    r.children.forEach(m => m.material.opacity = a);
  }

  // orbs
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i], u = o.userData; o.position.z += speed * dt * 0.95;
    o.material.rotation += dt;
    if (!u.done && o.position.z > -0.2) {
      u.done = 1;
      const p = gregMid();
      if (Math.abs(u.x - pxS) < 0.3) {
        u.hit = 1; hits++; penalty += 4; streak = 0; setStreak(); hitHaze = Math.min(0.9, hitHaze + 0.6); shake = 1; impact = 1;
        tapped && navigator.vibrate && navigator.vibrate(35);
        pops.push({ x: p.x, y: p.y - 90, txt: "−4%", c: "#ff6aa8", l: 1 });
        o.visible = false;
      } else {
        dodged++; bonus += 0.6; streak++; setStreak(); dashT = 0.45;
        pops.push({ x: p.x, y: p.y - 90, txt: "+CLEAR", c: "#7ff9ff", l: 1 });
        fxs.push({ k: "burst", x: p.x, y: p.y, r: 34, c: "#bff8ff", l: 0.8, d: 0, vy: 0 });
      }
    }
    if (o.position.z > 8) { world.remove(o); orbs.splice(i, 1); }
  }

  // sky + sea
  skyMat.uniforms.uK.value = outroK; seaMat.uniforms.uK.value = outroK;
  skyMat.uniforms.uT.value = T; seaMat.uniforms.uT.value = T;
  scene.fog.density = 0.011 * (1 - outroK);
  scene.background.setRGB(0.02 * (1 - outroK), 0.008 * (1 - outroK), 0.047 * (1 - outroK));

  // ---- Greg ----
  const gx = pxS * LANE * (1 - outroK);
  greg.position.set(gx, -1.3 * camE * (1 - outroK) + Math.sin(T * 3) * 0.05 * camE * (1 - outroK), 0);
  greg.rotation.z = -tilt * 0.08 * camE * (1 - outroK);
  aura.material.opacity = (0.18 + pulse * 0.15) * (state === "end" ? 0 : 1);
  let want = "fly";
  if (si === 0 && camE > 0.95 && t < 8) want = "stand";
  if (si === 2) want = "arms";
  if (waveT > 0) want = "arms";
  if (dashT > 0) want = "dash";
  if (outroK > 0.35) want = "back";
  else if (impact > 0.35) want = "hit";
  else if (vel > 0.45) want = "steer-right";
  else if (vel < -0.45) want = "steer-left";
  dashT = Math.max(0, dashT - dt);
  const covK = Math.max(0, 1 - camE * 1.6);
  let best = "fly", bw = -1;
  for (const k in POSE) {
    const target = k === "coverCut" ? covK : (k === want ? 1 - covK : 0);
    poseW[k] += (target - poseW[k]) * Math.min(1, dt * (k === "coverCut" ? 30 : 10));
    POSE[k].material.opacity = poseW[k];
    if (k !== "coverCut" && poseW[k] > bw) { bw = poseW[k]; best = k; }
  }
  if (best !== ghostName) { ghostName = best; ghost.material.map = POSE[best].material.map; ghost.scale.x = POSE[best].scale.x; }
  ghost.material.opacity = Math.min(0.7, haze * 0.9 + impact * 0.5) * (1 - covK);
  ghost.position.set(Math.sin(T * 1.7) * (haze * 0.25 + impact * 0.3), Math.cos(T * 1.3) * haze * 0.06, -0.01);
  // billboard toward the camera (upright)
  card.scale.setScalar(lerp(1, 1.4, camE) * (1 - outroK * 0.15));
  card.rotation.y = Math.atan2(camera.position.x - greg.position.x, camera.position.z - greg.position.z);

  // ---- cover words: in place for the cover, then they fly past the camera ----
  if (tICan) {
    const k = camE;
    tICan.position.set(lerp(-2.25, -9, k), lerp(0.87, 1.6, k), lerp(0.3, 7, k));
    tFeel.position.set(lerp(2.49, 10, k), lerp(0.87, 1.6, k), lerp(0.3, 7, k));
    tLogo.position.set(lerp(0.37, 0, k), lerp(4.42, 8, k), lerp(0.2, 3, k));
    const op = Math.max(0, 1 - k * 1.4);
    tICan.material.opacity = tFeel.material.opacity = tLogo.material.opacity = op;
    coverTxt.visible = op > 0.01;
  }

  // ---- camera ----
  const k = camE;
  const gameLookX = gx * 0.55, gamePosX = gx * 0.75;
  camera.position.set(
    lerp(camCover.pos.x, gamePosX, k) + (Math.random() - .5) * shake * 0.08,
    lerp(camCover.pos.y, camGame.pos.y, k) + lerp(0, -0.55, outroK),
    lerp(coverDist(), camGame.pos.z + (W < H ? 2.6 : 0), k) + outroK * 1.2);
  look.set(lerp(camCover.look.x, gameLookX, k), lerp(camCover.look.y, camGame.look.y, k) + outroK * 0.7, lerp(camCover.look.z, camGame.look.z, k));
  camera.lookAt(look);
  camera.rotateZ(Math.sin(T * 0.7) * haze * 0.05 + (state === "start" ? 0 : -tilt * 0.03 * k));
  camera.fov = lerp(COVER_FOV, 62 + Math.min(14, speed * 0.08), k) * (1 - outroK * 0.1); camera.updateProjectionMatrix();

  // ---- post ----
  after.uniforms.damp.value = Math.min(0.93, (state === "start" ? 0.3 : 0.5) + haze * 0.38) * (1 - outroK * 0.5);
  bloom.threshold = lerp(0.88, 0.6, camE) + outroK * 0.25;
  bloom.strength = (0.55 + pulse * 0.15 + bassNow * 0.15) * (1 - haze * 0.25) * (si === 3 ? 0.7 : 1);
  rgb.uniforms.amount.value = 0.0006 + haze * 0.004 + impact * 0.009;
  composer.render(dt);

  flashEl.style.opacity = flash;
  app.style.setProperty("--imp", impact.toFixed(3));
  draw2D(dt);
  drawWave();
  if (state === "play" && !ended && song.duration && song.currentTime >= song.duration - 0.25) finish();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- 2D overlay: pops + dopamine moments ----------
function draw2D(dt) {
  f2.clearRect(0, 0, W, H);
  f2.globalCompositeOperation = "lighter";
  for (let i = fxs.length - 1; i >= 0; i--) {
    const e = fxs[i];
    if (e.d > 0) { e.d -= dt; continue; }
    e.l -= dt; if (e.l <= 0) { fxs.splice(i, 1); continue; }
    e.y += e.vy * dt;
    const age = 1 - e.l, a = Math.min(1, e.l * 2.2);
    f2.save(); f2.translate(e.x, e.y); f2.globalAlpha = a;
    f2.shadowColor = e.c; f2.shadowBlur = 18; f2.strokeStyle = f2.fillStyle = e.c;
    if (e.k === "burst") {
      const R = e.r * (0.6 + age * 1.4); f2.lineWidth = 2;
      for (let j = 0; j < 12; j++) { const an = j / 12 * 6.283, L = j % 2 ? R * 0.55 : R;
        f2.beginPath(); f2.moveTo(Math.cos(an) * R * 0.15, Math.sin(an) * R * 0.15); f2.lineTo(Math.cos(an) * L, Math.sin(an) * L); f2.stroke(); }
      f2.fillStyle = "#fff"; f2.beginPath(); f2.arc(0, 0, 4 + (1 - age) * 4, 0, 6.283); f2.fill();
    } else if (e.k === "star4") {
      const R = e.r * (0.4 + Math.sin(Math.min(1, age * 1.4) * Math.PI) * 0.8);
      f2.rotate(age * 0.6); f2.beginPath();
      for (let j = 0; j < 4; j++) { const an = j * Math.PI / 2;
        f2.lineTo(Math.cos(an) * R, Math.sin(an) * R); f2.lineTo(Math.cos(an + Math.PI / 4) * R * 0.18, Math.sin(an + Math.PI / 4) * R * 0.18); }
      f2.closePath(); f2.fill();
    } else if (e.k === "heart") {
      const R = e.r * (0.7 + Math.min(1, age * 3) * 0.4); f2.lineWidth = 3; f2.beginPath();
      f2.moveTo(0, R * 0.35);
      f2.bezierCurveTo(-R * 1.1, -R * 0.35, -R * 0.45, -R * 1.05, 0, -R * 0.45);
      f2.bezierCurveTo(R * 0.45, -R * 1.05, R * 1.1, -R * 0.35, 0, R * 0.35);
      f2.stroke(); f2.globalAlpha = a * 0.25; f2.fill();
    }
    f2.restore();
  }
  f2.globalCompositeOperation = "source-over";
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.l -= dt * 1.1; if (p.l <= 0) { pops.splice(i, 1); continue; }
    p.y -= dt * 60;
    f2.globalAlpha = Math.min(1, p.l * 2); f2.fillStyle = p.c; f2.shadowColor = p.c; f2.shadowBlur = 14;
    f2.font = "italic 800 18px Montserrat, sans-serif"; f2.textAlign = "center"; f2.fillText(p.txt, p.x, p.y);
  }
  f2.shadowBlur = 0; f2.globalAlpha = 1;
}
function drawWave() {
  if (!analyser || state !== "play") return;
  const d = Math.min(devicePixelRatio, 2), ww = wave.width, wh = wave.height, n = Math.min(150, Math.floor(ww / (5 * d))), step = ww / n;
  wctx.clearRect(0, 0, ww, wh);
  const grad = wctx.createLinearGradient(0, 0, ww, 0);
  grad.addColorStop(0, "#ff3b6b"); grad.addColorStop(0.3, "#ff2bd6"); grad.addColorStop(0.6, "#a64bff"); grad.addColorStop(1, "#00e5ff");
  wctx.strokeStyle = grad; wctx.lineCap = "round"; wctx.lineWidth = 1.6 * d;
  wctx.shadowColor = "rgba(255,60,220,.9)"; wctx.shadowBlur = 6 * d;
  wctx.beginPath();
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), dd = Math.abs(u - 0.5) * 2;
    const v = freq[2 + Math.floor(dd * 90 + (i % 3))] / 255;
    const env = 0.3 + 0.7 * Math.exp(-dd * dd * 3.2);
    const h = Math.max(1.5 * d, Math.pow(v, 1.4) * wh * 0.95 * env), x = i * step + step / 2;
    wctx.moveTo(x, (wh - h) / 2); wctx.lineTo(x, (wh + h) / 2);
  }
  wctx.stroke();
  wctx.shadowBlur = 0; wctx.globalAlpha = 0.35; wctx.lineWidth = d;
  wctx.beginPath(); wctx.moveTo(0, wh / 2); wctx.lineTo(ww, wh / 2); wctx.stroke(); wctx.globalAlpha = 1;
}

// ---------- share card ----------
$("#shareBtn").addEventListener("click", async () => {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1920;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, "#14063a"); bg.addColorStop(.55, "#2a0830"); bg.addColorStop(1, "#05020c");
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
  const img = new Image(); img.src = "img/cover.jpg"; await img.decode().catch(() => {});
  g.save(); g.shadowColor = "rgba(255,40,160,.8)"; g.shadowBlur = 60; g.drawImage(img, 140, 220, 800, 800); g.restore();
  g.strokeStyle = "rgba(255,79,216,.9)"; g.lineWidth = 4; g.strokeRect(140, 220, 800, 800);
  g.textAlign = "center"; g.fillStyle = "#d7fbff"; g.font = "800 44px Montserrat, sans-serif"; g.fillText("MY CLARITY", 540, 1170);
  g.font = '400 280px "Bebas Neue", sans-serif'; g.fillStyle = "#e8fdff"; g.shadowColor = "#00e5ff"; g.shadowBlur = 40;
  g.fillText(Math.round(clarity) + "%", 540, 1400); g.shadowBlur = 0;
  g.font = '400 150px "Bebas Neue", sans-serif'; g.fillStyle = "#fff"; g.shadowColor = "rgba(255,90,200,.6)"; g.shadowBlur = 24;
  g.fillText("I CAN FEEL IT", 540, 1590); g.shadowBlur = 0;
  g.font = "800 44px Montserrat, sans-serif"; g.fillStyle = "#fff";
  const w1 = g.measureText("GREG").width, w2 = g.measureText("+ECOZ").width, x0 = 540 - (w1 + w2 + 16) / 2;
  g.textAlign = "left"; g.fillText("GREG", x0, 1720);
  g.fillStyle = "#e8101e"; g.fillRect(x0 + w1 + 4, 1676, w2 + 12, 58); g.fillStyle = "#fff"; g.fillText("+ECOZ", x0 + w1 + 10, 1720);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const file = new File([blob], "i-can-feel-it-clarity.png", { type: "image/png" });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: "I can feel it. " + location.href }); return; } }
  catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
});
