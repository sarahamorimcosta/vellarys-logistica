/* Vellarys · "Do espaço ao contêiner"
   Mundo 3D low-poly feito todo em código (three.js 0.160).
   Empresa fictícia · projeto conceito por Sarah Amorim */
import * as THREE from "three";
import CONTINENTES from "./continentes.js";

const html = document.documentElement;
const MOBILE = matchMedia("(max-width: 600px)").matches;
const FORCAR = /[?&]forcar3d=1/.test(location.search);
const DPR = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 1.75);
const SOMBRAS = !MOBILE;
const GRAU = Math.PI / 180;
const U = { tempo: { value: 0 } };
const cor = h => new THREE.Color(h);
const { lerp, clamp } = THREE.MathUtils;
const suave = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------------------------------------------------------- acaso e ruído */
function semente(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function h3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function ruido3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
    l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
}
function fbm3(x, y, z, o = 4) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * ruido3(x * f, y * f, z * f); n += a; f *= 2.03; a *= .5; } return s / n; }
const fbm2 = (x, y, o = 4) => fbm3(x, y, .37, o);

/* ---------------------------------------------------------------- paletas por horário */
const PAL = {
  madrugada: { topo: "#050c1a", horiz: "#1a2c45", baixo: "#040a12", sol: "#a9bde0", solI: .5, ceuLuz: "#3a5378", chao: "#0b1620", ambI: .7, elev: 32, azim: 200, agua: "#0b2a3a", nevoa: "#15263b", noite: 1, hora: 3.5 },
  amanhecer: { topo: "#203a63", horiz: "#f4b183", baixo: "#3a3442", sol: "#ffc89c", solI: 2.1, ceuLuz: "#a7b4cf", chao: "#3b3534", ambI: .8, elev: 7, azim: 150, agua: "#1d4a5e", nevoa: "#d9b29a", noite: .4, hora: 6.2 },
  dia: { topo: "#2b6f9f", horiz: "#cfe5ec", baixo: "#7a99a2", sol: "#fff4e2", solI: 2.8, ceuLuz: "#bfdbe6", chao: "#55625b", ambI: 1.05, elev: 48, azim: 35, agua: "#0f5068", nevoa: "#c6dbe1", noite: 0, hora: 12 },
  entardecer: { topo: "#1f2b58", horiz: "#f39563", baixo: "#40303a", sol: "#ff9a5a", solI: 2.2, ceuLuz: "#9a8aa8", chao: "#3b2f30", ambI: .75, elev: 6, azim: -150, agua: "#22445a", nevoa: "#d39a80", noite: .5, hora: 17.8 },
  noite: { topo: "#040b18", horiz: "#162b47", baixo: "#03070d", sol: "#b4c6e6", solI: .55, ceuLuz: "#36507a", chao: "#0b141c", ambI: .7, elev: 38, azim: 160, agua: "#0a2433", nevoa: "#12233a", noite: 1, hora: 21 },
};
function vetorSol(elev, azim) { const e = elev * GRAU, a = azim * GRAU; return V(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).normalize(); }
function faseInicial() { try { return (window.VELLARYS && window.VELLARYS.faseAtual()) || "dia"; } catch (e) { return "dia"; } }
function faseManual() { try { return localStorage.getItem("vellarys-fase"); } catch (e) { return null; } }

/* ---------------------------------------------------------------- texturas */
const TEX = {};
function canvasTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function novoCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function texBrilho() {
  if (TEX.brilho) return TEX.brilho;
  const [c, g] = novoCanvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.18, "rgba(255,255,255,.8)"); gr.addColorStop(.45, "rgba(255,255,255,.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (TEX.brilho = canvasTex(c));
}
function texOndulada() {
  if (TEX.ond) return TEX.ond;
  const [c, g] = novoCanvas(128, 64);
  g.fillStyle = "#fff"; g.fillRect(0, 0, 128, 64);
  for (let x = 0; x < 128; x += 8) { g.fillStyle = "rgba(0,0,0,.16)"; g.fillRect(x, 0, 2, 64); g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(x + 2, 0, 2, 64); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(x + 5, 0, 1, 64); }
  g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(0, 0, 128, 4); g.fillRect(0, 60, 128, 4);
  const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1);
  return (TEX.ond = t);
}
function desenharLogo(g, x, y, s, cor1, cor2) {
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  g.strokeStyle = cor1; g.lineWidth = 1.6; g.beginPath(); g.arc(20, 20, 18, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = .5; g.lineWidth = 1; g.beginPath(); g.ellipse(20, 20, 8.5, 18, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  g.strokeStyle = cor2; g.lineWidth = 3.4; g.lineJoin = "miter"; g.beginPath(); g.moveTo(8.5, 9.5); g.lineTo(20, 28); g.lineTo(31.5, 9.5); g.stroke();
  g.fillStyle = cor2; g.fillRect(16.6, 28.4, 6.8, 4.6); g.restore();
}
function nervuras(g, w, h, passo, vertical = true) {
  for (let i = 0; i < (vertical ? w : h); i += passo) {
    const gr = vertical ? g.createLinearGradient(i, 0, i + passo, 0) : g.createLinearGradient(0, i, 0, i + passo);
    gr.addColorStop(0, "rgba(0,0,0,.18)"); gr.addColorStop(.35, "rgba(255,255,255,.08)"); gr.addColorStop(.7, "rgba(0,0,0,.04)"); gr.addColorStop(1, "rgba(0,0,0,.18)");
    g.fillStyle = gr; vertical ? g.fillRect(i, 0, passo, h) : g.fillRect(0, i, w, passo);
  }
}
const LARANJA = "#e2571f";
function texVellarysLado() {
  if (TEX.lado) return TEX.lado;
  const [c, g] = novoCanvas(2048, 512);
  g.fillStyle = LARANJA; g.fillRect(0, 0, 2048, 512);
  nervuras(g, 2048, 512, 32);
  g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(0, 0, 2048, 22); g.fillRect(0, 490, 2048, 22); g.fillRect(0, 0, 24, 512); g.fillRect(2024, 0, 24, 512);
  desenharLogo(g, 300, 140, 230, "#fff", "#fff");
  g.fillStyle = "#fff"; g.textBaseline = "middle";
  g.font = "800 150px Manrope, Arial, sans-serif";
  try { g.letterSpacing = "30px"; } catch (e) { /* ok */ }
  g.fillText("VELLARYS", 600, 248);
  g.font = "500 40px 'DM Mono', monospace"; try { g.letterSpacing = "12px"; } catch (e) { /* ok */ }
  g.globalAlpha = .9; g.fillText("INTERNATIONAL LOGISTICS", 606, 358); g.globalAlpha = 1;
  try { g.letterSpacing = "4px"; } catch (e) { /* ok */ }
  g.font = "400 50px 'Saira Stencil One', monospace";
  g.fillText("VLYU 202604", 1590, 92); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(1912, 62, 46, 60); g.fillText("6", 1922, 92);
  g.font = "400 40px 'Saira Stencil One', monospace"; g.fillText("45G1", 1590, 150);
  return (TEX.lado = canvasTex(c));
}
function texVellarysPorta() {
  if (TEX.porta) return TEX.porta;
  const [c, g] = novoCanvas(512, 512);
  g.fillStyle = LARANJA; g.fillRect(0, 0, 512, 512);
  nervuras(g, 512, 512, 26, false);
  g.fillStyle = "rgba(0,0,0,.34)"; g.fillRect(0, 0, 512, 18); g.fillRect(0, 494, 512, 18); g.fillRect(0, 0, 18, 512); g.fillRect(494, 0, 18, 512); g.fillRect(250, 0, 12, 512);
  [78, 190, 322, 434].forEach(x => { g.fillStyle = "#b9b9b4"; g.fillRect(x - 5, 18, 10, 476); g.fillStyle = "#7b7d7a"; g.fillRect(x - 12, 250, 24, 40); g.fillRect(x - 9, 60, 18, 14); g.fillRect(x - 9, 440, 18, 14); });
  desenharLogo(g, 110, 92, 50, "#fff", "#fff"); desenharLogo(g, 352, 92, 50, "#fff", "#fff");
  g.fillStyle = "#fff"; g.font = "400 24px 'Saira Stencil One', monospace"; g.textBaseline = "middle"; g.fillText("VLYU 202604 6", 300, 180); g.fillText("45G1", 300, 210);
  return (TEX.porta = canvasTex(c));
}
function texChao() {
  if (TEX.chao) return TEX.chao;
  const [c, g] = novoCanvas(1024, 1024);
  const r = semente(5);
  g.fillStyle = "#7e8588"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < .5 ? "0,0,0" : "255,255,255"},${r() * .05})`; const s = 4 + r() * 40; g.fillRect(r() * 1024, r() * 1024, s, s); }
  g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 2;
  for (let x = 0; x <= 1024; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  for (let y = 0; y <= 1024; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.fillStyle = "#d9ad38";
  g.fillRect(0, 300, 1024, 10); g.fillRect(0, 724, 1024, 10);
  for (let x = 40; x < 1024; x += 80) { g.fillRect(x, 508, 44, 8); }
  g.strokeStyle = "#d9ad38"; g.lineWidth = 6; g.strokeRect(392, 400, 240, 224);
  g.fillStyle = "rgba(217,173,56,.85)";
  for (let i = 0; i < 9; i++) { g.save(); g.translate(400 + i * 28, 404); g.rotate(-.6); g.fillRect(0, 0, 8, 26); g.restore(); }
  const t = canvasTex(c);
  return (TEX.chao = t);
}
function texEstrada() {
  if (TEX.estrada) return TEX.estrada;
  const [c, g] = novoCanvas(128, 512);
  g.fillStyle = "#2b3135"; g.fillRect(0, 0, 128, 512);
  const r = semente(3);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${r() * .05})`; g.fillRect(r() * 128, r() * 512, 2, 2); }
  g.fillStyle = "#e9ebe6"; g.fillRect(6, 0, 4, 512); g.fillRect(118, 0, 4, 512);
  g.fillStyle = "#e2b23a"; g.fillRect(60, 0, 3, 512); g.fillRect(65, 0, 3, 512);
  const t = canvasTex(c); t.wrapT = THREE.RepeatWrapping;
  return (TEX.estrada = t);
}

/* ---------------------------------------------------------------- peças comuns */
const CAIXA = new THREE.BoxGeometry(1, 1, 1);
function brilho(corH, tam, base = 1, tipo = "noturna") {
  const m = new THREE.SpriteMaterial({ map: texBrilho(), color: corH, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: base, fog: false });
  const s = new THREE.Sprite(m); s.scale.setScalar(tam); s.userData = { base, tipo, fase: Math.random() * 10 };
  return s;
}
function em(o, x, y, z) { o.position.set(x, y, z); return o; }
function barraMatriz(p1, p2, esp, m4) {
  const d = p2.clone().sub(p1), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d.normalize());
  return m4.compose(p1.clone().add(p2).multiplyScalar(.5), q, V(esp, esp, len));
}
function barra(p1, p2, esp, mat) { const m = new THREE.Mesh(CAIXA, mat); barraMatriz(p1, p2, esp, new THREE.Matrix4()).decompose(m.position, m.quaternion, m.scale); m.castShadow = true; return m; }
function caixa(g, mat, w, h, d, x, y, z, sombra = true) { const m = new THREE.Mesh(CAIXA, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = sombra; g.add(m); return m; }
const PALETA_CONT = ["#e2571f", "#e2571f", "#e2571f", "#1f5f73", "#2c3e48", "#8b2f22", "#c9c2b0", "#3e6b4f", "#5b6f7a", "#b8862f", "#1f5f73", "#2c3e48"];
let MAT_CONT;
function matConteiner() { return MAT_CONT || (MAT_CONT = new THREE.MeshStandardMaterial({ map: texOndulada(), roughness: .62, metalness: .25 })); }
let MATS_VEL;
function matsVellarys() {
  if (MATS_VEL) return MATS_VEL;
  const lado = new THREE.MeshStandardMaterial({ map: texVellarysLado(), roughness: .55, metalness: .2 });
  const topo = new THREE.MeshStandardMaterial({ map: texOndulada(), color: "#c94b1a", roughness: .6, metalness: .2 });
  const porta = new THREE.MeshStandardMaterial({ map: texVellarysPorta(), roughness: .55, metalness: .2 });
  return (MATS_VEL = { lado, topo, porta, lista: [porta, topo, topo, topo, lado, lado] });
}
function conteinerVellarys() { const m = new THREE.Mesh(new THREE.BoxGeometry(12.19, 2.9, 2.44), matsVellarys().lista); m.castShadow = true; m.receiveShadow = true; return m; }

function criarCeu(raio) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { topo: { value: cor("#2b6f9f") }, horiz: { value: cor("#cfe5ec") }, baixo: { value: cor("#7a99a2") }, solDir: { value: V(0, 1, 0) }, solCor: { value: cor("#ffffff") }, noite: { value: 0 } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: `uniform vec3 topo, horiz, baixo, solDir, solCor; uniform float noite; varying vec3 vDir;
      float hh(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h > 0. ? mix(horiz, topo, pow(clamp(h,0.,1.), .5)) : mix(horiz, baixo, pow(clamp(-h*3.,0.,1.), .6));
        float s = max(dot(d, normalize(solDir)), 0.);
        c += solCor * (pow(s, 900.) * 5. + pow(s, 40.) * .28 + pow(s, 5.) * .12);
        if (noite > .01) { vec3 q = floor(d * 420.); float r = hh(q); float st = smoothstep(.9972, 1., r) * smoothstep(.03, .3, h); c += vec3(.85,.9,1.) * st * noite * 1.6; }
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(raio, 32, 16), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

function criarAgua(tam, seg, amp) {
  const geo = new THREE.PlaneGeometry(tam, tam, seg, seg); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: "#0f5068", roughness: .26, metalness: .1, flatShading: true });
  const nav = [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0));
  mat.userData.nav = nav;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = U.tempo; sh.uniforms.uNav = { value: nav }; sh.uniforms.uAmp = { value: amp };
    sh.vertexShader = "uniform float uT; uniform float uAmp; uniform vec4 uNav[4]; varying float vEspuma;\n" + sh.vertexShader.replace("#include <begin_vertex>", `
      vec3 transformed = vec3(position);
      vec4 wp = modelMatrix * vec4(position, 1.);
      float x = wp.x, z = wp.z;
      float h = sin(x*.045 + uT*.9)*1.1 + sin(z*.06 - uT*1.1 + x*.02)*.8 + sin((x+z)*.11 + uT*1.7)*.35 + sin((x*.7-z)*.19 - uT*2.3)*.18;
      h *= uAmp;
      float esp = smoothstep(1.9, 2.6, h) * .12;
      for (int i = 0; i < 4; i++) {
        vec4 n = uNav[i];
        if (n.w > 0.) {
          vec2 dir = vec2(cos(n.z), -sin(n.z));
          vec2 rel = vec2(x, z) - n.xy;
          float along = dot(rel, dir);
          float lat = dot(rel, vec2(-dir.y, dir.x));
          float L = n.w;
          float casco = exp(-pow(along/(L*.55), 2.)) * exp(-pow(lat/(L*.1), 2.));
          h -= casco * 1.1;
          float proa = exp(-pow((along - L*.48)/(L*.07), 2.)) * exp(-pow(lat/(L*.13), 2.));
          h += proa * 1.5;
          float ab = max(-along - L*.45, 0.);
          float atras = step(0., -along - L*.45);
          float braco = abs(abs(lat) - ab*.36);
          float onda = exp(-braco*braco/(6. + ab*.1)) * exp(-ab*.0035) * atras;
          h += onda * sin(ab*.32 - uT*4.) * 1.1;
          float centro = exp(-lat*lat/(30. + ab*.6)) * exp(-ab*.005) * atras;
          esp += onda*.85 + centro*.9 + proa*.9 + casco*.4;
        }
      }
      transformed.y += h;
      vEspuma = clamp(esp, 0., 1.);`);
    sh.fragmentShader = "varying float vEspuma;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86,.95,.97), vEspuma*.8);");
  };
  const m = new THREE.Mesh(geo, mat);
  const longe = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#0f5068", roughness: .4, metalness: .05 }));
  longe.position.y = -2.2; m.add(longe); m.userData.longe = longe;
  m.userData.celula = tam / seg;
  m.receiveShadow = false;
  return m;
}

function criarNavio(L = 150, opc = {}) {
  const r = semente(opc.seed || 7);
  const g = new THREE.Group();
  const W = L * .15, H = L * .1;
  const s = new THREE.Shape(); const b = L * .17;
  s.moveTo(-L / 2, -W / 2 * .9); s.lineTo(-L / 2 + 3, -W / 2); s.lineTo(L / 2 - b, -W / 2);
  s.quadraticCurveTo(L / 2 - b * .15, -W / 2 * .7, L / 2, 0); s.quadraticCurveTo(L / 2 - b * .15, W / 2 * .7, L / 2 - b, W / 2);
  s.lineTo(-L / 2 + 3, W / 2); s.lineTo(-L / 2, W / 2 * .9); s.closePath();
  const gc = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false, curveSegments: 5 }); gc.rotateX(-Math.PI / 2); gc.translate(0, -H * .55, 0);
  const casco = new THREE.Mesh(gc, new THREE.MeshStandardMaterial({ color: opc.casco || "#16252d", roughness: .55, metalness: .35, flatShading: true }));
  casco.castShadow = true; g.add(casco);
  const gb = new THREE.ExtrudeGeometry(s, { depth: H * .14, bevelEnabled: false, curveSegments: 5 }); gb.rotateX(-Math.PI / 2); gb.scale(1.006, 1, 1.03); gb.translate(0, -H * .1, 0);
  g.add(new THREE.Mesh(gb, new THREE.MeshStandardMaterial({ color: "#8a2a1e", roughness: .7, flatShading: true })));
  const conves = H * .45;
  // contêineres no convés
  const xi = -L * .29, xf = L * .33, nb = Math.max(2, Math.floor((xf - xi) / 13.4));
  const fileiras = Math.max(3, Math.floor((W * .9) / 2.6));
  const lista = [];
  for (let i = 0; i < nb; i++) {
    const x = xi + (i + .5) * (xf - xi) / nb;
    const proa = suave(L * .2, L * .36, x);
    for (let j = 0; j < fileiras; j++) {
      const z = (j - (fileiras - 1) / 2) * 2.6;
      const borda = Math.abs(j - (fileiras - 1) / 2) / ((fileiras - 1) / 2 || 1);
      let n = Math.round(2 + r() * 3.4 - proa * 2.4 - borda * borda * 1.5 + (opc.cheio ? 1 : 0));
      n = clamp(n, 1, 6);
      for (let k = 0; k < n; k++) lista.push([x, conves + 1.45 + k * 2.9, z]);
    }
  }
  const im = new THREE.InstancedMesh(CAIXA, matConteiner(), lista.length);
  const m4 = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion(), esc = V(12.19 * .97, 2.9 * .97, 2.44 * .98);
  lista.forEach((p, i) => { m4.compose(V(...p), q, esc); im.setMatrixAt(i, m4); c.set(PALETA_CONT[Math.floor(r() * PALETA_CONT.length)]); im.setColorAt(i, c); });
  im.castShadow = true; im.receiveShadow = true; g.add(im);
  // ponte de comando
  const branco = new THREE.MeshStandardMaterial({ color: "#e8ecea", roughness: .6, flatShading: true });
  const xp = -L * .37;
  caixa(g, branco, L * .07, H * 1.9, W * .92, xp, conves + H * .95, 0);
  caixa(g, branco, L * .11, H * .25, W * 1.05, xp, conves + H * 1.95, 0);
  const janela = new THREE.MeshStandardMaterial({ color: "#0c1a20", emissive: "#ffd39a", emissiveIntensity: .2, roughness: .3 });
  caixa(g, janela, L * .072, H * .16, W * .93, xp, conves + H * 1.72, 0, false);
  caixa(g, new THREE.MeshStandardMaterial({ color: "#1d2b32", roughness: .6 }), L * .035, H * .9, W * .25, xp - L * .055, conves + H * 1.5, 0);
  g.userData.janelas = [janela];
  // luzes de navegação
  const topoP = conves + H * 2.1;
  const luzes = [
    em(brilho("#ff3b2f", 5, .9, "sempre"), xp, topoP, -W * .55),
    em(brilho("#3dff8a", 5, .9, "sempre"), xp, topoP, W * .55),
    em(brilho("#ffffff", 6, 1, "pisca"), xp, topoP + 6, 0),
    em(brilho("#fff4d8", 4, .8, "sempre"), L * .46, conves + 9, 0),
    em(brilho("#ffffff", 3.5, .7, "noturna"), -L * .5, conves + 1, 0),
  ];
  caixa(g, branco, .5, 9, .5, L * .46, conves + 4.5, 0);
  caixa(g, branco, .5, 6, .5, xp, topoP + 3, 0);
  luzes.forEach(l => g.add(l));
  g.userData.luzes = luzes; g.userData.L = L;
  return g;
}

function criarCaminhao(opc = {}) {
  const g = new THREE.Group();
  const cab = new THREE.MeshStandardMaterial({ color: opc.corCabine || "#e6eae9", roughness: .45, metalness: .3, flatShading: true });
  const escuro = new THREE.MeshStandardMaterial({ color: "#1a2328", roughness: .7 });
  const vidro = new THREE.MeshStandardMaterial({ color: "#0d1b22", roughness: .15, metalness: .6 });
  caixa(g, escuro, 17.5, .6, 2.3, -1.2, 1.25, 0);                // chassi
  caixa(g, cab, 2.6, 2.9, 2.5, 8.2, 2.7, 0);                     // cabine
  caixa(g, cab, 1.2, 1.4, 2.5, 9.7, 1.9, 0);                     // capô
  caixa(g, vidro, .12, 1.1, 2.2, 9.53, 3.35, 0, false);          // para-brisa
  caixa(g, escuro, .35, .9, 2.52, 6.95, 3.2, 0, false);
  const roda = new THREE.CylinderGeometry(.55, .55, .5, 10); roda.rotateX(Math.PI / 2);
  const mRoda = new THREE.MeshStandardMaterial({ color: "#121619", roughness: .9 });
  [[8.8, 1.2], [8.8, -1.2], [4.8, 1.2], [4.8, -1.2], [-6, 1.2], [-6, -1.2], [-7.3, 1.2], [-7.3, -1.2], [-8.6, 1.2], [-8.6, -1.2]].forEach(([x, z]) => { const w = new THREE.Mesh(roda, mRoda); w.position.set(x, .55, z); g.add(w); });
  const ct = opc.carga === "bau" ? null : conteinerVellarys();
  if (ct) { ct.position.set(-1.6, 3.05, 0); g.add(ct); }
  else caixa(g, new THREE.MeshStandardMaterial({ color: "#dfe3e2", roughness: .6 }), 13, 3, 2.5, -1.6, 3.1, 0);
  const luzes = [brilho("#fff1cc", 3, 1, "noturna"), brilho("#fff1cc", 3, 1, "noturna"), brilho("#ff2a1a", 1.6, 1, "noturna"), brilho("#ff2a1a", 1.6, 1, "noturna"), brilho("#ffb020", 1.4, .9, "pisca")];
  luzes[0].position.set(10.4, 1.7, .95); luzes[1].position.set(10.4, 1.7, -.95);
  luzes[2].position.set(-10, 1.4, 1.05); luzes[3].position.set(-10, 1.4, -1.05); luzes[4].position.set(8.2, 4.35, 0);
  luzes.forEach(l => g.add(l));
  g.userData.luzes = luzes;
  return g;
}

function criarEmpilhadeira() {
  const g = new THREE.Group();
  const amarelo = new THREE.MeshStandardMaterial({ color: "#e0ad3a", roughness: .5, metalness: .2, flatShading: true });
  const escuro = new THREE.MeshStandardMaterial({ color: "#1b2327", roughness: .7 });
  caixa(g, amarelo, 2.4, 1.2, 1.4, 0, .9, 0);
  caixa(g, escuro, 1.0, 1.2, 1.42, -.9, 1.1, 0);
  [[-.4, .62], [-.4, -.62], [.9, .62], [.9, -.62]].forEach(([x, z]) => { const p = barra(V(x, 1.5, z), V(x, 2.9, z), .08, escuro); g.add(p); });
  caixa(g, amarelo, 1.5, .1, 1.4, .25, 2.95, 0);
  caixa(g, escuro, .12, 3.4, .9, 1.3, 1.8, 0);
  const garfo = new THREE.Group(); g.add(garfo);
  caixa(garfo, escuro, 1.3, .08, .18, 2.0, .3, .35); caixa(garfo, escuro, 1.3, .08, .18, 2.0, .3, -.35);
  caixa(garfo, new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: .9 }), 1.2, .16, 1.1, 2.0, .44, 0);
  caixa(garfo, new THREE.MeshStandardMaterial({ color: "#b48a5a", roughness: .85, flatShading: true }), 1.1, .9, 1.0, 2.0, .98, 0);
  const roda = new THREE.CylinderGeometry(.32, .32, .3, 10); roda.rotateX(Math.PI / 2);
  [[-.7, .6], [-.7, -.6], [.8, .6], [.8, -.6]].forEach(([x, z]) => { const w = new THREE.Mesh(roda, escuro); w.position.set(x, .32, z); g.add(w); });
  const giro = brilho("#ffae1f", 1.6, 1, "pisca"); giro.position.set(.2, 3.15, 0); g.add(giro);
  g.userData = { garfo, luzes: [giro] };
  return g;
}

function criarAviao() {
  const g = new THREE.Group();
  const branco = new THREE.MeshStandardMaterial({ color: "#eef1f2", roughness: .4, metalness: .3, flatShading: true });
  const cinza = new THREE.MeshStandardMaterial({ color: "#9aa6ab", roughness: .5, metalness: .4, flatShading: true });
  const fus = new THREE.CylinderGeometry(1.9, 1.9, 30, 10); fus.rotateZ(Math.PI / 2);
  g.add(new THREE.Mesh(fus, branco));
  const nariz = new THREE.ConeGeometry(1.9, 5, 10); nariz.rotateZ(-Math.PI / 2); const mn = new THREE.Mesh(nariz, branco); mn.position.x = 17.5; g.add(mn);
  const cauda = new THREE.ConeGeometry(1.9, 7, 10); cauda.rotateZ(Math.PI / 2); const mc = new THREE.Mesh(cauda, branco); mc.position.x = -18.5; g.add(mc);
  caixa(g, branco, 7, .45, 36, 0, -.6, 0, false);
  caixa(g, branco, 3.6, .3, 12, -18.5, .6, 0, false);
  const leme = caixa(g, new THREE.MeshStandardMaterial({ color: "#13586b", roughness: .5, flatShading: true }), 5, 7, .4, -18.8, 3.6, 0, false); leme.rotation.z = -.35;
  const mot = new THREE.CylinderGeometry(.9, .9, 4, 10); mot.rotateZ(Math.PI / 2);
  [-7, 7].forEach(z => { const m = new THREE.Mesh(mot, cinza); m.position.set(1.5, -1.6, z); g.add(m); });
  const luzes = [em(brilho("#ff3b2f", 3, 1, "sempre"), 0, -.4, -18.2), em(brilho("#3dff8a", 3, 1, "sempre"), 0, -.4, 18.2),
    em(brilho("#ffffff", 4, 1, "pisca"), -21, 1, 0), em(brilho("#fff6dd", 9, .9, "sempre"), 19.5, -.8, 0)];
  luzes.forEach(l => g.add(l));
  g.userData.luzes = luzes;
  return g;
}

/* ---------------------------------------------------------------- base dos mundos */
class Mundo {
  constructor(opc) {
    this.opc = opc || {};
    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, .5, 4000);
    this.noturnas = []; this.janelas = []; this.lampadas = []; this.piscas = [];
    this.w = 1; this.h = 1; this.noite = 0;
    this.ponteiro = { x: 0, y: 0, sx: 0, sy: 0 };
  }
  montarLuz() {
    this.hemi = new THREE.HemisphereLight("#bfdbe6", "#55625b", 1);
    this.sol = new THREE.DirectionalLight("#fff4e2", 2.5);
    this.cena.add(this.hemi, this.sol, this.sol.target);
  }
  sombra(lado, alcance = 900) {
    if (!SOMBRAS) return;
    this.sol.castShadow = true;
    const s = this.sol.shadow; s.mapSize.set(2048, 2048); s.bias = -.0006; s.normalBias = .4;
    Object.assign(s.camera, { left: -lado, right: lado, top: lado, bottom: -lado, near: 1, far: alcance }); s.camera.updateProjectionMatrix();
  }
  registrarLuzes(lista) { lista.forEach(l => { if (l.userData.tipo === "pisca") this.piscas.push(l); this.noturnas.push(l); }); }
  aplicarFase(f) {
    const P = PAL[f] || PAL.dia; this.fase = f; this.P = P;
    const sd = vetorSol(P.elev, P.azim);
    if (this.ceu) {
      const u = this.ceu.material.uniforms;
      u.topo.value.set(P.topo); u.horiz.value.set(P.horiz); u.baixo.value.set(P.baixo);
      u.solCor.value.set(P.sol).multiplyScalar(P.noite > .8 ? .35 : 1); u.solDir.value.copy(sd); u.noite.value = P.noite;
    }
    if (this.sol) { this.sol.color.set(P.sol); this.sol.intensity = P.solI * (this.fatorSol || 1); const a = this.alvoSol || V(); this.sol.position.copy(sd).multiplyScalar(400).add(a); this.sol.target.position.copy(a); }
    if (this.hemi) { this.hemi.color.set(P.ceuLuz); this.hemi.groundColor.set(P.chao); this.hemi.intensity = P.ambI * (this.fatorAmb || 1); }
    if (this.cena.fog) this.cena.fog.color.set(P.nevoa);
    if (this.agua) { this.agua.material.color.set(P.agua); this.agua.userData.longe.material.color.set(P.agua); }
    this.noite = P.noite;
    this.janelas.forEach(m => { m.emissiveIntensity = .12 + P.noite * 1.7; });
    this.lampadas.forEach(l => { l.intensity = l.userData.base * (l.userData.dia ?? 0) + l.userData.base * P.noite; });
    this.atualizarLuzes(0);
    if (this.extraFase) this.extraFase(P);
  }
  atualizarLuzes(t) {
    const n = this.noite;
    for (const s of this.noturnas) {
      const u = s.userData;
      let o = u.tipo === "sempre" ? .35 + .65 * n : u.tipo === "pisca" ? .5 + .5 * n : n;
      if (u.tipo === "pisca") o *= ((t * .9 + u.fase) % 1) < .1 ? 1 : .08;
      s.material.opacity = u.base * o;
    }
  }
  redimensionar(w, h) { if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); } }
  seguirCeu() { if (this.ceu) this.ceu.position.copy(this.camera.position); }
  olhar(pos, alvo) {
    const p = this.ponteiro; p.sx += (p.x - p.sx) * .05; p.sy += (p.y - p.sy) * .05;
    this.camera.position.copy(pos);
    if (p.sx || p.sy) { const dir = alvo.clone().sub(pos); const lado = V().crossVectors(dir, V(0, 1, 0)).normalize(); this.camera.position.addScaledVector(lado, p.sx * dir.length() * .04).add(V(0, -p.sy * dir.length() * .025, 0)); }
    this.camera.lookAt(alvo);
  }
}

/* ---------------------------------------------------------------- 1 · GLOBO */
function latLonVec(lat, lon, r = 1) { const f = (90 - lat) * GRAU, t = (lon + 180) * GRAU; return V(-r * Math.sin(f) * Math.cos(t), r * Math.cos(f), r * Math.sin(f) * Math.sin(t)); }
function vecLatLon(v) { const r = v.length(); return { lat: 90 - Math.acos(clamp(v.y / r, -1, 1)) / GRAU, lon: Math.atan2(v.z, -v.x) / GRAU - 180 }; }
let MASCARA;
function mascaraTerra() {
  if (MASCARA) return MASCARA;
  const W = 2048, H = 1024; const [c, g] = novoCanvas(W, H);
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff";
  Object.values(CONTINENTES).forEach(pol => { g.beginPath(); pol.forEach(([lo, la], i) => { const x = (lo + 180) / 360 * W, y = (90 - la) / 180 * H; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); });
  const d = g.getImageData(0, 0, W, H).data;
  MASCARA = (lat, lon) => { let x = Math.floor(((lon + 540) % 360) / 360 * W), y = Math.floor((90 - lat) / 180 * H); x = clamp(x, 0, W - 1); y = clamp(y, 0, H - 1); return d[(y * W + x) * 4] / 255; };
  return MASCARA;
}
const LUGAR = { vitoria: [-20.32, -40.34], serra: [-20.12, -40.3], roterda: [51.95, 4.14], entrega: [51.88, 4.6], xangai: [31.23, 121.47], saopaulo: [-23.55, -46.63], bh: [-19.92, -43.94] };
const ROTAS = {
  europa: { pts: [[-20.32, -40.34], [-17, -35.5], [-6, -30.5], [8, -26.5], [24, -19.5], [36, -12.5], [44, -9.6], [48.4, -5.8], [50.1, -1.2], [51.3, 2.4], [51.95, 4.14]], alt: .012, tipo: "mar" },
  asia: { pts: [[-20.32, -40.34], [-27, -30], [-33, -8], [-36.5, 20], [-33, 40], [-20, 64], [-6, 84], [5, 93], [6.3, 96.5], [3.6, 100], [1.25, 103.8], [6, 107.5], [13, 111.5], [21, 116.5], [27.5, 121.8], [31.23, 122]], alt: .012, tipo: "mar" },
  sp: { pts: [[-20.32, -40.34], [-21.4, -41.1], [-22.5, -42.4], [-22.9, -43.5], [-23.2, -45], [-23.55, -46.63]], alt: .004, tipo: "estrada" },
  bh: { pts: [[-20.32, -40.34], [-20.45, -41.0], [-20.3, -41.8], [-20.05, -42.9], [-19.92, -43.94]], alt: .004, tipo: "estrada" },
};
function slerpVec(a, b, t) { const o = a.angleTo(b); if (o < 1e-6) return a.clone(); const s = Math.sin(o); return a.clone().multiplyScalar(Math.sin((1 - t) * o) / s).add(b.clone().multiplyScalar(Math.sin(t * o) / s)); }
function amostrarRota(pts, R, alt) {
  const brutos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = latLonVec(...pts[i]), b = latLonVec(...pts[i + 1]);
    const n = Math.max(2, Math.ceil(a.angleTo(b) / (1.2 * GRAU)));
    for (let k = 0; k < n; k++) brutos.push(slerpVec(a, b, k / n));
  }
  brutos.push(latLonVec(...pts[pts.length - 1]));
  return brutos.map((v, i) => { const s = i / (brutos.length - 1); return v.normalize().multiplyScalar(R * (1.005 + alt * Math.sin(Math.PI * s))); });
}

class MundoGlobo extends Mundo {
  constructor(opc) {
    super(opc);
    const R = this.R = 10;
    this.cena.background = cor("#01070c");
    this.camera.near = .05; this.camera.far = 3000; this.camera.updateProjectionMatrix();
    this.terra = new THREE.Group(); this.cena.add(this.terra);
    const mask = mascaraTerra();
    const geo = new THREE.IcosahedronGeometry(R, MOBILE ? 22 : 32);
    const pos = geo.attributes.position, n = pos.count, v = V();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const ll = vecLatLon(v); const m = mask(ll.lat, ll.lon);
      const a = m > .5 ? 1.004 + fbm3(v.x * 3 + 5, v.y * 3, v.z * 3, 4) * .017 + (Math.abs(ll.lat) > 64 ? .004 : 0) : 1;
      pos.setXYZ(i, v.x * R * a, v.y * R * a, v.z * R * a);
    }
    const cols = new Float32Array(n * 3), c = cor("#000"), a = V(), b = V(), d = V();
    const tA = cor("#2d5452"), tB = cor("#5a7e6b"), tC = cor("#8f8a66"), gelo = cor("#d5e4e8"), mA = cor("#082f42"), mB = cor("#0e4a62"), raso = cor("#17677a");
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); d.fromBufferAttribute(pos, i + 2);
      const ce = a.add(b).add(d).divideScalar(3); const ll = vecLatLon(ce);
      const m = mask(ll.lat, ll.lon), ru = fbm3(ce.x * .4, ce.y * .4, ce.z * .4, 3), j = (h3(i, 7, 3) - .5) * (m > .5 ? .05 : .022);
      if (m > .5) {
        if (Math.abs(ll.lat) > 62) c.copy(gelo);
        else { c.copy(tA).lerp(tB, ru); const seco = suave(.5, .7, fbm3(ce.x * .25 + 9, ce.y * .25, ce.z * .25, 2)) * suave(14, 2, Math.min(Math.abs(ll.lat - 23), Math.abs(ll.lat + 25))); c.lerp(tC, seco * .85); }
      } else {
        c.copy(mA).lerp(mB, suave(.3, .7, ru) * .8);
        let costa = 0; for (const [dl, dn] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]]) costa = Math.max(costa, mask(ll.lat + dl, ll.lon + dn));
        if (costa > .5) c.lerp(raso, .55);
      }
      c.offsetHSL(0, 0, j);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (i + k) * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    this.terra.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .8, metalness: 0 })));

    this.solDir = { value: V(1, 0, 0) };
    // luzes das cidades no lado noturno
    {
      const N = MOBILE ? 1100 : 2600, r = semente(11), p = [], br = [];
      let tent = 0;
      while (p.length < N * 3 && tent++ < N * 60) {
        const lat = Math.asin(2 * r() - 1) / GRAU, lon = r() * 360 - 180;
        if (Math.abs(lat) > 60 || mask(lat, lon) < .5) continue;
        const w = latLonVec(lat, lon, 1);
        if (fbm3(w.x * 6, w.y * 6, w.z * 6, 3) < .52) continue;
        const q = latLonVec(lat, lon, R * 1.013); p.push(q.x, q.y, q.z); br.push(.4 + r() * .9);
      }
      const gp = new THREE.BufferGeometry(); gp.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); gp.setAttribute("brilho", new THREE.Float32BufferAttribute(br, 1));
      const mp = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { solDir: this.solDir, tam: { value: 2.4 * DPR } },
        vertexShader: `uniform vec3 solDir; uniform float tam; attribute float brilho; varying float vA;
          void main(){ vec3 nW = normalize((modelMatrix * vec4(position,1.)).xyz); float noite = smoothstep(.02, -.22, dot(nW, solDir));
            vec4 mv = modelViewMatrix * vec4(position,1.); vA = noite * brilho; gl_PointSize = clamp(tam * (26. / -mv.z) * brilho, 1., 9.); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d) * vA; gl_FragColor = vec4(vec3(1., .78, .46) * a, a); }",
      });
      this.terra.add(new THREE.Points(gp, mp));
    }
    // atmosfera
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.17, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { cor: { value: cor("#5ab8e4") }, solDir: this.solDir },
      vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = normalize((modelMatrix * vec4(position,1.)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "uniform vec3 cor; uniform vec3 solDir; varying vec3 vN; varying vec3 vW; void main(){ float i = pow(clamp(.74 - dot(vN, vec3(0.,0.,1.)), 0., 1.), 3.2); float l = .1 + .9 * smoothstep(-.45, .55, dot(vW, solDir)); gl_FragColor = vec4(cor * i * 1.35 * l, 1.); }",
    }));
    this.cena.add(atm);
    const aro = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 32), new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { solDir: this.solDir },
      vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = normalize((modelMatrix * vec4(position,1.)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: "uniform vec3 solDir; varying vec3 vN; varying vec3 vW; void main(){ float f = pow(1. - abs(dot(vN, vec3(0.,0.,1.))), 3.); float l = .15 + .85 * smoothstep(-.3, .5, dot(vW, solDir)); vec3 c = vec3(.45,.75,.95) * f * l * .9; gl_FragColor = vec4(c, 1.); }",
    }));
    this.cena.add(aro);
    // nuvens low-poly
    {
      const r = semente(41), puf = [], centros = [];
      for (let i = 0; i < (MOBILE ? 34 : 60); i++) centros.push([Math.asin(2 * r() - 1) / GRAU * .9, r() * 360 - 180, 1]);
      for (let i = 0; i < 4; i++) centros.push([-12 + (r() - .5) * 14, -31 + (r() - .5) * 14, .6]);
      centros.forEach(([la, lo, k]) => { const nn = 4 + Math.floor(r() * 6 * k); for (let j = 0; j < nn; j++) puf.push([la + (r() - .5) * 6, lo + (r() - .5) * 8, .07 + r() * .15]); });
      const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: "#eef4f6", flatShading: true, roughness: 1, transparent: true, opacity: .78, depthWrite: false }), puf.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
      puf.forEach(([la, lo, s], i) => { const p = latLonVec(la, lo, R * (1.028 + r() * .02)); q.setFromUnitVectors(V(0, 1, 0), p.clone().normalize()); q2.setFromAxisAngle(V(0, 1, 0), r() * 6); q.multiply(q2); m4.compose(p, q, V(s * 1.5, s * .32, s * 1.1)); im.setMatrixAt(i, m4); });
      this.nuvens = new THREE.Group(); this.nuvens.add(im); this.terra.add(this.nuvens);
    }
    // estrelas
    {
      const r = semente(2), p = [];
      for (let i = 0; i < 3000; i++) { const v2 = V(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(700 + r() * 400); p.push(v2.x, v2.y, v2.z); }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      this.cena.add(new THREE.Points(g2, new THREE.PointsMaterial({ color: "#cfe3ff", size: 1.4 * DPR, sizeAttenuation: false, transparent: true, opacity: .75, depthWrite: false })));
    }
    // sol
    this.sol = new THREE.DirectionalLight("#fff4e6", 3.4); this.cena.add(this.sol);
    this.cena.add(new THREE.AmbientLight("#4d6f94", 2.1));
    this.solBrilho = brilho("#ffe9c4", 260, 1, "fixa"); this.cena.add(this.solBrilho);
    // rotas
    this.rotas = {};
    for (const [k, def] of Object.entries(ROTAS)) {
      const curva = new THREE.CatmullRomCurve3(amostrarRota(def.pts, R, def.alt));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uT: U.tempo, uForca: { value: 1 }, uCor: { value: cor(def.tipo === "mar" ? "#ff6a2b" : "#bfe3e0") }, uVel: { value: def.tipo === "mar" ? .22 : .5 }, uRep: { value: def.tipo === "mar" ? 5 : 2 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
        fragmentShader: `uniform float uT, uForca, uVel, uRep; uniform vec3 uCor; varying vec2 vUv;
          void main(){ float x = vUv.x; float p = fract(x * uRep - uT * uVel); float pulso = smoothstep(0., .015, p) * (1. - smoothstep(.015, .22, p));
            float a = (.5 + pulso * 2.4) * uForca * smoothstep(0., .015, x) * smoothstep(1., .985, x);
            gl_FragColor = vec4(uCor * a, a); }`,
      });
      const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, def.tipo === "mar" ? 420 : 80, def.tipo === "mar" ? .028 : .02, 6, false), mat);
      this.terra.add(tubo);
      this.rotas[k] = { curva, mat, def };
    }
    // marcadores
    const vix = latLonVec(...LUGAR.vitoria, R * 1.006);
    this.marcaVix = brilho("#ff6a2b", .9, 1, "fixa"); this.marcaVix.position.copy(vix); this.terra.add(this.marcaVix);
    const anel = new THREE.Mesh(new THREE.RingGeometry(.12, .16, 40), new THREE.MeshBasicMaterial({ color: "#ff6a2b", transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    anel.position.copy(latLonVec(...LUGAR.vitoria, R * 1.008)); anel.lookAt(V()); this.anel = anel; this.terra.add(anel);
    this.destinos = ["roterda", "xangai", "saopaulo", "bh"].map(k => { const s = brilho("#bfe3e0", .45, .9, "fixa"); s.position.copy(latLonVec(...LUGAR[k], R * 1.006)); this.terra.add(s); return s; });
    // navios minúsculos nas rotas marítimas
    this.pontosNavio = [];
    ["europa", "asia"].forEach(k => { for (let i = 0; i < 3; i++) { const s = brilho("#ffffff", .22, .95, "fixa"); this.terra.add(s); this.pontosNavio.push({ s, k, off: i / 3 + Math.random() * .1 }); } });
    // contêiner do rastreio
    this.marcaCarga = new THREE.Group();
    const cx = new THREE.Mesh(CAIXA, new THREE.MeshStandardMaterial({ color: "#ff6a2b", emissive: "#ff6a2b", emissiveIntensity: .6 })); cx.scale.set(.16, .07, .07); this.marcaCarga.add(cx);
    this.marcaCarga.add(brilho("#ff8a4c", .9, 1, "fixa"));
    this.marcaCarga.visible = false; this.terra.add(this.marcaCarga);

    const az = (lon, lat = 0) => { const p = latLonVec(lat, lon); return Math.atan2(p.x, p.z); };
    this.rot0 = -az(-30);
    this.travado = false;
    this.passoAlvo = -1; this.m = 0;
    this.horaFase();
  }
  horaFase(f) {
    // posição real do Sol (ou do horário escolhido no relógio)
    let utcH;
    const man = faseManual();
    if (man && PAL[man]) utcH = PAL[man].hora + 3;
    else { const d = new Date(); utcH = d.getUTCHours() + d.getUTCMinutes() / 60; }
    const inicio = new Date(new Date().getUTCFullYear(), 0, 0), dia = Math.floor((Date.now() - inicio) / 864e5);
    const decl = 23.44 * Math.sin(2 * Math.PI * (284 + dia) / 365);
    this.solLocal = latLonVec(decl, (12 - utcH) * 15, 1);
  }
  aplicarFase(f) { this.fase = f; this.horaFase(f); }
  mundo(v) { return v.clone().applyQuaternion(this.terra.quaternion); }
  atualizar(t) {
    if (!this.travado) this.terra.rotation.y = this.rot0 + t * .006;
    this.terra.updateMatrixWorld();
    const sw = this.mundo(this.solLocal);
    this.solDir.value.copy(sw); this.sol.position.copy(sw).multiplyScalar(50);
    this.solBrilho.position.copy(sw).multiplyScalar(900);
    const frente = -sw.dot(this.camera.position.clone().normalize());
    this.solBrilho.visible = false; void frente;
    this.nuvens.rotation.y = t * .0035;
    const pul = (t * .55) % 1; this.anel.scale.setScalar(1 + pul * 2.4); this.anel.material.opacity = (1 - pul) * .9;
    this.marcaVix.material.opacity = .75 + Math.sin(t * 3) * .25;
    this.pontosNavio.forEach(n => { const u = (t * .006 + n.off) % 1; n.s.position.copy(this.rotas[n.k].curva.getPointAt(u)); });
    if (this.opc.modo === "rastreio") this.passoRastreio(t);
  }
  destacar(k) { Object.entries(this.rotas).forEach(([kk, r]) => { r.mat.uniforms.uForca.value = !k || kk === k ? 1 : .16; }); }
  posCarga(m) {
    const c = this.rotas.europa.curva;
    if (m <= 1) return latLonVec(...LUGAR.serra, this.R * 1.01).lerp(c.getPointAt(0), m);
    if (m <= 3) return c.getPointAt(clamp((m - 1) / 2, 0, 1));
    return c.getPointAt(1).lerp(latLonVec(...LUGAR.entrega, this.R * 1.01), m - 3);
  }
  passoRastreio(t) {
    this.travado = true;
    this.terra.rotation.y = -Math.atan2(latLonVec(18, -20).x, latLonVec(18, -20).z);
    this.terra.updateMatrixWorld();
    const alvo = this.passoAlvo;
    if (alvo < 0) {
      this.marcaCarga.visible = false;
      this.camera.clearViewOffset();
      const meio = this.mundo(this.rotas.europa.curva.getPointAt(.5));
      const dir = meio.clone().normalize();
      const pos = dir.clone().multiplyScalar(27).add(V(Math.sin(t * .15) * 1.5, 1.5, 0));
      this.olhar(pos, V(0, 0, 0).lerp(meio, .35));
      return;
    }
    this.marcaCarga.visible = true;
    this.m += (alvo - this.m) * .025;
    if (Math.abs(alvo - this.m) < .001) this.m = alvo;
    const pL = this.posCarga(this.m);
    this.marcaCarga.position.copy(pL);
    const ahead = this.posCarga(Math.min(this.m + .05, 4));
    this.marcaCarga.lookAt(ahead);
    const pw = this.mundo(pL);
    const longe = Math.sin(Math.PI * clamp((this.m - 1) / 2, 0, 1));
    const dist = 13.6 + longe * 10.5;
    const dir = pw.clone().normalize();
    const pos = dir.clone().multiplyScalar(dist).add(V(0, -1.2 - longe * 2, 0)).add(V(Math.sin(t * .2) * .4, 0, 0));
    this.olhar(pos, pw.clone().multiplyScalar(.6 + .2 * (1 - longe)));
  }
  etapa(id, p) {
    const R = this.R;
    if (id === "espaco") {
      const e = easeSine(p);
      const dA = latLonVec(10, -28), dB = latLonVec(-16.5, -36.5);
      const dir = this.mundo(slerpVec(dA, dB, Math.pow(e, 1.25)));
      const dist = R * 1.07 + ((MOBILE ? 46 : 40) - R * 1.07) * Math.pow(1 - e, 1.3);
      const frente = this.mundo(latLonVec(-10, -30, R));
      const alvo = V().lerp(frente, suave(.5, 1, p) * .92);
      this.olhar(dir.multiplyScalar(dist), alvo);
      const k = 1 - suave(.05, .7, p);
      if (MOBILE) this.camera.setViewOffset(this.w, this.h, 0, this.h * .14 * k, this.w, this.h);
      else this.camera.setViewOffset(this.w, this.h, -this.w * .21 * k, 0, this.w, this.h);
    } else {
      // celular: o Atlântico visto do alto, seguindo a rota para a Europa
      this.camera.clearViewOffset();
      const e = easeSine(p);
      const dir = this.mundo(slerpVec(latLonVec(-16.5, -36.5), latLonVec(-2, -30.5), e));
      const dist = R * (1.07 + .1 * e);
      const alvo = this.mundo(latLonVec(4 + e * 6, -28.5, R));
      this.olhar(dir.multiplyScalar(dist), alvo);
    }
  }
  mini(t) {
    this.camera.clearViewOffset();
    if (this.opc.modo === "rastreio") return;
    const k = this.opc.rota || "europa";
    this.destacar(k);
    const c = this.rotas[k].curva;
    const meio = this.mundo(c.getPointAt(.5)), ini = this.mundo(c.getPointAt(0));
    const estrada = ROTAS[k].tipo === "estrada";
    const foco = estrada ? ini.clone().lerp(this.mundo(c.getPointAt(1)), .5) : meio.clone().lerp(ini, .25);
    const dist = estrada ? 13.2 : (k === "asia" ? 33 : 29);
    this.travado = true;
    const giro = Math.sin(t * .08) * .12;
    this.terra.rotation.y = this.rot0b ?? (this.rot0b = this.terra.rotation.y);
    const dir = foco.clone().normalize().applyAxisAngle(V(0, 1, 0), giro);
    this.olhar(dir.multiplyScalar(dist).add(V(0, estrada ? -.6 : -1, 0)), foco.clone().multiplyScalar(estrada ? .9 : .4));
    if (this.w > 1024) this.camera.setViewOffset(this.w, this.h, -this.w * .2, 0, this.w, this.h);
  }
  prepararMini() {
    if (this.opc.modo === "rastreio") return;
    const k = this.opc.rota || "europa";
    const c = this.rotas[k].curva;
    const alvo = c.getPointAt(ROTAS[k].tipo === "estrada" ? .5 : .4);
    const p = alvo.clone().normalize();
    this.rot0b = -Math.atan2(p.x, p.z) + (k === "asia" ? .25 : 0);
  }
}

/* ---------------------------------------------------------------- 2 · OCEANO */
class MundoOceano extends Mundo {
  constructor(opc) {
    super(opc);
    this.montarLuz();
    this.ceu = criarCeu(2700); this.cena.add(this.ceu);
    this.cena.fog = new THREE.Fog("#c6dbe1", 260, 1900);
    this.camera.far = 3200; this.camera.updateProjectionMatrix();
    this.agua = criarAgua(1500, MOBILE ? 100 : 210, 1); this.cena.add(this.agua);
    this.navios = [
      { g: criarNavio(165, { seed: 3, cheio: true }), z: 0, v: 7.2, off: 0, rumo: 0 },
      { g: criarNavio(125, { seed: 9 }), z: -330, v: 6.3, off: -420, rumo: 0 },
      { g: criarNavio(185, { seed: 5 }), z: 460, v: 5.4, off: 900, rumo: Math.PI },
      { g: criarNavio(110, { seed: 13 }), z: -820, v: 5, off: 700, rumo: Math.PI },
    ];
    this.navios.forEach(n => { n.g.rotation.y = n.rumo; this.cena.add(n.g); this.registrarLuzes(n.g.userData.luzes); this.janelas.push(...n.g.userData.janelas); });
    this.lider = this.navios[0];
  }
  atualizar(t) {
    const nav = this.agua.material.userData.nav;
    const xl = t * this.lider.v;
    this.navios.forEach((n, i) => {
      let x;
      if (i === 0) x = xl;
      else { const rel = n.off + (n.rumo === 0 ? n.v - this.lider.v : -n.v - this.lider.v) * t; x = xl + (((rel + 1600) % 3200) + 3200) % 3200 - 1600; }
      n.g.position.set(x, Math.sin(t * .7 + i) * .35, n.z);
      n.g.rotation.z = Math.sin(t * .5 + i) * .012; n.g.rotation.x = Math.sin(t * .6 + i * 2) * .008;
      nav[i].set(x, n.z, n.rumo, n.g.userData.L);
    });
    this.atualizarLuzes(t);
  }
  posAgua() { const c = this.agua.userData.celula; this.agua.position.set(Math.round(this.camera.position.x / c) * c, 0, Math.round(this.camera.position.z / c) * c); this.seguirCeu(); }
  etapa(id, p) {
    this.camera.clearViewOffset();
    const sx = this.lider.g.position.x, e = easeSine(p);
    const a = V(sx - 30, 420, 230), b = V(sx - 300, 140, 250), c = V(sx - 165, 17, 78);
    const pos = a.clone().multiplyScalar((1 - e) * (1 - e)).add(b.multiplyScalar(2 * e * (1 - e))).add(c.multiplyScalar(e * e));
    const alvo = V(sx + 10, 0, 0).lerp(V(sx + 130, 8, -30), e);
    this.olhar(pos, alvo);
    this.posAgua();
  }
  mini(t) {
    const sx = this.lider.g.position.x, a = t * .05;
    const pos = V(sx - 150 + Math.sin(a) * 40, 24 + Math.sin(a * 1.3) * 5, 92 + Math.cos(a) * 26);
    this.olhar(pos, V(sx + 30, 8, -10));
    this.posAgua();
  }
}

/* ---------------------------------------------------------------- 3 · PORTO */
function criarGuindaste(r) {
  const g = new THREE.Group();
  const mB = new THREE.MeshStandardMaterial({ color: "#dfe5e4", roughness: .55, metalness: .3, flatShading: true });
  const mL = new THREE.MeshStandardMaterial({ color: "#e2571f", roughness: .5, metalness: .3, flatShading: true });
  for (const x of [-9, 9]) for (const z of [-22, -4]) caixa(g, mB, 1.7, 44, 1.7, x, 22, z);
  caixa(g, mB, 20, 2, 2, 0, 43, -22); caixa(g, mB, 20, 2, 2, 0, 43, -4);
  caixa(g, mB, 2, 2, 20, -9, 43, -13); caixa(g, mB, 2, 2, 20, 9, 43, -13);
  caixa(g, mB, 20, 1.2, 1.2, 0, 13, -22); caixa(g, mB, 20, 1.2, 1.2, 0, 13, -4);
  caixa(g, mB, 1.6, 2.6, 132, -3.4, 46, 8); caixa(g, mB, 1.6, 2.6, 132, 3.4, 46, 8);
  caixa(g, mB, 9.5, 5.5, 14, 0, 49.5, -47);
  const apice = V(0, 70, -13);
  [[-8, -22], [8, -22], [-8, -4], [8, -4]].forEach(([x, z]) => g.add(barra(V(x, 44, z), apice, 1.2, mB)));
  [[0, 47, 73], [0, 47, 38], [0, 47, -50]].forEach(p => g.add(barra(apice, V(...p), .45, mB)));
  caixa(g, mL, 8, 3, 4, 0, 46, 73);
  const trolley = caixa(g, mL, 7.5, 2.4, 5, 0, 43.6, 30);
  const cabo = caixa(g, new THREE.MeshStandardMaterial({ color: "#20282c" }), .25, 1, .25, 0, 30, 30, false);
  const spreader = caixa(g, mL, 12.6, .8, 2.7, 0, 25, 30);
  const carga = new THREE.Mesh(CAIXA, new THREE.MeshStandardMaterial({ map: texOndulada(), color: PALETA_CONT[Math.floor(r() * PALETA_CONT.length)], roughness: .6, metalness: .25 }));
  carga.scale.set(12.19, 2.9, 2.44); carga.castShadow = true; g.add(carga);
  const topo = em(brilho("#ff3b2f", 5, 1, "pisca"), 0, 71.5, -13);
  const holofotes = [10, 40, 64].map(z => em(brilho("#ffe2a6", 9, .9, "noturna"), 0, 44.4, z));
  [topo, ...holofotes].forEach(l => g.add(l));
  g.userData = { trolley, cabo, spreader, carga, luzes: [topo, ...holofotes], off: r() };
  return g;
}
function animarGuindaste(g, t) {
  const u = g.userData, c = (t * .055 + u.off) % 1;
  const lerpS = (a, b, x) => a + (b - a) * easeSine(clamp(x, 0, 1));
  let z, cabo, leva;
  if (c < .15) { z = 30; cabo = lerpS(6, 30, c / .15); leva = false; }
  else if (c < .26) { z = 30; cabo = lerpS(30, 6, (c - .15) / .11); leva = true; }
  else if (c < .5) { z = lerpS(30, -13, (c - .26) / .24); cabo = 6; leva = true; }
  else if (c < .62) { z = -13; cabo = lerpS(6, 36, (c - .5) / .12); leva = true; }
  else if (c < .72) { z = -13; cabo = lerpS(36, 6, (c - .62) / .1); leva = false; }
  else { z = lerpS(-13, 30, (c - .72) / .28); cabo = 6; leva = false; }
  u.trolley.position.z = z; u.spreader.position.set(0, 42.4 - cabo, z);
  u.cabo.position.set(0, 42.4 - cabo / 2, z); u.cabo.scale.y = cabo;
  u.carga.visible = leva; u.carga.position.set(0, 42.4 - cabo - 1.9, z);
}

class MundoPorto extends Mundo {
  constructor(opc) {
    super(opc);
    const r = semente(21);
    this.montarLuz();
    this.alvoSol = V(0, 0, -60); this.sombra(280, 1000);
    this.ceu = criarCeu(2700); this.cena.add(this.ceu);
    this.cena.fog = new THREE.Fog("#c6dbe1", 380, 2300);
    this.camera.far = 3400; this.camera.updateProjectionMatrix();
    this.agua = criarAgua(2600, MOBILE ? 90 : 170, .5); this.agua.position.set(0, 0, 500); this.cena.add(this.agua);

    // terreno: pátio plano, morros atrás, Mestre Álvaro ao fundo
    const altura = (x, z) => {
      const d = -z;
      let morro = fbm2(x * .004 + 3, z * .004, 4) * 120 + fbm2(x * .013, z * .013, 3) * 34;
      morro += 330 * Math.exp(-((x + 360) ** 2 + (z + 800) ** 2) / (2 * 175 * 175));
      morro += 150 * Math.exp(-(((x - 460) / 260) ** 2) - (((z + 640) / 150) ** 2));
      return 2.2 + suave(270, 360, d) * morro;
    };
    const tg = new THREE.PlaneGeometry(2600, 1500, MOBILE ? 70 : 130, MOBILE ? 40 : 75); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -750);
    const tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setY(i, altura(tp.getX(i), tp.getZ(i)));
    const tn = tg.toNonIndexed(), tq = tn.attributes.position, tc = new Float32Array(tq.count * 3), cc = cor("#000");
    const paving = cor("#3f494d"), verde1 = cor("#4b6a5a"), verde2 = cor("#617c66"), rocha = cor("#7d8681");
    for (let i = 0; i < tq.count; i += 3) {
      const y = (tq.getY(i) + tq.getY(i + 1) + tq.getY(i + 2)) / 3, x = tq.getX(i), z = tq.getZ(i);
      if (y < 3) cc.copy(paving).offsetHSL(0, 0, (h3(i, 1, 2) - .5) * .03);
      else { cc.copy(verde1).lerp(verde2, fbm2(x * .01, z * .01, 2)); cc.lerp(rocha, suave(110, 260, y)); cc.offsetHSL(0, 0, (h3(i, 3, 4) - .5) * .05); }
      for (let k = 0; k < 3; k++) tc.set([cc.r, cc.g, cc.b], (i + k) * 3);
    }
    tn.setAttribute("color", new THREE.BufferAttribute(tc, 3));
    const terreno = new THREE.Mesh(tn, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 }));
    terreno.receiveShadow = true; this.cena.add(terreno);
    const concreto = new THREE.MeshStandardMaterial({ color: "#a7aeae", roughness: .9, flatShading: true });
    caixa(this.cena, concreto, 2600, 12, 3, 0, -3.8, -1.2, false);
    caixa(this.cena, new THREE.MeshStandardMaterial({ color: "#d9ad38", roughness: .8 }), 520, .1, .5, 0, 2.26, -1.6, false);

    // pedra granítica na entrada da baía
    {
      const gp = new THREE.IcosahedronGeometry(1, 2); const pp = gp.attributes.position;
      for (let i = 0; i < pp.count; i++) { const v = V().fromBufferAttribute(pp, i); const k = 1 + (fbm3(v.x * 2, v.y * 2, v.z * 2, 3) - .5) * .35; pp.setXYZ(i, v.x * k, Math.max(v.y * k, -.3), v.z * k); }
      gp.computeVertexNormals();
      const mp = new THREE.MeshStandardMaterial({ color: "#7c837f", roughness: .9, flatShading: true });
      [[430, 150, 75, 105, 62], [520, 90, 36, 44, 30]].forEach(([x, z, sx, sy, sz]) => { const m = new THREE.Mesh(gp, mp); m.scale.set(sx, sy, sz); m.position.set(x, -6, z); m.castShadow = true; this.cena.add(m); });
    }

    // pátio de contêineres
    {
      const lista = [];
      for (let bx = -250; bx <= 250; bx += 13.4) {
        if (Math.abs(bx - 115) < 16) continue;
        for (let bz = -30; bz >= -172; bz -= 2.7) {
          const bloco = Math.floor((-bz - 30) / 2.7);
          if (bloco % 8 === 7) continue;
          const n = Math.round(clamp(fbm2(bx * .02, bz * .04, 2) * 6.2 - 1 + (r() - .5) * 1.6, 0, MOBILE ? 3 : 5));
          for (let k = 0; k < n; k++) lista.push([bx, 2.2 + 1.45 + k * 2.9, bz]);
        }
      }
      const im = new THREE.InstancedMesh(CAIXA, matConteiner(), lista.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = V(12.19 * .97, 2.9 * .97, 2.44 * .96);
      lista.forEach((p, i) => { m4.compose(V(...p), q, e); im.setMatrixAt(i, m4); cc.set(PALETA_CONT[Math.floor(r() * PALETA_CONT.length)]); im.setColorAt(i, cc); });
      im.castShadow = true; im.receiveShadow = true; this.cena.add(im);
    }
    // galpão com porta acesa (a câmera entra por ela)
    {
      const g = new THREE.Group(); g.position.set(115, 2.2, -235);
      const mp = new THREE.MeshStandardMaterial({ color: "#4a5a60", roughness: .7, flatShading: true });
      caixa(g, mp, 70, 18, 80, 0, 9, 0);
      for (let i = 0; i < 5; i++) { const s = new THREE.Shape(); s.moveTo(-8, 0); s.lineTo(8, 0); s.lineTo(8, 6); s.closePath(); const gg = new THREE.ExtrudeGeometry(s, { depth: 80, bevelEnabled: false }); const m = new THREE.Mesh(gg, mp); m.position.set(-28 + i * 14, 18, -40); m.castShadow = true; g.add(m); }
      caixa(g, new THREE.MeshStandardMaterial({ color: LARANJA, roughness: .6 }), 70.4, 1.4, 80.4, 0, 16.5, 0, false);
      const porta = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ color: "#2b2117", emissive: "#ffcf8a", emissiveIntensity: 1.1 }));
      porta.position.set(0, 6, 40.05); g.add(porta); this.portaGalpao = porta;
      const b = brilho("#ffcf8a", 30, .55, "sempre"); b.position.set(0, 6, 44); g.add(b); this.noturnas.push(b);
      this.cena.add(g);
    }
    // cidade (ilha de Vitória) à esquerda
    {
      const lista = [];
      for (let i = 0; i < (MOBILE ? 120 : 260); i++) { const x = -380 - r() * 420, z = -20 - r() * 260, h = 8 + Math.pow(r(), 2) * 70; lista.push([x, h, z, 8 + r() * 12, 8 + r() * 12]); }
      const im = new THREE.InstancedMesh(CAIXA, new THREE.MeshStandardMaterial({ roughness: .8, flatShading: true }), lista.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pts = [];
      const tons = ["#cfd5d4", "#b4bec1", "#e5e0d6", "#9aa7ab", "#d8cfc0"];
      lista.forEach(([x, h, z, w, d], i) => {
        m4.compose(V(x, 2.2 + h / 2, z), q, V(w, h, d)); im.setMatrixAt(i, m4); cc.set(tons[i % 5]); im.setColorAt(i, cc);
        for (let k = 0; k < h / 5; k++) if (r() < .55) pts.push(x + (r() - .5) * w, 4 + k * 5 + r() * 2, z + d / 2 + .2);
      });
      im.castShadow = true; im.receiveShadow = true; this.cena.add(im);
      const gp = new THREE.BufferGeometry(); gp.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      this.janelasCidade = new THREE.Points(gp, new THREE.PointsMaterial({ color: "#ffd69a", size: 1.6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.cena.add(this.janelasCidade);
    }
    // ponte alta sobre o canal (lembrança da Terceira Ponte)
    {
      const mp = new THREE.MeshStandardMaterial({ color: "#b7bebe", roughness: .8, flatShading: true });
      const A = V(-470, 0, -10), B = V(-250, 0, 820), N = 36, pts = [];
      for (let i = 0; i <= N; i++) { const s = i / N; const p = A.clone().lerp(B, s); p.y = 6 + 62 * Math.pow(Math.sin(Math.PI * s), 1.4); pts.push(p); }
      for (let i = 0; i < N; i++) {
        const seg = barra(pts[i], pts[i + 1], 1, mp); seg.scale.x = 9; seg.scale.y = 2.4; this.cena.add(seg);
        if (i % 3 === 0 && i > 0) caixa(this.cena, mp, 4, pts[i].y + 6, 5, pts[i].x, pts[i].y / 2 - 3, pts[i].z);
        if (i % 2 === 0) { const l = brilho("#ffd59a", 4, .9, "noturna"); l.position.copy(pts[i]).add(V(0, 3, 0)); this.cena.add(l); this.noturnas.push(l); }
      }
    }
    // morros distantes
    {
      const gm = new THREE.PlaneGeometry(4200, 900, 70, 14); gm.rotateX(-Math.PI / 2); gm.translate(0, 0, -1750);
      const mp = gm.attributes.position;
      for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i); mp.setY(i, fbm2(x * .002 + 9, z * .003, 4) * 380 * suave(-1300, -1650, z)); }
      const mm = new THREE.Mesh(gm.toNonIndexed(), new THREE.MeshStandardMaterial({ color: "#56705f", flatShading: true, roughness: 1 }));
      this.cena.add(mm);
    }
    // guindastes
    this.guindastes = [-78, -32, 14, 60].map(x => { const g = criarGuindaste(r); g.position.set(x, 2.2, 0); this.cena.add(g); this.registrarLuzes(g.userData.luzes); return g; });
    // navio atracado e navio chegando
    this.navio = criarNavio(190, { seed: 17, cheio: true }); this.navio.position.set(-10, 0, 30); this.cena.add(this.navio);
    this.registrarLuzes(this.navio.userData.luzes); this.janelas.push(...this.navio.userData.janelas);
    this.chegando = criarNavio(150, { seed: 23 }); this.chegando.rotation.y = Math.PI; this.cena.add(this.chegando);
    this.registrarLuzes(this.chegando.userData.luzes); this.janelas.push(...this.chegando.userData.janelas);
    // caminhões no cais
    this.caminhoes = [0, 1, 2].map(i => { const c = criarCaminhao({ carga: i === 1 ? "vel" : "vel" }); this.cena.add(c); this.registrarLuzes(c.userData.luzes); return { c, off: i * .33 }; });
    // carga do segmento no cais
    if (opc && opc.carga === "granito") {
      const im = new THREE.InstancedMesh(CAIXA, new THREE.MeshStandardMaterial({ roughness: .85, flatShading: true }), 54);
      const tons = ["#8d8a84", "#5a5753", "#bfb6a8", "#2f2e2d", "#a39789", "#6b6f6a"]; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < 54; i++) { const x = -135 + (i % 18) * 6.4, z = -9 - Math.floor(i / 18) * 4.4; q.setFromAxisAngle(V(0, 1, 0), (r() - .5) * .2); m4.compose(V(x, 2.2 + 1.4, z), q, V(3.2 + r() * 1.4, 2.4 + r() * .8, 2.2 + r() * .6)); im.setMatrixAt(i, m4); cc.set(tons[Math.floor(r() * tons.length)]); im.setColorAt(i, cc); }
      im.castShadow = true; this.cena.add(im);
    }
    if (opc && opc.carga === "bobinas") {
      const gb = new THREE.CylinderGeometry(1.25, 1.25, 1.7, 14); gb.rotateX(Math.PI / 2);
      const im = new THREE.InstancedMesh(gb, new THREE.MeshStandardMaterial({ color: "#9aa4a8", roughness: .32, metalness: .85, flatShading: true }), 72);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < 72; i++) { const x = -140 + (i % 24) * 3.3, z = -9 - Math.floor(i / 24) * 3.6; m4.compose(V(x, 2.2 + 1.3, z), q, V(1, 1, 1)); im.setMatrixAt(i, m4); }
      im.castShadow = true; this.cena.add(im);
    }
    // postes de iluminação
    this.lampadas = [];
    for (let i = 0; i < 8; i++) {
      const x = -220 + i * 62, z = i % 2 ? -100 : -40;
      caixa(this.cena, new THREE.MeshStandardMaterial({ color: "#7e8a8e", roughness: .6 }), .9, 40, .9, x, 22, z);
      const l = brilho("#ffd28f", 18, .95, "noturna"); l.position.set(x, 42.5, z); this.cena.add(l); this.noturnas.push(l);
    }
    if (!MOBILE) {
      const p1 = new THREE.PointLight("#ffcc88", 1, 240, 1.4); p1.position.set(-60, 45, -70); p1.userData.base = 700; this.cena.add(p1); this.lampadas.push(p1);
      const p2 = new THREE.PointLight("#ffcc88", 1, 240, 1.4); p2.position.set(120, 45, -100); p2.userData.base = 700; this.cena.add(p2); this.lampadas.push(p2);
    }
    // avião pousando ao fundo
    this.aviao = criarAviao(); this.aviao.scale.setScalar(1.5); this.cena.add(this.aviao); this.registrarLuzes(this.aviao.userData.luzes);
    this.chegandoNav = 1;
  }
  extraFase(P) { this.janelasCidade.material.opacity = P.noite * .95; this.portaGalpao.material.emissiveIntensity = .6 + P.noite * .8; }
  posAviao(t) { const s = (t / 34) % 1; return { s, p: V(lerp(1500, -260, s), lerp(330, 190, s), -560 + s * 30) }; }
  atualizar(t) {
    this.guindastes.forEach(g => animarGuindaste(g, t));
    this.navio.position.y = Math.sin(t * .5) * .2;
    const sx = ((t * 3.2) % 1800) - 300;
    this.chegando.position.set(900 - sx, Math.sin(t * .6) * .3, 380);
    const nav = this.agua.material.userData.nav;
    nav[0].set(this.chegando.position.x, 380, Math.PI, 150);
    this.caminhoes.forEach(({ c, off }, i) => {
      const u = (t * .012 + off) % 1, x = -240 + Math.abs(u * 2 - 1) * 480;
      const ida = u < .5;
      c.position.set(x, 2.2, ida ? -13 : -17); c.rotation.y = ida ? Math.PI : 0;
    });
    const av = this.posAviao(this.opc.foco === "aviao" ? t % 30 : t);
    this.aviao.position.copy(av.p); this.aviao.rotation.set(0, Math.PI, .08);
    this.aviao.visible = av.s < .92;
    this.atualizarLuzes(t);
  }
  etapa(id, p) {
    this.camera.clearViewOffset();
    const K = [[V(-70, 34, 470), V(0, 22, 0)], [V(20, 74, 210), V(0, 12, -40)], [V(150, 82, 40), V(118, 6, -160)], [V(117, 17, -140), V(115, 9, -200)]];
    const cp = new THREE.CatmullRomCurve3(K.map(k => k[0])), ca = new THREE.CatmullRomCurve3(K.map(k => k[1]));
    const e = easeSine(p);
    this.olhar(cp.getPoint(e), ca.getPoint(e));
    this.seguirCeu();
  }
  mini(t) {
    if (this.opc.foco === "aviao") {
      const av = this.posAviao(t % 30).p; this.aviaoT = t % 30;
      this.olhar(av.clone().add(V(-95, -12, 120)), av.clone().add(V(-30, 2, 0)));
    } else {
      const a = t * .03;
      const pos = V(Math.sin(a) * 120 - 40, 90 + Math.sin(a * 1.7) * 10, 230 + Math.cos(a) * 40);
      this.olhar(pos, V(-30, 6, -30));
    }
    this.seguirCeu();
  }
}

/* ---------------------------------------------------------------- 4 · GALPÃO */
class MundoGalpao extends Mundo {
  constructor(opc) {
    super(opc);
    const r = semente(31), cc = cor("#000");
    this.cena.background = cor("#0b1418");
    this.cena.fog = new THREE.Fog("#1b2428", 60, 190);
    this.camera.near = .2; this.camera.far = 400; this.camera.fov = 50; this.camera.updateProjectionMatrix();
    this.montarLuz();
    this.alvoSol = V(0, 0, 0); this.sombra(75, 300);
    const LX = 60, LZ = 36, H = 15;
    // chão
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(LX * 2, LZ * 2), new THREE.MeshStandardMaterial({ map: texChao(), roughness: .85, metalness: .05 }));
    chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; this.cena.add(chao);
    // paredes
    const mParede = new THREE.MeshStandardMaterial({ color: "#2b3c43", roughness: .8, metalness: .2, map: texOndulada() });
    caixa(this.cena, mParede, LX * 2, H, .4, 0, H / 2, -LZ, false); caixa(this.cena, mParede, LX * 2, H, .4, 0, H / 2, LZ, false);
    caixa(this.cena, mParede, .4, H, LZ * 2, -LX, H / 2, 0, false); caixa(this.cena, mParede, .4, H, LZ * 2, LX, H / 2, 0, false);
    caixa(this.cena, new THREE.MeshStandardMaterial({ color: "#d9ad38", roughness: .8 }), LX * 2, 1.1, .45, 0, .55, -LZ + .05, false);
    // telhado
    const mTeto = new THREE.MeshStandardMaterial({ color: "#1b272c", roughness: .9, side: THREE.DoubleSide });
    [-1, 1].forEach(sz => { const m = new THREE.Mesh(new THREE.PlaneGeometry(LX * 2, Math.hypot(LZ, 3.2)), mTeto); m.position.set(0, H + 1.6, sz * LZ / 2); m.rotation.x = Math.PI / 2 + sz * Math.atan2(3.2, LZ); this.cena.add(m); });
    // janelas altas (luz do dia) na parede do fundo
    this.vidros = new THREE.MeshStandardMaterial({ color: "#0b1418", emissive: "#e6f2f6", emissiveIntensity: 1.3 });
    const jan = [];
    for (let x = -52; x <= 52; x += 13) { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), this.vidros); m.position.set(x, 11.6, -LZ + .25); this.cena.add(m); jan.push(x); }
    for (let x = -52; x <= 52; x += 13) { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), this.vidros); m.position.set(x, 11.6, LZ - .25); m.rotation.y = Math.PI; this.cena.add(m); }
    // feixes de luz volumétricos
    this.dirFeixe = V(.12, -.62, .78).normalize();
    this.feixes = [];
    const mFeixe = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uForca: { value: 1 }, uCor: { value: cor("#ffe6bf") }, uT: U.tempo },
      vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float uForca, uT; uniform vec3 uCor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float borda = pow(abs(dot(vN, vV)), 1.6); float ao_longo = pow(vUv.y, 1.25) * smoothstep(0., .12, vUv.y); float tremor = .9 + .1 * sin(uT * .7 + vUv.x * 12.); float a = borda * ao_longo * uForca * .42 * tremor; gl_FragColor = vec4(uCor * a, a); }",
    });
    jan.forEach(x => {
      const ini = V(x, 11.6, -LZ + .4); const len = 11.6 / -this.dirFeixe.y; const fim = ini.clone().addScaledVector(this.dirFeixe, len);
      const geo = new THREE.CylinderGeometry(3.2, 5.6, len, 16, 1, true);
      const m = new THREE.Mesh(geo, mFeixe); m.position.copy(ini).add(fim).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(V(0, 1, 0), this.dirFeixe.clone().negate()); m.scale.set(1, 1, .45);
      this.cena.add(m); this.feixes.push(m);
    });
    this.mFeixe = mFeixe;
    // tesouras do telhado
    {
      const barras = [];
      for (let x = -54; x <= 54; x += 9) {
        const a = V(x, H, -LZ), b = V(x, H, LZ), cume = V(x, H + 3.2, 0);
        barras.push([a, b, .35], [a, cume, .35], [cume, b, .35]);
        for (let k = 1; k < 6; k++) { const z = -LZ + k * LZ / 3; const yt = H + 3.2 * (1 - Math.abs(z) / LZ); barras.push([V(x, H, z), V(x, yt, z), .18]); if (k < 5) barras.push([V(x, H, z), V(x, H + 3.2 * (1 - Math.abs(z + LZ / 3) / LZ), z + LZ / 3), .14]); }
      }
      for (let z = -LZ + 6; z < LZ; z += 12) barras.push([V(-LX, H + 3.2 * (1 - Math.abs(z) / LZ), z), V(LX, H + 3.2 * (1 - Math.abs(z) / LZ), z), .22]);
      const im = new THREE.InstancedMesh(CAIXA, new THREE.MeshStandardMaterial({ color: "#58676c", roughness: .6, metalness: .5 }), barras.length);
      const m4 = new THREE.Matrix4();
      barras.forEach(([a, b, e], i) => im.setMatrixAt(i, barraMatriz(a, b, e, m4)));
      im.castShadow = true; this.cena.add(im);
    }
    // luminárias altas
    this.lampadas = [];
    for (let x = -45; x <= 45; x += 18) for (const z of [-14, 14]) {
      caixa(this.cena, new THREE.MeshStandardMaterial({ color: "#2a3338", emissive: "#fff2d6", emissiveIntensity: .5 }), 1.4, .3, 1.4, x, H - .4, z, false);
      const b = brilho("#fff0d0", 7, .8, "sempre"); b.position.set(x, H - .9, z); this.cena.add(b); this.noturnas.push(b);
    }
    [-30, 0, 30].forEach(x => { const p = new THREE.PointLight("#ffe2b0", 1, 90, 1.2); p.position.set(x, H - 2, 0); p.userData.base = 160; p.userData.dia = .25; this.cena.add(p); this.lampadas.push(p); });
    // porta-paletes
    {
      const mont = [], vig = [], cargas = [];
      const fila = (x0, x1, z, prof) => {
        for (let x = x0; x <= x1 + .01; x += 2.8) { mont.push([x, 4.5, z - prof / 2], [x, 4.5, z + prof / 2]); }
        for (let x = x0; x < x1; x += 2.8) for (const y of [.25, 3.1, 5.9, 8.7]) {
          vig.push([x + 1.4, y, z - prof / 2], [x + 1.4, y, z + prof / 2]);
          if (y < 8 && r() < .86) for (const dx of [-.68, .68]) cargas.push([x + 1.4 + dx, y + .2, z, r()]);
        }
      };
      fila(-54, 54, -32.4, 1.3); fila(-54, -14, 31.6, 1.3); fila(14, 54, 31.6, 1.3);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      const im1 = new THREE.InstancedMesh(CAIXA, new THREE.MeshStandardMaterial({ color: "#3a5662", roughness: .6, metalness: .4 }), mont.length);
      mont.forEach((p, i) => im1.setMatrixAt(i, m4.compose(V(...p), q, V(.12, 9, .12)))); im1.castShadow = true; this.cena.add(im1);
      const im2 = new THREE.InstancedMesh(CAIXA, new THREE.MeshStandardMaterial({ color: LARANJA, roughness: .55 }), vig.length);
      vig.forEach((p, i) => im2.setMatrixAt(i, m4.compose(V(...p), q, V(2.7, .16, .1)))); im2.castShadow = true; this.cena.add(im2);
      const im3 = new THREE.InstancedMesh(CAIXA, new THREE.MeshStandardMaterial({ roughness: .85, flatShading: true }), cargas.length);
      const tons = ["#b48a5a", "#c49c6a", "#d7d0c2", "#9b7a52", "#e4dfd3"];
      cargas.forEach(([x, y, z, k], i) => { const hh = 1.4 + k * 1.1; im3.setMatrixAt(i, m4.compose(V(x, y + hh / 2, z), q, V(1.2, hh, 1.1))); cc.set(tons[Math.floor(k * 5)]); im3.setColorAt(i, cc); });
      im3.castShadow = true; im3.receiveShadow = true; this.cena.add(im3);
    }
    // carga no chão conforme o segmento
    const carga = opc && opc.carga;
    if (carga === "cafe") {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const lista = [];
      for (let px = -44; px <= -14; px += 3.2) for (let pz = -18; pz <= 18; pz += 4.4) { if (r() < .2) continue; const cam = 3 + Math.floor(r() * 4); for (let k = 0; k < cam; k++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) lista.push([px + (a - .5) * 1.25 + (k % 2) * .2, .42 + k * .42, pz + (b - .5) * 1.85]); }
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: "#b39a6c", roughness: 1, flatShading: true }), lista.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      lista.forEach((p, i) => { q.setFromAxisAngle(V(0, 1, 0), (h3(i, 1, 1) - .5) * .3); im.setMatrixAt(i, m4.compose(V(...p), q, V(.62, .24, .9))); cc.set("#b39a6c").offsetHSL(0, 0, (h3(i, 2, 2) - .5) * .08); im.setColorAt(i, cc); });
      im.castShadow = true; im.receiveShadow = true; this.cena.add(im);
    } else if (carga === "caixas") {
      const lista = [];
      for (let px = -44; px <= -16; px += 2.4) for (let pz = -16; pz <= 16; pz += 2.6) { if (r() < .25) continue; let y = 0; const n = 2 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { const s = .5 + r() * .7; lista.push([px + (r() - .5) * .3, y + s / 2, pz + (r() - .5) * .3, s]); y += s; } }
      const im = new THREE.InstancedMesh(CAIXA, new THREE.MeshStandardMaterial({ roughness: .9, flatShading: true }), lista.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      lista.forEach(([x, y, z, s], i) => { q.setFromAxisAngle(V(0, 1, 0), (h3(i, 5, 5) - .5) * .4); im.setMatrixAt(i, m4.compose(V(x, y, z), q, V(s * 1.3, s, s))); cc.set(["#c49c6a", "#b48a5a", "#d9c7a8"][i % 3]); im.setColorAt(i, cc); });
      im.castShadow = true; im.receiveShadow = true; this.cena.add(im);
      // esteira com caixas andando
      caixa(this.cena, new THREE.MeshStandardMaterial({ color: "#2a3338", roughness: .6, metalness: .4 }), 46, .5, 1.8, -10, 1, 24);
      this.esteira = [];
      for (let i = 0; i < 14; i++) { const b = caixa(this.cena, new THREE.MeshStandardMaterial({ color: "#c49c6a", roughness: .9 }), .9, .7, .9, 0, 1.6, 24); this.esteira.push(b); }
    } else {
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(CAIXA, new THREE.MeshStandardMaterial({ map: texOndulada(), color: ["#1f5f73", "#2c3e48", "#c9c2b0"][i], roughness: .6, metalness: .25 }));
        c.scale.set(12.19, 2.6, 2.44); c.position.set(-36, 1.3 + (i === 2 ? 2.6 : 0), -6 + (i % 2) * 3.2 + (i === 2 ? 1.6 : 0)); c.castShadow = c.receiveShadow = true; this.cena.add(c);
      }
      for (let i = 0; i < 16; i++) { const x = -48 + (i % 4) * 2.4, z = 8 + Math.floor(i / 4) * 2.6; caixa(this.cena, new THREE.MeshStandardMaterial({ color: ["#b48a5a", "#d7d0c2"][i % 2], roughness: .9 }), 1.2, 1.3 + h3(i, 1, 1), 1.1, x, .8, z); }
    }
    // contêiner Vellarys em destaque (aberto por trás)
    {
      const g = new THREE.Group(); this.conteiner = g; this.cena.add(g);
      const M = matsVellarys();
      const interior = new THREE.MeshStandardMaterial({ color: "#7d4a2c", roughness: .8, emissive: "#ffcf96", emissiveIntensity: 0 });
      this.mInterior = interior;
      const L = 12.19, A = 2.9, P = 2.44;
      const lado = new THREE.BoxGeometry(L, A, .06);
      const l1 = new THREE.Mesh(lado, [M.topo, M.topo, M.topo, M.topo, M.lado, interior]); l1.position.set(0, A / 2, P / 2);
      const l2 = new THREE.Mesh(lado, [M.topo, M.topo, M.topo, M.topo, interior, M.lado]); l2.position.set(0, A / 2, -P / 2);
      const teto = new THREE.Mesh(new THREE.BoxGeometry(L, .06, P), [M.topo, M.topo, M.topo, interior, M.topo, M.topo]); teto.position.set(0, A, 0);
      const piso = new THREE.Mesh(new THREE.BoxGeometry(L, .12, P), new THREE.MeshStandardMaterial({ color: "#5a3a26", roughness: .9 })); piso.position.set(0, .06, 0);
      const frente = new THREE.Mesh(new THREE.BoxGeometry(.06, A, P), [interior, M.topo, M.topo, M.topo, M.topo, M.topo]); frente.position.set(-L / 2, A / 2, 0);
      [l1, l2, teto, piso, frente].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
      // fundo luminoso
      const fundo = new THREE.Mesh(new THREE.PlaneGeometry(P * .96, A * .96), new THREE.MeshBasicMaterial({ color: "#fff6e6", transparent: true, opacity: 0 }));
      fundo.position.set(-L / 2 + .08, A / 2, 0); fundo.rotation.y = Math.PI / 2; g.add(fundo); this.fundoLuz = fundo;
      // portas
      const tPorta = texVellarysPorta();
      const tE = tPorta.clone(); tE.repeat.set(.5, 1); tE.needsUpdate = true;
      const tD = tPorta.clone(); tD.repeat.set(.5, 1); tD.offset.set(.5, 0); tD.needsUpdate = true;
      const mE = new THREE.MeshStandardMaterial({ map: tE, roughness: .55, metalness: .2 }), mD = new THREE.MeshStandardMaterial({ map: tD, roughness: .55, metalness: .2 });
      const portaGeo = new THREE.BoxGeometry(.06, A, P / 2);
      const pivE = new THREE.Group(); pivE.position.set(L / 2, 0, P / 2); g.add(pivE);
      const pE = new THREE.Mesh(portaGeo, [mE, interior, M.topo, M.topo, M.topo, M.topo]); pE.position.set(.03, A / 2, -P / 4); pE.castShadow = true; pivE.add(pE);
      const pivD = new THREE.Group(); pivD.position.set(L / 2, 0, -P / 2); g.add(pivD);
      const pD = new THREE.Mesh(portaGeo, [mD, interior, M.topo, M.topo, M.topo, M.topo]); pD.position.set(.03, A / 2, P / 4); pD.castShadow = true; pivD.add(pD);
      this.portas = [pivE, pivD];
      this.luzDentro = new THREE.PointLight("#ffd9a6", 0, 40, 1.4); this.luzDentro.position.set(L / 2 - 1.5, A * .55, 0); g.add(this.luzDentro);
      this.brilhoPorta = brilho("#fff1da", 9, 0, "fixa"); this.brilhoPorta.position.set(L / 2 + .3, A / 2, 0); g.add(this.brilhoPorta);
      const spot = new THREE.SpotLight("#fff0d8", 1, 40, .5, .6, 1); spot.position.set(4, 13, 6); spot.target.position.set(0, 0, 0); spot.userData.base = 420; g.add(spot, spot.target); this.spot = spot;
    }
    // empilhadeiras
    this.empilhadeiras = [
      { e: criarEmpilhadeira(), c: new THREE.CatmullRomCurve3([V(-24, 0, -20), V(26, 0, -21), V(42, 0, -6), V(36, 0, 14), V(-6, 0, 18), V(-26, 0, 8)], true), v: .022, off: 0 },
      { e: criarEmpilhadeira(), c: new THREE.CatmullRomCurve3([V(30, 0, 24), V(-30, 0, 25), V(-48, 0, 2), V(-30, 0, -22), V(10, 0, -24), V(48, 0, 10)], true), v: .017, off: .5 },
    ];
    this.empilhadeiras.forEach(f => { this.cena.add(f.e); this.registrarLuzes(f.e.userData.luzes); });
    // poeira na luz
    {
      const N = MOBILE ? 700 : 1800, p = [], s = [];
      for (let i = 0; i < N; i++) { p.push((r() - .5) * 110, r() * 14, (r() - .5) * 66); s.push(r()); }
      const gp = new THREE.BufferGeometry(); gp.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); gp.setAttribute("sem", new THREE.Float32BufferAttribute(s, 1));
      this.mPoeira = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uT: U.tempo, uForca: { value: 1 }, tam: { value: 3 * DPR } },
        vertexShader: "uniform float uT; uniform float tam; attribute float sem; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uT * (.08 + sem * .12), 14.); p.x += sin(uT * .2 + sem * 30.) * .8; p.z += cos(uT * .17 + sem * 20.) * .6; vec4 mv = modelViewMatrix * vec4(p,1.); vA = .25 + sem * .6; gl_PointSize = clamp(tam * (10. / -mv.z), 1., 6.); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform float uForca; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d) * vA * uForca; gl_FragColor = vec4(vec3(1., .92, .78) * a, a); }",
      });
      this.cena.add(new THREE.Points(gp, this.mPoeira));
    }
    this.abertura = opc && opc.foco === "vistoria" ? .7 : 0;
    this.fatorAmb = .55;
  }
  extraFase(P) {
    const dia = 1 - P.noite;
    const baixo = P.elev < 10;
    this.mFeixe.uniforms.uForca.value = .15 + dia * (baixo ? 1.25 : 1);
    this.mFeixe.uniforms.uCor.value.set(baixo ? "#ffc896" : P.noite > .8 ? "#9fb9e6" : "#ffe9c8");
    this.vidros.emissive.set(P.noite > .8 ? "#20344f" : baixo ? "#ffc896" : "#e6f2f6");
    this.vidros.emissiveIntensity = .5 + dia * 1.1;
    // a luz entra pelas janelas do fundo
    this.sol.position.copy(this.dirFeixe).multiplyScalar(-120); this.sol.target.position.set(0, 0, 0);
    this.sol.intensity = (.25 + dia * 2.6) * (baixo ? .8 : 1);
    this.sol.color.set(baixo ? "#ffc896" : P.noite > .8 ? "#9fb9e6" : "#fff0d8");
    this.cena.fog.color.set(P.noite > .8 ? "#0e171c" : "#26302f");
    this.cena.background.set(P.noite > .8 ? "#070d10" : "#11191c");
    this.mPoeira.uniforms.uForca.value = .4 + dia * .8;
    this.spot.intensity = this.spot.userData.base * (.6 + P.noite * .6);
  }
  atualizar(t) {
    this.empilhadeiras.forEach(f => {
      const u = (t * f.v + f.off) % 1; const p = f.c.getPointAt(u), tg = f.c.getTangentAt(u);
      f.e.position.copy(p); f.e.rotation.y = Math.atan2(-tg.z, tg.x);
      f.e.userData.garfo.position.y = Math.max(0, Math.sin(t * .4 + f.off * 6)) * .6;
    });
    if (this.esteira) this.esteira.forEach((b, i) => { const x = -32 + ((t * 2.4 + i * 3.3) % 46); b.position.x = x; });
    const a = this.abertura;
    this.portas[0].rotation.y = -a * 1.85; this.portas[1].rotation.y = a * 1.85;
    const luz = suave(.05, .8, a);
    this.luzDentro.intensity = luz * 120;
    this.mInterior.emissiveIntensity = luz * .55;
    this.fundoLuz.material.opacity = luz;
    this.brilhoPorta.material.opacity = luz * .9; this.brilhoPorta.scale.setScalar(6 + luz * 10);
    this.atualizarLuzes(t);
  }
  etapa(id, p) {
    this.camera.clearViewOffset();
    if (id === "galpao") {
      this.abertura = 0;
      const K = [[V(-44, 9, 30), V(-4, 2.5, 0)], [V(-14, 5.5, 15), V(0, 2.2, 0)], [V(14, 4.5, 11), V(4, 2, 0)], [V(23, 3.2, 1.5), V(6, 1.9, 0)]];
      const e = easeSine(p);
      this.olhar(new THREE.CatmullRomCurve3(K.map(k => k[0])).getPoint(e), new THREE.CatmullRomCurve3(K.map(k => k[1])).getPoint(e));
    } else {
      this.abertura = suave(.0, .5, p);
      const e = easeSine(suave(.25, 1, p));
      const pos = V(23, 3.2, 1.5).lerp(V(7.6, 1.75, 0), e);
      this.olhar(pos, V(6, 1.9, 0).lerp(V(-2, 1.6, 0), e));
    }
  }
  mini(t) {
    if (this.opc.foco === "vistoria") {
      const a = Math.sin(t * .08) * .5;
      this.olhar(V(15 + Math.cos(a) * 4, 3.4, Math.sin(a) * 9 + 3), V(5, 1.8, 0));
    } else {
      const a = t * .04;
      this.olhar(V(Math.cos(a) * 30, 12 + Math.sin(a * 1.3) * 2, Math.sin(a) * 22 + 6), V(-6, 1.5, 0));
    }
  }
}

/* ---------------------------------------------------------------- 5 · ESTRADA */
class MundoEstrada extends Mundo {
  constructor(opc) {
    super(opc);
    const r = semente(51), variante = (opc && opc.rota) || "bh";
    this.montarLuz();
    this.alvoSol = V(0, 0, 0); this.sombra(160, 900);
    this.ceu = criarCeu(2800); this.cena.add(this.ceu);
    this.cena.fog = new THREE.Fog("#c6dbe1", 300, 2100);
    this.camera.far = 3200; this.camera.updateProjectionMatrix();
    const litoral = variante === "sp";
    // traçado da rodovia
    const brutos = [];
    for (let i = 0; i <= 16; i++) brutos.push(V(Math.sin(i * .72) * 120 + Math.sin(i * .21) * 190, 0, 1100 - i * 165));
    const curva0 = new THREE.CatmullRomCurve3(brutos);
    const relevo = (x, z) => {
      let h = fbm2(x * .0028 + 1, z * .0028, 5) * (litoral ? 120 : 260) + fbm2(x * .011, z * .011, 3) * 30 - (litoral ? 30 : 60);
      if (litoral) h -= suave(-250, -700, x) * 120;
      if (!litoral) h += 220 * Math.exp(-(((x + 520) / 140) ** 2) - (((z + 380) / 160) ** 2));
      return h;
    };
    const NS = 700, amostras = curva0.getSpacedPoints(NS);
    const hs = amostras.map(p => relevo(p.x, p.z));
    const hsm = hs.map((_, i) => { let s = 0, n = 0; for (let k = -22; k <= 22; k++) { const j = clamp(i + k, 0, NS); s += hs[j]; n++; } return s / n; });
    amostras.forEach((p, i) => { p.y = Math.max(hsm[i], litoral ? 6 : -1e9) + .4; });
    this.curva = new THREE.CatmullRomCurve3(amostras);
    // terreno achatado junto à pista
    const tg = new THREE.PlaneGeometry(3400, 3600, MOBILE ? 80 : 150, MOBILE ? 84 : 160); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -150);
    const tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i); let h = relevo(x, z);
      let dmin = 1e9, hy = 0;
      for (let k = 0; k <= NS; k += 3) { const a = amostras[k]; const d = (a.x - x) ** 2 + (a.z - z) ** 2; if (d < dmin) { dmin = d; hy = a.y; } }
      const dd = Math.sqrt(dmin);
      const w = 1 - suave(12, 60, dd);
      h = lerp(h, hy - .6, w);
      tp.setY(i, h);
    }
    const tn = tg.toNonIndexed(), tq = tn.attributes.position, tc = new Float32Array(tq.count * 3), cc = cor("#000");
    const v1 = cor("#4c6b5a"), v2 = cor("#6a8463"), oc = cor("#8a8061"), rocha = cor("#7a8582"), areia = cor("#cdbf9c");
    for (let i = 0; i < tq.count; i += 3) {
      const y = (tq.getY(i) + tq.getY(i + 1) + tq.getY(i + 2)) / 3, x = tq.getX(i), z = tq.getZ(i);
      cc.copy(v1).lerp(v2, fbm2(x * .006, z * .006, 2)); cc.lerp(oc, suave(.55, .75, fbm2(x * .01 + 4, z * .01, 2)) * .6);
      cc.lerp(rocha, suave(150, 280, y));
      if (litoral && y < 4) cc.copy(areia);
      cc.offsetHSL(0, 0, (h3(i, 9, 9) - .5) * .05);
      for (let k = 0; k < 3; k++) tc.set([cc.r, cc.g, cc.b], (i + k) * 3);
    }
    tn.setAttribute("color", new THREE.BufferAttribute(tc, 3));
    const terreno = new THREE.Mesh(tn, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 }));
    terreno.receiveShadow = true; this.cena.add(terreno);
    if (litoral) { this.agua = criarAgua(3000, MOBILE ? 50 : 90, .4); this.agua.position.set(-1500, 0, -200); this.cena.add(this.agua); }
    // pista
    {
      const pos = [], uv = [], idx = [], L = 7.5;
      let dist = 0;
      for (let i = 0; i <= NS; i++) {
        const p = amostras[i], tg2 = this.curva.getTangentAt(i / NS), lado = V(-tg2.z, 0, tg2.x).normalize();
        if (i > 0) dist += p.distanceTo(amostras[i - 1]);
        const a = p.clone().addScaledVector(lado, -L), b = p.clone().addScaledVector(lado, L);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, dist / 30, 1, dist / 30);
        if (i < NS) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const pista = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: texEstrada(), roughness: .9, polygonOffset: true, polygonOffsetFactor: -2 }));
      pista.receiveShadow = true; this.cena.add(pista);
    }
    // árvores
    {
      const lista = [];
      for (let i = 0; i < (MOBILE ? 380 : 900); i++) {
        const k = Math.floor(r() * NS), a = amostras[k], tg2 = this.curva.getTangentAt(k / NS), lado = V(-tg2.z, 0, tg2.x).normalize();
        const off = (r() < .5 ? -1 : 1) * (18 + r() * 160);
        const p = a.clone().addScaledVector(lado, off); p.y = relevo(p.x, p.z);
        const dist = Math.abs(off); if (dist < 60) p.y = lerp(p.y, a.y - .6, 1 - suave(12, 60, dist));
        if (litoral && p.y < 5) continue;
        lista.push([p, 3 + r() * 5]);
      }
      const geo = new THREE.ConeGeometry(1, 2.6, 6); geo.translate(0, 1.3, 0);
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), lista.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      lista.forEach(([p, s], i) => { im.setMatrixAt(i, m4.compose(p, q, V(s * .55, s, s * .55))); cc.set(["#2f4a3c", "#3c5a45", "#486b4d"][i % 3]); im.setColorAt(i, cc); });
      im.castShadow = true; this.cena.add(im);
    }
    // Pedra Azul (rota BH)
    if (!litoral) {
      const gp = new THREE.IcosahedronGeometry(1, 2), pp = gp.attributes.position;
      for (let i = 0; i < pp.count; i++) { const v = V().fromBufferAttribute(pp, i); const k = 1 + (fbm3(v.x * 2.2, v.y * 2.2, v.z * 2.2, 3) - .5) * .3; pp.setXYZ(i, v.x * k, v.y * k, v.z * k); }
      const mp = new THREE.MeshStandardMaterial({ color: "#6f8496", roughness: .85, flatShading: true });
      const m = new THREE.Mesh(gp, mp); m.scale.set(48, 150, 62); m.position.set(-520, relevo(-520, -380) + 40, -380); m.rotation.z = .12; m.castShadow = true; this.cena.add(m);
      const m2 = new THREE.Mesh(gp, mp); m2.scale.set(26, 70, 30); m2.position.set(-470, relevo(-470, -330) + 20, -330); this.cena.add(m2);
    }
    // placas verdes
    [.12, .38, .66].forEach(u => {
      const p = this.curva.getPointAt(u), tg2 = this.curva.getTangentAt(u), lado = V(-tg2.z, 0, tg2.x).normalize();
      const base = p.clone().addScaledVector(lado, 12);
      const g = new THREE.Group(); g.position.copy(base); g.rotation.y = Math.atan2(-tg2.z, tg2.x) - Math.PI / 2;
      const mp = new THREE.MeshStandardMaterial({ color: "#7e8a8e", roughness: .6 });
      caixa(g, mp, .4, 7, .4, -3, 3.5, 0); caixa(g, mp, .4, 7, .4, 3, 3.5, 0);
      caixa(g, new THREE.MeshStandardMaterial({ color: "#1e6a46", roughness: .6 }), 8, 3.2, .2, 0, 7.6, 0);
      caixa(g, new THREE.MeshStandardMaterial({ color: "#f1f3ef", roughness: .6 }), 7.2, .12, .22, 0, 8.6, 0, false);
      caixa(g, new THREE.MeshStandardMaterial({ color: "#f1f3ef", roughness: .6 }), 4.2, .12, .22, -1.2, 7.3, 0, false);
      this.cena.add(g);
    });
    // caminhões
    this.caminhoes = [
      { c: criarCaminhao(), u: .1, v: .0034, lado: -3.6, ida: true },
      { c: criarCaminhao(), u: .26, v: .0034, lado: -3.6, ida: true },
      { c: criarCaminhao({ carga: "bau" }), u: .6, v: .0039, lado: 3.6, ida: false },
      { c: criarCaminhao({ corCabine: "#2b3e48" }), u: .85, v: .0039, lado: 3.6, ida: false },
    ];
    this.caminhoes.forEach(k => { this.cena.add(k.c); this.registrarLuzes(k.c.userData.luzes); });
    this.fatorAmb = 1;
  }
  posCaminhao(k, t) {
    const u = ((k.ida ? k.u + t * k.v : k.u - t * k.v) % 1 + 1) % 1;
    const uu = clamp(u, .002, .998);
    const p = this.curva.getPointAt(uu), tg = this.curva.getTangentAt(uu); if (!k.ida) tg.negate();
    const lado = V(-tg.z, 0, tg.x).normalize();
    return { p: p.addScaledVector(lado, 3.6), tg };
  }
  atualizar(t) {
    this.caminhoes.forEach(k => {
      const { p, tg } = this.posCaminhao(k, t);
      k.c.position.copy(p); k.c.rotation.set(0, Math.atan2(-tg.z, tg.x), 0);
      k.c.rotateZ(Math.asin(clamp(tg.y, -1, 1)));
    });
    this.atualizarLuzes(t);
    const l = this.caminhoes[0].c.position;
    this.sol.target.position.copy(l); this.sol.position.copy(vetorSol(this.P ? this.P.elev : 45, this.P ? this.P.azim : 30)).multiplyScalar(400).add(l);
  }
  mini(t) {
    const { p, tg } = this.posCaminhao(this.caminhoes[0], t);
    const lado = V(-tg.z, 0, tg.x).normalize(), a = Math.sin(t * .05);
    const pos = p.clone().addScaledVector(tg, -34 + a * 6).addScaledVector(lado, 15 + a * 8).add(V(0, 12 + Math.sin(t * .07) * 3, 0));
    this.olhar(pos, p.clone().addScaledVector(tg, 26).add(V(0, 2, 0)));
    if (this.agua) this.agua.position.y = 0;
    this.seguirCeu();
  }
}

/* ---------------------------------------------------------------- telas, ciclo e desempenho */
function criarMundo(tipo, opc) {
  switch (tipo) {
    case "globo": return new MundoGlobo(opc);
    case "oceano": return new MundoOceano(opc);
    case "porto": return new MundoPorto(opc);
    case "galpao": return new MundoGalpao(opc);
    case "estrada": return new MundoEstrada(opc);
  }
  return new MundoGlobo(opc);
}
function criarRenderizador(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance", alpha: false });
  r.setPixelRatio(DPR); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.02;
  if (SOMBRAS) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
  return r;
}

const TELAS = [];
let fase = faseInicial();
let encerrado = false;

function voltarParaEstatico(motivo) {
  if (encerrado) return; encerrado = true;
  console.info("[Vellarys] cenas ilustradas no lugar do 3D:", motivo);
  html.classList.remove("modo-3d"); html.classList.add("modo-estatico");
  TELAS.forEach(t => { try { t.r && t.r.dispose(); } catch (e) { /* ok */ } if (t.el) t.el.classList.remove("pronta"); });
  TELAS.length = 0;
  dispatchEvent(new Event("resize"));
}

function telaMergulho() {
  const sec = document.getElementById("mergulho"); if (!sec) return;
  const canvas = sec.querySelector("#mergulho-canvas"), palco = sec.querySelector(".mergulho-palco");
  const etapas = Array.from(sec.querySelectorAll(".etapa"));
  const ids = etapas.map(e => e.id.replace("etapa-", ""));
  const mapa = MOBILE ? { espaco: "globo", atlantico: "globo", porto: "porto", galpao: "galpao", abertura: "galpao" }
    : { espaco: "globo", atlantico: "oceano", porto: "porto", galpao: "galpao", abertura: "galpao" };
  const VEU = { "espaco>atlantico": "#e4eef2", "atlantico>porto": null, "porto>galpao": "#1a1610", "galpao>abertura": null };
  const r = criarRenderizador(canvas);
  const mundos = {};
  const obter = tipo => { if (!mundos[tipo]) { mundos[tipo] = criarMundo(tipo, { modo: "mergulho" }); mundos[tipo].aplicarFase(fase); } return mundos[tipo]; };
  obter("globo");
  const fila = [...new Set(Object.values(mapa))].filter(t => t !== "globo");
  const construir = () => { if (!fila.length || encerrado) return; const t = fila.shift(); obter(t); r.compile(mundos[t].cena, mundos[t].camera); setTimeout(construir, 350); };
  setTimeout(construir, 900);
  let g = 0, gAlvo = 0;
  const medir = () => {
    let i = 0;
    etapas.forEach((e, k) => { if (e.getBoundingClientRect().top <= 1) i = k; });
    const rc = etapas[i].getBoundingClientRect(), ult = i === etapas.length - 1;
    const p = clamp(-rc.top / (ult ? Math.max(rc.height - innerHeight, 1) : rc.height), 0, 1);
    gAlvo = i + p;
  };
  addEventListener("scroll", medir, { passive: true }); addEventListener("resize", medir); medir(); g = gAlvo;
  const tela = {
    el: palco, r, canvas, visivel: true, mundos, primeiro: true,
    passo(dt, t) {
      g += (gAlvo - g) * (1 - Math.exp(-dt * 4.5));
      if (Math.abs(gAlvo - g) < .0004) g = gAlvo;
      const i = Math.min(Math.floor(g), ids.length - 1), p = clamp(g - i, 0, 1);
      const id = ids[i], m = obter(mapa[id]);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w !== this.w || h !== this.h) { this.w = w; this.h = h; r.setSize(w, h, false); }
      m.redimensionar(w, h);
      m.atualizar(t, dt); m.etapa(id, p);
      // véu entre mundos diferentes
      let veu = 0, veuCor = "#c6dbe1";
      const prox = ids[i + 1], ant = ids[i - 1];
      if (prox && mapa[prox] !== mapa[id]) { const k = suave(.8, .995, p); if (k > veu) { veu = k; veuCor = VEU[`${id}>${prox}`] || (m.P ? m.P.nevoa : veuCor); } }
      if (ant && mapa[ant] !== mapa[id]) { const k = 1 - suave(.005, .2, p); if (k > veu) { veu = k; veuCor = VEU[`${ant}>${id}`] || (m.P ? m.P.nevoa : veuCor); } }
      palco.style.setProperty("--veu", veu.toFixed(3)); palco.style.setProperty("--veu-cor", veuCor);
      palco.style.setProperty("--luz", (id === "abertura" ? suave(.42, .97, p) : 0).toFixed(3));
      palco.style.setProperty("--vinheta", (id === "espaco" ? 1 : id === "abertura" ? .5 * (1 - p) : .55).toFixed(3));
      r.render(m.cena, m.camera);
      if (this.primeiro) { this.primeiro = false; canvas.classList.add("pronta"); }
    },
    fase(f) { Object.values(mundos).forEach(m => m.aplicarFase(f)); },
  };
  observar(sec, tela);
  TELAS.push(tela);
}

function telaMini(el) {
  const canvas = el.querySelector(".cena-canvas"); if (!canvas) return;
  const opc = { ...el.dataset };
  let tela = null;
  const iniciar = () => {
    const r = criarRenderizador(canvas);
    const m = criarMundo(opc.mundo, opc); m.aplicarFase(fase);
    if (m.prepararMini) m.prepararMini();
    tela = {
      el, r, canvas, visivel: true, m, primeiro: true,
      passo(dt, t) {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        if (w !== this.w || h !== this.h) { this.w = w; this.h = h; r.setSize(w, h, false); }
        m.redimensionar(w, h); m.atualizar(t, dt); m.mini(t);
        r.render(m.cena, m.camera);
        if (this.primeiro) { this.primeiro = false; el.classList.add("pronta"); }
      },
      fase(f) { m.aplicarFase(f); },
    };
    if (opc.modo === "rastreio") addEventListener("vellarys:rastreio", e => { m.passoAlvo = e.detail.passo; if (e.detail.passo === 0 && m.m > .5) m.m = 0; });
    if (matchMedia("(pointer: fine)").matches) el.addEventListener("pointermove", e => { const b = el.getBoundingClientRect(); m.ponteiro.x = (e.clientX - b.left) / b.width * 2 - 1; m.ponteiro.y = (e.clientY - b.top) / b.height * 2 - 1; });
    el.addEventListener("pointerleave", () => { m.ponteiro.x = 0; m.ponteiro.y = 0; });
    TELAS.push(tela);
    observar(el, tela);
  };
  // cria a cena só quando ela se aproxima da tela
  const io = new IntersectionObserver(ents => { if (ents.some(e => e.isIntersecting)) { io.disconnect(); iniciar(); } }, { rootMargin: "200px" });
  io.observe(el);
}

function observar(el, tela) {
  const io = new IntersectionObserver(ents => ents.forEach(e => { tela.visivel = e.isIntersecting; }), { rootMargin: "60px" });
  io.observe(el);
}

// ciclo único de quadros, com teto de 30 fps no celular e queda para as ilustrações se o aparelho não acompanhar
let ultimo = 0, medidas = [], nivel = 0;
function quadro(agora) {
  if (encerrado) return;
  requestAnimationFrame(quadro);
  if (document.hidden) { ultimo = agora; return; }
  const bruto = (agora - ultimo) / 1000;
  if (MOBILE && bruto < 1 / 31) return;
  const dt = Math.min(bruto, .1); ultimo = agora;
  const ativas = TELAS.filter(t => t.visivel);
  if (!ativas.length) return;
  U.tempo.value += dt;
  const t0 = performance.now();
  ativas.forEach(t => t.passo(dt, U.tempo.value));
  if (!FORCAR) {
    medidas.push(bruto);
    if (medidas.length >= 90) {
      const ord = medidas.slice(10).sort((a, b) => a - b), med = ord[Math.floor(ord.length / 2)];
      medidas = [];
      if (med > 1 / 17) {
        nivel++;
        if (nivel === 1) TELAS.forEach(t => { t.r.setPixelRatio(1); t.w = 0; });
        else if (nivel >= 3) voltarParaEstatico(`média de ${(1 / med).toFixed(0)} quadros por segundo`);
      } else if (nivel > 0 && med < 1 / 40) { nivel = Math.max(0, nivel - 1); }
    }
  }
  void t0;
}

function iniciar() {
  if (!html.classList.contains("modo-3d")) return;
  try {
    telaMergulho();
    document.querySelectorAll(".cena-mini").forEach(telaMini);
  } catch (e) {
    console.error(e); voltarParaEstatico("erro ao montar a cena"); return;
  }
  addEventListener("vellarys:fase", e => { fase = e.detail.fase; TELAS.forEach(t => t.fase(fase)); });
  document.addEventListener("visibilitychange", () => { medidas = []; });
  requestAnimationFrame(t => { ultimo = t; quadro(t); });
}

const fontes = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontes.then(iniciar).catch(() => voltarParaEstatico("erro"));
