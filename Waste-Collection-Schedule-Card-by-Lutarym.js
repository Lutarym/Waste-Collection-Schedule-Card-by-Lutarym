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
const CARD_VERSION = "2.4.0";

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

// Die Mülltonne auf Rädern, im lokalen Koordinatensystem um x = 30 zentriert, Boden bei y = 103.
function binSvg(color) {
  const c = escapeHtml(color);
  const dark = escapeHtml(shadeOf(color, 0.35));
  return `
    <g>
      <path d="M18 60 H42 L41 101 Q41 103 39 103 H21 Q19 103 19 101 Z" fill="${c}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M36 60 H42 L41 101 Q41 103 39 103 H36 Z" fill="${dark}" opacity="0.55"/>
      <rect x="21" y="63" width="2.6" height="34" rx="1.3" fill="#ffffff" opacity="0.35"/>
      <rect x="22" y="79" width="16" height="7" rx="1" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
      <g class="wheel-l">
        <circle cx="22" cy="101" r="2.6" fill="${INK}"/>
        <line x1="22" y1="99" x2="22" y2="103" stroke="#ffffff" stroke-width="0.9"/>
      </g>
      <g class="wheel-r">
        <circle cx="38" cy="101" r="2.6" fill="${INK}"/>
        <line x1="38" y1="99" x2="38" y2="103" stroke="#ffffff" stroke-width="0.9"/>
      </g>
      <rect x="15" y="53" width="30" height="8" rx="2.5" fill="${c}" stroke="${INK}" stroke-width="2.2"/>
      <rect x="17" y="54.5" width="26" height="2" rx="1" fill="#ffffff" opacity="0.3"/>
    </g>`;
}

// Der Mann, etwa 81 Einheiten groß, Mitte bei x = 100, Boden bei y = 103.5.
const MAN_SVG = `
  <g>
    <path d="M97 70 L94 88 L93 102 M104 70 L107 88 L108 102" fill="none" stroke="${INK}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M97 70 L94 88 L93 102 M104 70 L107 88 L108 102" fill="none" stroke="${TROUSERS}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M89 103.5 H97 M104 103.5 H112" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M109 44 L113 58 L110 66" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M109 44 L113 58 L110 66" fill="none" stroke="${SKIN}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M89 44 Q100 40 111 44 L112 71 Q100 74 88 71 Z" fill="${BLUE}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M88 70 Q100 73 112 70" fill="none" stroke="${INK}" stroke-width="2"/>
    <path d="M90 46 Q78 48 74 58" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M90 46 Q78 48 74 58" fill="none" stroke="${BLUE}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="74" cy="58" r="2.6" fill="${SKIN}" stroke="${INK}" stroke-width="1.6"/>
    <rect x="97" y="36" width="6" height="6" fill="${SKIN}"/>
    <circle cx="100" cy="30" r="7.5" fill="${SKIN}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M92.5 29 Q93 21 100 21 Q107.5 21 107.5 29 Q104 25.5 100 25.5 Q96 25.5 92.5 29 Z" fill="${HAIR}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="97.5" cy="30.5" r="0.9" fill="${INK}"/>
    <circle cx="102.5" cy="30.5" r="0.9" fill="${INK}"/>
    <path d="M97.5 34 Q100 35.8 102.5 34" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>
  </g>`;

// Hintergrund: Himmel, Haus mit Hintereingang, Hinterhof, Gehweg und Straße.
const BACKGROUND_SVG = `
  <rect x="0" y="0" width="1600" height="900" fill="#dcecf7"/>
  <rect x="1040" y="120" width="560" height="580" fill="#efe3cf" stroke="${INK}" stroke-width="5"/>
  <path d="M1010 120 L1320 10 L1630 120 Z" fill="#b5573a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <rect x="1090" y="190" width="100" height="100" fill="#bfe0f5" stroke="${INK}" stroke-width="4"/>
  <rect x="1380" y="190" width="100" height="100" fill="#bfe0f5" stroke="${INK}" stroke-width="4"/>
  <rect x="1090" y="410" width="90" height="290" fill="#9a6a45" stroke="${INK}" stroke-width="4"/>
  <rect x="1020" y="560" width="20" height="140" fill="#8d5b3a" stroke="${INK}" stroke-width="4"/>
  <rect x="0" y="700" width="1040" height="60" fill="#d9d4c7"/>
  <rect x="1040" y="700" width="560" height="60" fill="#b8d89a"/>
  <rect x="0" y="760" width="1600" height="140" fill="#5b6068"/>
  <line x1="0" y1="760" x2="1600" y2="760" stroke="${INK}" stroke-width="5"/>
  <line x1="0" y1="700" x2="1040" y2="700" stroke="${INK}" stroke-width="3"/>
  <line x1="0" y1="836" x2="1600" y2="836" stroke="#ffffff" stroke-width="6" stroke-dasharray="60 40" opacity="0.7"/>`;

// Die Szene mit allen Tonnen, dem Mann, den Glanzflächen und den Sprechblasen.
function sceneHtml(infos) {
  const n = infos.length;
  const glows = infos
    .map((b, i) => `<ellipse class="glow" data-i="${i}" cx="${slotX(i)}" cy="${SCENE.GROUND + 6}" rx="150" ry="26" fill="${escapeHtml(b.color)}" opacity="0"/>`)
    .join("");
  const bins = infos.map((b, i) => `<g class="bin-g" data-i="${i}">${binSvg(b.color)}</g>`).join("");
  const labels = infos
    .map((b, i) => {
      if (!b.label) return "";
      return `<g class="label" data-i="${i}" opacity="0" transform="translate(${slotX(i)},${SCENE.GROUND - 270})">
        <rect x="-150" y="-48" width="300" height="96" rx="26" fill="${escapeHtml(b.color)}" stroke="${INK}" stroke-width="6"/>
        <text x="0" y="22" text-anchor="middle" font-size="62" font-weight="800" fill="#ffffff" stroke="${INK}" stroke-width="5" paint-order="stroke" font-family="sans-serif">${escapeHtml(b.label)}</text>
      </g>`;
    })
    .join("");
  return `
    <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
      <g class="scene-inner">
        ${BACKGROUND_SVG}
        ${glows}
        ${bins}
        ${labels}
        <g class="man-wrap">${MAN_SVG}</g>
      </g>
    </svg>`;
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
      if (seg.carry >= 0) bins[seg.carry].x = seg.binFrom + (seg.binTo - seg.binFrom) * p;
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
  return { manX, moving, bins };
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
    if (this._els && this._tl) this._startAnim();
  }

  disconnectedCallback() {
    this._stopAnim();
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

  _startAnim() {
    this._stopAnim();
    if (!this._els || !this._tl) return;
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
    const els = this._els;
    const tl = this._tl;
    if (!els || !tl) return;
    const st = sceneAt(tl, time);
    const bob = st.moving ? Math.abs(Math.sin(time * 0.025)) * 5 : 0;
    els.man.setAttribute(
      "transform",
      `translate(${st.manX},${SCENE.GROUND - bob}) scale(${SCENE.SCALE}) translate(-100,-103.5)`
    );
    st.bins.forEach((bin, i) => {
      const el = els.bins[i];
      if (el) {
        el.setAttribute("transform", `translate(${bin.x},${SCENE.GROUND}) scale(${SCENE.SCALE}) translate(-30,-103.5)`);
        const deg = ((bin.x - yardX(i, tl.n)) / (SCENE.SCALE * 2.6)) * (180 / Math.PI);
        els.wl[i].setAttribute("transform", `rotate(${deg} 22 101)`);
        els.wr[i].setAttribute("transform", `rotate(${deg} 38 101)`);
      }
      if (els.glows[i]) {
        els.glows[i].setAttribute("opacity", bin.placed ? (0.35 + 0.25 * Math.sin(time * 0.008)).toFixed(3) : "0");
      }
      if (els.labels[i]) {
        els.labels[i].setAttribute("opacity", bin.placed ? "1" : "0");
      }
    });
    let alpha = 1;
    if (time > tl.holdEnd) alpha = Math.max(0, 1 - (time - tl.holdEnd) / 700);
    els.inner.setAttribute("opacity", alpha.toFixed(3));
  }

  _render() {
    if (!this._config) return;
    if (!this._config.demo && !this._hass) return;
    this._stopAnim();

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
        <div class="scene-wrap">${sceneHtml(infos)}</div>
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
        .scene {
          width: 100%;
          height: 100%;
          display: block;
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
      const root = this.shadowRoot;
      this._els = {
        man: root.querySelector(".man-wrap"),
        inner: root.querySelector(".scene-inner"),
        bins: infos.map((_, i) => root.querySelector(`.bin-g[data-i="${i}"]`)),
        wl: infos.map((_, i) => root.querySelector(`.bin-g[data-i="${i}"] .wheel-l`)),
        wr: infos.map((_, i) => root.querySelector(`.bin-g[data-i="${i}"] .wheel-r`)),
        glows: infos.map((_, i) => root.querySelector(`.glow[data-i="${i}"]`)),
        labels: infos.map((_, i) => root.querySelector(`.label[data-i="${i}"]`)),
      };
      this._startAnim();
    } else {
      this._els = null;
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
