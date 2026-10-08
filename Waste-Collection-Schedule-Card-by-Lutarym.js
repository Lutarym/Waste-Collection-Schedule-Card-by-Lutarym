/*
 * Waste Collection Schedule Card by Lutarym
 * Zeigt die Abholtermine der Müllbehälter aus der Integration "Waste Collection Schedule".
 *
 * Darstellung "glas" (Glaskarte): Jede Tonne ist eine Glaskarte mit 3D-Tiefe.
 * Darstellung "mann" (Mann mit Tonnen): Ein Mann bringt die Tonnen nach vorn.
 * - Ohne Termin: der Mann wartet vor der Tür, die Tonne steht am Haus.
 * - Einen Tag vorher: der Mann angelt mit einem Köder, die Tonne hüpft zum Köder.
 *   Der Köder ist je nach Tonne anders: Fisch (Restmüll), Zeitungsknäuel (Papier),
 *   Joghurtbecher (Gelbe Tonne), Apfelgriebs (Biotonne).
 * - Am Abholtag: der Mann rollt die Tonne auf ihren Rädern an den Rand.
 *   Dort landet sie mit einem kleinen Ruck.
 *
 * Version 2.3.0: Darstellung "Mann mit Tonnen" mit realistischen Größenverhältnissen und Tonne auf Rädern.
 * Version 2.2.0: Darstellung "Mann mit Tonnen" ersetzt die Comic-Figuren (Version 2.1.0).
 * Version 2.1.0: Darstellung "Comic-Tonnen" mit Figuren für jede Tonne.
 * Version 2.0.0: Neue Darstellung "Glaskarte" mit Auswahl im Editor (Option style).
 * Version 1.0.0: Abreißkalender-Konzept (ersetzt durch 2.0.0 als Standard).
 * Version 0.12.0: Abreißkalender-Konzept.
 * Version 0.11.0: Versionsnummer erhöht, keine Funktionsänderung.
 * Version 0.10.0: Schlafende Tonnen mit Party-Zustand.
 * Version 0.9.0: Comic-Stil mit Funken, ohne Müllwagen.
 * Version 0.8.0: Ruhigeres Kachel-Design.
 * Version 0.7.0: Müllwagen mit Abholung, Idle-Animation und Option show_truck.
 * Version 0.6.5: Versionsnummer angeglichen, keine Funktionsänderung.
 * Version 0.5.0: Comic-Stil mit Gesicht und Sprechblasen-Hinweisen.
 * Version 0.4.0: Versionsnummer angeglichen, keine Funktionsänderung.
 * Version 0.3.1: Animation ignoriert die Einstellung "Bewegung reduzieren".
 * Version 0.3.0: Demo-Modus mit Beispieldaten, ohne echte Sensoren.
 * Version 0.2.0: visueller Editor, neue Optionen show_dates, show_badges und animate.
 */

const CARD_TAG = "lutarym-waste-collection-card";
const EDITOR_TAG = "lutarym-waste-collection-card-editor";
const CARD_VERSION = "2.5.0";

const DATE_PATTERN = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;

// Tage ab heute für die Beispieldaten im Demo-Modus, pro Tonne in dieser Reihenfolge.
const DEMO_OFFSETS = [0, 1, 5, 12];

const STYLES = [
  { value: "glas", label: "Glaskarte" },
  { value: "mann", label: "Mann mit Tonnen" },
];

const DEFAULT_BINS = [
  { name: "Restmüll", color: "#3b3b3b" },
  { name: "Papier", color: "#2f6fbf" },
  { name: "Gelbe Tonne", color: "#e8a317" },
  { name: "Biotonne", color: "#7a5230" },
];

const DEFAULT_CONFIG = {
  title: "Müllabfuhr",
  style: "glas",
  show_dates: true,
  show_badges: true,
  animate: true,
  demo: false,
  bins: [],
};

const INK = "#1b1b1b";

function parseCollectionDate(state) {
  if (!state) return null;
  const match = String(state).match(DATE_PATTERN);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function demoDate(offset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hexToRgb(hex) {
  let h = String(hex || "").trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
}

function mixHex(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const m = (x, y) => Math.round(x + (y - x) * t);
  return "#" + [m(pa[0], pb[0]), m(pa[1], pb[1]), m(pa[2], pb[2])]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

const shadeOf = (color, t) => mixHex(color, "#000000", t);

const SKIN = "#f1c27d";
const BLUE = "#2f6fbf";
const TROUSERS = "#34495e";
const HAIR = "#4a3020";

// Die Szene ist 1600 x 900 Einheiten breit und wird als 16:9 Karte dargestellt.
const SCENE = {
  GROUND: 700,        // Gehweg und Hinterhof-Boden
  SCALE: 3.6,         // Skalierung für Mann und Tonnen
  MAN_START: 1060,    // Mann steht am Hintereingang
  YARD_FROM: 1140,    // erste Tonne im Hinterhof
  YARD_TO: 1500,      // letzte Position im Hinterhof
  SLOT_FROM: 170,     // erster Platz an der Straße
  SLOT_STEP: 200,     // Abstand der Plätze an der Straße
  GRAB: 84,           // Abstand Mann zur Tonnenmitte beim Greifen
  WALK: 0.42,         // Gehgeschwindigkeit in Einheiten pro Millisekunde
  PULL: 0.28,         // Ziehgeschwindigkeit der Tonne
};

function yardX(i, n) {
  if (n <= 1) return SCENE.YARD_FROM;
  return SCENE.YARD_FROM + i * Math.min(120, (SCENE.YARD_TO - SCENE.YARD_FROM) / (n - 1));
}

function slotX(i) {
  return SCENE.SLOT_FROM + i * SCENE.SLOT_STEP;
}

// Three.js wird beim ersten Bedarf von jsDelivr geladen.
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";
let threeModulePromise = null;

function loadThree() {
  if (!threeModulePromise) {
    threeModulePromise = import(THREE_URL).catch((err) => {
      threeModulePromise = null;
      throw err;
    });
  }
  return threeModulePromise;
}

// Welt in Metern: 100 Szene-Einheiten entsprechen 1 Welt-Einheit. Mitte der Straße bei x = 0.
const WORLD_X = (x) => (x - 800) / 100;
const SLOT_Z = 1.7;   // Abstellplatz an der Straße
const YARD_Z = 0.2;   // Abstellplatz im Hinterhof
const MAN_Z = 0.6;    // Standplatz des Mannes

function matFor(THREE, color, roughness) {
  return new THREE.MeshStandardMaterial({ color, roughness: roughness === undefined ? 0.6 : roughness });
}

function addBox(THREE, parent, w, h, d, color, x, y, z, cast) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matFor(THREE, color, 0.8));
  mesh.position.set(x, y, z);
  mesh.castShadow = Boolean(cast);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Die Mülltonne auf Rädern, Mitte am Boden, Vorderseite zeigt nach +z.
function buildBin(THREE, color) {
  const group = new THREE.Group();
  addBox(THREE, group, 0.6, 0.8, 0.66, color, 0, 0.5, 0, true);
  addBox(THREE, group, 0.64, 0.12, 0.7, mixHex(color, "#ffffff", 0.2), 0, 0.96, 0, true);
  addBox(THREE, group, 0.3, 0.2, 0.01, "#ffffff", 0, 0.55, 0.335, false);
  const wheelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = matFor(THREE, "#222222", 0.5);
  const wheels = [-0.22, 0.22].map((x) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, 0.07, -0.28);
    w.castShadow = true;
    group.add(w);
    return w;
  });
  const glowGeo = new THREE.CircleGeometry(0.75, 32);
  glowGeo.rotateX(-Math.PI / 2);
  const glow = new THREE.Mesh(
    glowGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
  );
  glow.position.set(0, 0.02, 0);
  group.add(glow);
  return { group, wheels, glow };
}

// Der Mann aus einfachen Formen, etwa 1,9 Meter groß. Beine und Arme sind drehbar.
function buildMan(THREE) {
  const group = new THREE.Group();
  const skin = matFor(THREE, SKIN, 0.6);
  const blue = matFor(THREE, BLUE, 0.7);
  const trousers = matFor(THREE, TROUSERS, 0.7);
  const hair = matFor(THREE, HAIR, 0.8);
  const shoe = matFor(THREE, "#222222", 0.6);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.26), blue);
  torso.position.set(0, 1.25, 0);
  torso.castShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), skin);
  neck.position.set(0, 1.6, 0);
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 16), skin);
  head.position.set(0, 1.76, 0);
  head.castShadow = true;
  group.add(head);

  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.163, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
  hairMesh.position.set(0, 1.78, -0.01);
  group.add(hairMesh);

  for (const x of [-0.05, 0.05]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), shoe);
    eye.position.set(x, 1.77, 0.14);
    group.add(eye);
  }

  const legs = [-0.11, 0.11].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.95, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.7, 4, 10), trousers);
    leg.position.set(0, -0.44, 0);
    leg.castShadow = true;
    pivot.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.26), shoe);
    foot.position.set(0, -0.9, 0.04);
    foot.castShadow = true;
    pivot.add(foot);
    group.add(pivot);
    return pivot;
  });

  const arms = [-0.3, 0.3].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.5, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.45, 4, 10), blue);
    arm.position.set(0, -0.29, 0);
    arm.castShadow = true;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skin);
    hand.position.set(0, -0.6, 0);
    pivot.add(hand);
    group.add(pivot);
    return pivot;
  });

  return { group, legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1] };
}

// Straße, Gehweg, Hinterhof und Haus.
function buildWorld(THREE, scene) {
  addBox(THREE, scene, 10.4, 0.1, 1.2, "#d9d4c7", -2.8, -0.05, 1.6);
  addBox(THREE, scene, 5.6, 0.1, 2.6, "#b8d89a", 5.2, -0.05, -0.3);
  addBox(THREE, scene, 16, 0.1, 8, "#5b6068", 0, -0.05, 6.2);
  addBox(THREE, scene, 16, 0.14, 0.12, "#c9c9c9", 0, 0.07, 2.2);
  for (let x = -7.5; x < 8; x += 1.2) {
    addBox(THREE, scene, 0.6, 0.01, 0.08, "#ffffff", x, 0.003, 4.6);
  }

  addBox(THREE, scene, 5.6, 4.6, 2.4, "#efe3cf", 5.2, 2.3, -1.2, true);
  const roofGeo = new THREE.ConeGeometry(4.2, 2.2, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, matFor(THREE, "#b5573a", 0.7));
  roof.position.set(5.2, 5.7, -1.2);
  roof.castShadow = true;
  scene.add(roof);
  addBox(THREE, scene, 0.9, 0.9, 0.05, "#bfe0f5", 3.4, 3.0, 0.01, false);
  addBox(THREE, scene, 0.9, 0.9, 0.05, "#bfe0f5", 6.3, 3.0, 0.01, false);
  addBox(THREE, scene, 0.9, 2.6, 0.06, "#9a6a45", 3.35, 1.3, 0.02, false);
  addBox(THREE, scene, 0.2, 1.4, 0.2, "#8d5b3a", 2.3, 0.7, 0.5, true);
}

function makeLabelSprite(THREE, text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  const r = 36;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(512, 0, 512, 160, r);
  ctx.arcTo(512, 160, 0, 160, r);
  ctx.arcTo(0, 160, 0, 0, r);
  ctx.arcTo(0, 0, 512, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 88px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 84);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.6, 0.5, 1);
  sprite.visible = false;
  return sprite;
}

// Baut die 3D-Szene in den Container und liefert eine update-Funktion und dispose.
function build3D(THREE, infos, wrap) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  wrap.insertBefore(renderer.domElement, wrap.firstChild);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dcecf7");
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 100);
  camera.position.set(0, 5, 16);
  camera.lookAt(0, 2.7, 0.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a88, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 9, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 30;
  scene.add(sun);
  scene.add(sun.target);

  buildWorld(THREE, scene);

  const bins = infos.map((b) => {
    const bin = buildBin(THREE, b.color);
    scene.add(bin.group);
    bin.label = makeLabelSprite(THREE, b.label || "", b.color);
    bin.label.position.set(0, 1.55, 0);
    bin.group.add(bin.label);
    bin.group.add(bin.glow);
    return bin;
  });

  const man = buildMan(THREE);
  scene.add(man.group);

  const resize = () => {
    const w = wrap.clientWidth || 640;
    const h = wrap.clientHeight || 360;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(wrap);
  resize();

  const update = (st, time, alpha) => {
    const n = infos.length;
    const carrying = st.carry;
    const carryZ = carrying ? YARD_Z + (SLOT_Z - YARD_Z) * carrying.p : YARD_Z;
    const bob = st.moving ? Math.abs(Math.sin(time * 0.025)) * 0.05 : 0;
    const swing = st.moving ? Math.sin(time * 0.012) * 0.6 : 0;
    man.group.position.set(WORLD_X(st.manX), bob, carrying ? carryZ + 0.6 : MAN_Z);
    man.legL.rotation.x = swing;
    man.legR.rotation.x = -swing;
    man.armL.rotation.z = carrying ? -1.2 : 0;
    man.armL.rotation.x = carrying ? 0 : -swing * 0.4;
    man.armR.rotation.x = carrying ? -0.4 : swing * 0.5;

    st.bins.forEach((bin, i) => {
      const part = bins[i];
      if (!part) return;
      let z = YARD_Z;
      if (bin.placed) z = SLOT_Z;
      else if (carrying && carrying.i === i) z = carryZ;
      part.group.position.set(WORLD_X(bin.x), 0, z);
      const dist = (bin.x - yardX(i, n)) / 100;
      part.wheels.forEach((w) => {
        w.rotation.z = -dist / 0.07;
      });
      part.glow.material.opacity = bin.placed ? 0.35 + 0.25 * Math.sin(time * 0.008) : 0;
      part.label.visible = bin.placed && Boolean(infos[i].label);
    });

    renderer.render(scene, camera);
    return alpha;
  };

  const dispose = () => {
    observer.disconnect();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  };

  return { update, dispose };
}

// Der Ablauf einer Abholung: der Mann holt Tonnen aus dem Hinterhof und stellt sie an die Straße.
function buildTimeline(infos) {
  const n = infos.length;
  const due = [];
  infos.forEach((b, i) => {
    if (b.status === "today" || b.status === "tomorrow") due.push(i);
  });
  const segs = [];
  const placeAt = {};
  let t = 600;
  let manX = SCENE.MAN_START;
  for (const i of due) {
    const yard = yardX(i, n);
    const slot = slotX(i);
    const grab = yard + SCENE.GRAB;
    const t1 = t + Math.abs(grab - manX) / SCENE.WALK;
    segs.push({ t0: t, t1, manFrom: manX, manTo: grab, carry: -1 });
    t = t1 + 350;
    const t2 = t + Math.abs(slot - yard) / SCENE.PULL;
    segs.push({ t0: t, t1: t2, manFrom: grab, manTo: slot + SCENE.GRAB, carry: i, binFrom: yard, binTo: slot });
    t = t2 + 500;
    placeAt[i] = t2;
    manX = slot + SCENE.GRAB;
  }
  const holdEnd = t + 3000;
  return { segs, placeAt, holdEnd, cycle: holdEnd + 700, n };
}

// Zustand aller Figuren zu einem Zeitpunkt der Animation.
function sceneAt(tl, time) {
  const bins = [];
  for (let i = 0; i < tl.n; i++) bins.push({ x: yardX(i, tl.n), placed: false });
  let manX = SCENE.MAN_START;
  let moving = false;
  let carry = null;
  for (const seg of tl.segs) {
    if (time >= seg.t1) {
      manX = seg.manTo;
      if (seg.carry >= 0) bins[seg.carry].x = seg.binTo;
      continue;
    }
    if (time >= seg.t0) {
      const p = (time - seg.t0) / (seg.t1 - seg.t0);
      manX = seg.manFrom + (seg.manTo - seg.manFrom) * p;
      moving = seg.manTo !== seg.manFrom;
      if (seg.carry >= 0) {
        bins[seg.carry].x = seg.binFrom + (seg.binTo - seg.binFrom) * p;
        carry = { i: seg.carry, p };
      }
    }
    break;
  }
  for (const key of Object.keys(tl.placeAt)) {
    const i = Number(key);
    if (time >= tl.placeAt[i]) {
      bins[i].placed = true;
      bins[i].x = slotX(i);
    }
  }
  return { manX, moving, bins, carry };
}

class LutarymWasteCollectionCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._signature = null;
    this._raf = null;
    this._els = null;
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Keine Konfiguration erhalten.");
    }
    const demo = Boolean(config.demo);
    const bins = Array.isArray(config.bins) ? config.bins : [];

    if (!demo) {
      if (bins.length === 0) {
        throw new Error("Bitte mindestens eine Tonne unter 'bins' angeben oder den Demo-Modus aktivieren.");
      }
      for (const bin of bins) {
        if (!bin.entity) {
          throw new Error("Jede Tonne braucht eine 'entity'.");
        }
      }
    }

    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      demo,
      bins: bins.length > 0 ? bins : demo ? DEFAULT_BINS : [],
    };
    this._signature = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    // Nur neu zeichnen, wenn sich Termine oder der Tag geändert haben.
    const states = this._config.bins
      .map((bin) => {
        const stateObj = hass.states[bin.entity];
        return stateObj ? stateObj.state : "missing";
      })
      .join("|");
    const signature = `${states}|${this._config.demo}|${this._config.style}|${new Date().toDateString()}`;
    if (signature === this._signature) return;
    this._signature = signature;
    this._render();
  }

  getCardSize() {
    return this._config && this._config.style === "mann" ? 4 : 2;
  }

  connectedCallback() {
    if (this._tl && this._config && this._config.style === "mann") this._mountScene();
  }

  disconnectedCallback() {
    this._disposeScene();
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      title: "Müllabfuhr",
      style: "glas",
      show_dates: true,
      show_badges: true,
      animate: true,
      demo: false,
      bins: [
        { entity: "sensor.waste_collection_schedule_restmulltonne", name: "Restmüll", color: "#3b3b3b" },
        { entity: "sensor.waste_collection_schedule_papiertonne", name: "Papier", color: "#2f6fbf" },
        { entity: "sensor.waste_collection_schedule_gelbe_tonne", name: "Gelbe Tonne", color: "#e8a317" },
        { entity: "sensor.waste_collection_schedule_biotonne", name: "Biotonne", color: "#7a5230" },
      ],
    };
  }

  _stopAnim() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _disposeScene() {
    this._stopAnim();
    this._mountToken = (this._mountToken || 0) + 1;
    if (this._scene3d) {
      this._scene3d.dispose();
      this._scene3d = null;
    }
  }

  async _mountScene() {
    const token = (this._mountToken = (this._mountToken || 0) + 1);
    const wrap = this.shadowRoot.querySelector(".scene-wrap");
    if (!wrap || !this._tl) return;
    const fallback = wrap.querySelector(".fallback");
    let THREE;
    try {
      THREE = await loadThree();
      if (token !== this._mountToken || !wrap.isConnected) return;
      this._scene3d = build3D(THREE, this._infos, wrap);
    } catch (err) {
      if (token === this._mountToken && fallback) {
        fallback.textContent =
          "3D-Grafik konnte nicht geladen werden. Die Karte braucht Internetzugriff auf three.js (cdn.jsdelivr.net) und WebGL im Browser.";
      }
      return;
    }
    if (fallback) fallback.textContent = "";
    this._startAnim();
  }

  _startAnim() {
    this._stopAnim();
    if (!this._scene3d || !this._tl) return;
    const tl = this._tl;
    if (!this._config.animate || tl.segs.length === 0) {
      this._update(tl.holdEnd);
      return;
    }
    this._t0 = performance.now();
    const loop = (now) => {
      this._update((now - this._t0) % tl.cycle);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _update(time) {
    const tl = this._tl;
    if (!this._scene3d || !tl) return;
    let alpha = 1;
    if (time > tl.holdEnd) alpha = Math.max(0, 1 - (time - tl.holdEnd) / 700);
    const st = sceneAt(tl, time);
    this._scene3d.update(st, time, alpha);
    const fade = this.shadowRoot.querySelector(".fade");
    if (fade) fade.style.opacity = String(1 - alpha);
  }

  _render() {
    if (!this._config) return;
    if (!this._config.demo && !this._hass) return;
    this._disposeScene();

    const cfg = this._config;
    const mann = cfg.style === "mann";
    const fullDate = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };

    const infos = cfg.bins.map((bin, index) => {
      const stateObj = this._hass ? this._hass.states[bin.entity] : undefined;
      const name =
        bin.name ||
        (stateObj && stateObj.attributes.friendly_name) ||
        bin.entity ||
        `Tonne ${index + 1}`;
      const color = bin.color || "#888888";

      let date = null;
      let days = null;
      if (cfg.demo) {
        const offset = DEMO_OFFSETS[index % DEMO_OFFSETS.length];
        date = demoDate(offset);
        days = offset;
      } else if (stateObj) {
        date = parseCollectionDate(stateObj.state);
        days = date ? daysUntil(date) : null;
      }

      let status = "none";
      if (days === 0) status = "today";
      else if (days === 1) status = "tomorrow";
      const animated = cfg.animate ? status : "none";

      const weekday = date ? date.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "") : "?";
      const day = date ? String(date.getDate()).padStart(2, "0") : "?";
      const month = date ? date.toLocaleDateString("de-DE", { month: "short" }).replace(".", "") : "";
      const badgeText = status === "today" ? "Heute" : status === "tomorrow" ? "Morgen" : "";
      const label = cfg.show_badges && badgeText ? (status === "today" ? "Heute!" : "Morgen!") : "";
      const dateText = date ? date.toLocaleDateString("de-DE", fullDate) : "kein Termin";

      return { name, color, status, animated, weekday, day, month, badgeText, label, dateText, date };
    });

    const titleText = cfg.demo ? `${cfg.title || ""} (Demo)`.trim() : cfg.title;
    const title = titleText ? `<div class="title">${escapeHtml(titleText)}</div>` : "";

    let body;
    if (mann) {
      this._infos = infos;
      this._tl = buildTimeline(infos);
      const legend = infos
        .map(
          (b) => `
          <div class="legend-item">
            <span class="chip" style="background:${escapeHtml(b.color)}"></span>
            <span class="legend-name">${escapeHtml(b.name)}</span>
            ${cfg.show_dates ? `<span class="legend-date">${escapeHtml(b.dateText)}</span>` : ""}
          </div>`
        )
        .join("");
      body = `
        <div class="scene-wrap"><div class="fallback"></div><div class="fade"></div></div>
        <div class="legend">${legend}</div>`;
    } else {
      this._tl = null;
      const tiles = infos.map((b) => `
        <div class="tile ${b.animated}" style="--c:${escapeHtml(b.color)}">
          <div class="glass">
            <div class="gloss"></div>
            <div class="band">${escapeHtml(b.month)}</div>
            <div class="wk">${escapeHtml(b.weekday)}</div>
            <div class="day">${escapeHtml(b.day)}</div>
            ${cfg.show_badges && b.badgeText ? `<div class="badge">${b.badgeText}</div>` : ""}
          </div>
          <div class="shadow"></div>
          <div class="bin-name">${escapeHtml(b.name)}</div>
          ${cfg.show_dates ? `<div class="bin-date">${escapeHtml(b.dateText)}</div>` : ""}
        </div>`);
      body = `<div class="tiles">${tiles.join("")}</div>`;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 16px; overflow: hidden; }
        .title {
          font-size: 1.1em;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--primary-text-color);
        }
        .tiles {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-around;
          gap: 12px;
          perspective: 900px;
        }
        .tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 124px;
        }
        .bin-name {
          margin-top: 4px;
          font-weight: 700;
          color: var(--primary-text-color);
          text-align: center;
        }
        .bin-date {
          font-size: 0.82em;
          color: var(--secondary-text-color);
          text-align: center;
        }
        .shadow {
          width: 84px;
          height: 10px;
          margin-top: 6px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.18);
          filter: blur(3px);
        }

        /* Die Glaskarte */
        /* Die Glaskarte */
        .glass {
          position: relative;
          width: 112px;
          height: 132px;
          border-radius: 20px;
          background: linear-gradient(150deg, rgba(255, 255, 255, 0.95), rgba(220, 234, 255, 0.55));
          border: 1.5px solid rgba(255, 255, 255, 0.9);
          box-shadow: inset 0 1px 0 #ffffff, 0 10px 18px -8px rgba(20, 40, 80, 0.35);
          text-align: center;
          transform-style: preserve-3d;
          overflow: hidden;
        }
        .gloss {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 8px;
          height: 42%;
          border-radius: 14px;
          background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0));
          pointer-events: none;
        }
        .band {
          position: relative;
          margin: 14px auto 0;
          width: fit-content;
          padding: 0 10px;
          font-size: 11px;
          letter-spacing: 0.12em;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--c);
        }
        .wk {
          position: relative;
          margin-top: 4px;
          font-size: 11px;
          color: var(--secondary-text-color);
        }
        .day {
          position: relative;
          margin-top: 2px;
          font-size: 46px;
          font-weight: 900;
          line-height: 1;
          color: var(--primary-text-color);
        }
        .badge {
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 0.7em;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #ffffff;
          background: var(--c);
          white-space: nowrap;
        }

        /* Glaskarte, Zustand: ohne Termin */
        .none .glass { animation: floatCalm 6s ease-in-out infinite; }
        .none .shadow { animation: shadowCalm 6s ease-in-out infinite; }

        /* Glaskarte, Zustand: einen Tag vorher */
        .tomorrow .glass { animation: floatSoft 3.6s ease-in-out infinite; }
        .tomorrow .shadow { animation: shadowSoft 3.6s ease-in-out infinite; }

        /* Glaskarte, Zustand: Abholtag */
        .today .glass { animation: liftToday 1.8s ease-in-out infinite; }
        .today .shadow { animation: shadowToday 1.8s ease-in-out infinite; }
        .today .glass:after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 20px;
          box-shadow: 0 0 22px 2px var(--c);
          opacity: 0.35;
          animation: glowToday 1.8s ease-in-out infinite;
          pointer-events: none;
        }

        /* Mann mit Tonnen: 16:9 Szene mit Hinterhof, Haus und Straße */
        .scene-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 6px 16px -8px rgba(0, 0, 0, 0.35);
        }
        .scene-wrap canvas { position: absolute; inset: 0; }
        .fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          text-align: center;
          font-size: 0.9em;
          color: #1b1b1b;
        }
        .fade {
          position: absolute;
          inset: 0;
          background: #dcecf7;
          opacity: 0;
          pointer-events: none;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 16px;
          margin-top: 12px;
          font-size: 0.9em;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-name {
          font-weight: 700;
          color: var(--primary-text-color);
        }
        .legend-date {
          color: var(--secondary-text-color);
        }
        .chip {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1.5px solid ${INK};
        }

        @keyframes floatCalm {
          0%, 100% { transform: translateY(0) rotateX(6deg) rotateY(-6deg); }
          50% { transform: translateY(-6px) rotateX(-3deg) rotateY(6deg); }
        }
        @keyframes floatSoft {
          0%, 100% { transform: translateY(0) rotateX(8deg) rotateY(-10deg); }
          50% { transform: translateY(-10px) rotateX(-4deg) rotateY(10deg); }
        }
        @keyframes liftToday {
          0%, 100% { transform: translateZ(0) rotateX(6deg) rotateY(0deg); }
          50% { transform: translateZ(46px) rotateX(-6deg) rotateY(6deg); }
        }
        @keyframes shadowCalm {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(0.92); opacity: 0.6; }
        }
        @keyframes shadowSoft {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(0.85); opacity: 0.5; }
        }
        @keyframes shadowToday {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(0.6); opacity: 0.3; }
        }
        @keyframes glowToday {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.55; }
        }
      </style>
      <ha-card>
        ${title}
        ${body}
      </ha-card>
    `;

    if (mann) {
      this._mountScene();
    }
  }
}

class LutarymWasteCollectionCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = { ...DEFAULT_CONFIG };
  }

  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config, bins: [...(config.bins || [])] };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this.shadowRoot.querySelectorAll("ha-form").forEach((form) => {
      form.hass = hass;
    });
  }

  _label(schemaItem) {
    const labels = {
      title: "Überschrift",
      style: "Darstellung",
      show_dates: "Datum anzeigen",
      show_badges: "Heute und Morgen Hinweis anzeigen",
      animate: "Animation aktivieren",
      demo: "Demo-Modus (Beispieldaten, ohne Sensoren)",
      entity: "Sensor",
      name: "Anzeigename",
      color: "Farbe (Hex, z. B. #2f6fbf)",
    };
    return labels[schemaItem.name] || schemaItem.name;
  }

  _fire() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _topSchema() {
    return [
      { name: "title", selector: { text: {} } },
      { name: "style", selector: { select: { mode: "dropdown", options: STYLES } } },
      { name: "show_dates", selector: { boolean: {} } },
      { name: "show_badges", selector: { boolean: {} } },
      { name: "animate", selector: { boolean: {} } },
      { name: "demo", selector: { boolean: {} } },
    ];
  }

  _binSchema() {
    return [
      { name: "entity", selector: { entity: { domain: "sensor" } } },
      { name: "name", selector: { text: {} } },
      { name: "color", selector: { text: {} } },
    ];
  }

  _render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        .section { margin-bottom: 16px; }
        .bin-block {
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 8px;
        }
        .bin-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
          margin-bottom: 4px;
        }
        button {
          font: inherit;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--primary-color, #03a9f4);
          background: transparent;
          color: var(--primary-color, #03a9f4);
          cursor: pointer;
        }
        button.remove {
          border-color: var(--error-color, #db4437);
          color: var(--error-color, #db4437);
        }
        .version {
          font-size: 0.8em;
          color: var(--secondary-text-color);
          margin-top: 12px;
        }
      </style>
      <div class="section" id="top"></div>
      <div class="section">
        <strong>Tonnen</strong>
        <div id="bins"></div>
        <button id="add">Tonne hinzufügen</button>
      </div>
      <div class="version">Version ${CARD_VERSION}</div>
    `;

    const top = this.shadowRoot.getElementById("top");
    const topForm = document.createElement("ha-form");
    topForm.hass = this._hass;
    topForm.data = this._config;
    topForm.schema = this._topSchema();
    topForm.computeLabel = (item) => this._label(item);
    topForm.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = { ...this._config, ...ev.detail.value };
      this._fire();
    });
    top.appendChild(topForm);

    const binsRoot = this.shadowRoot.getElementById("bins");
    this._config.bins.forEach((bin, index) => {
      const block = document.createElement("div");
      block.className = "bin-block";
      block.innerHTML = `
        <div class="bin-head">
          <span>Tonne ${index + 1}</span>
          <button class="remove" data-index="${index}">Entfernen</button>
        </div>`;

      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.data = bin;
      form.schema = this._binSchema();
      form.computeLabel = (item) => this._label(item);
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const bins = [...this._config.bins];
        bins[index] = { ...bins[index], ...ev.detail.value };
        this._config = { ...this._config, bins };
        this._fire();
      });
      block.appendChild(form);
      binsRoot.appendChild(block);
    });

    binsRoot.querySelectorAll("button.remove").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        const bins = this._config.bins.filter((_, i) => i !== index);
        this._config = { ...this._config, bins };
        this._render();
        this._fire();
      });
    });

    this.shadowRoot.getElementById("add").addEventListener("click", () => {
      const bins = [...this._config.bins, { entity: "", name: "", color: "#888888" }];
      this._config = { ...this._config, bins };
      this._render();
      this._fire();
    });
  }
}

customElements.define(CARD_TAG, LutarymWasteCollectionCard);
customElements.define(EDITOR_TAG, LutarymWasteCollectionCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: "Waste Collection Schedule Card by Lutarym",
  description: "Müllabfuhr-Termine als Glaskarten oder als Mann mit Tonnen, mit Animation am Abholtag.",
  preview: false,
});

console.info(
  `%c WASTE-COLLECTION-SCHEDULE-CARD-BY-LUTARYM %c v${CARD_VERSION} `,
  "color: white; background: #2e7d32; font-weight: 700;",
  "color: #2e7d32; background: white; font-weight: 700;"
);
