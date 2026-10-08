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
const CARD_VERSION = "2.3.0";

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

// Welcher Köder zu einer Tonne gehört, wird am Namen erkannt.
function binType(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("papier")) return "papier";
  if (n.includes("gelb")) return "gelb";
  if (n.includes("bio")) return "bio";
  return "rest";
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

// Der Köder am Angelhaken, im Ursprung (0, 0) gezeichnet.
function baitSvg(type) {
  if (type === "papier") {
    return `
      <circle r="6" fill="#f4f1e8" stroke="${INK}" stroke-width="2"/>
      <path d="M-3.5 -2 H3.5 M-3.5 1 H3.5" stroke="#8a8a8a" stroke-width="1.2"/>`;
  }
  if (type === "gelb") {
    return `
      <rect x="-6" y="-8" width="12" height="3" rx="1.5" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
      <path d="M-5 -5 H5 L4 6 H-4 Z" fill="#ff8fa3" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  if (type === "bio") {
    return `
      <path d="M0 -3 C-7 -7 -8 3 0 7 C8 3 7 -7 0 -3 Z" fill="#e53935" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M1 -3 Q3 -8 7 -8 Q5 -3 1 -3 Z" fill="#4caf50" stroke="${INK}" stroke-width="1.5"/>`;
  }
  return `
    <path d="M-9 0 Q-2 -6 7 0 Q-2 6 -9 0 Z" fill="#9fb8c8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M7 0 L12 -4.5 L12 4.5 Z" fill="#9fb8c8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
}

// Die Tonne auf Rädern. Maßstab: etwa 0,6 der Körpergröße des Mannes, Boden bei y = 103.
function binSvg(color) {
  const c = escapeHtml(color);
  const dark = escapeHtml(shadeOf(color, 0.35));
  return `
    <g class="bin-anim">
      <path d="M18 60 H42 L41 101 Q41 103 39 103 H21 Q19 103 19 101 Z" fill="${c}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M36 60 H42 L41 101 Q41 103 39 103 H36 Z" fill="${dark}" opacity="0.55"/>
      <rect x="21" y="63" width="2.6" height="34" rx="1.3" fill="#ffffff" opacity="0.35"/>
      <rect x="22" y="79" width="16" height="7" rx="1" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
      <g class="wheel wheel-l">
        <circle cx="22" cy="101" r="2.6" fill="${INK}"/>
        <line x1="22" y1="99" x2="22" y2="103" stroke="#ffffff" stroke-width="0.9"/>
      </g>
      <g class="wheel wheel-r">
        <circle cx="38" cy="101" r="2.6" fill="${INK}"/>
        <line x1="38" y1="99" x2="38" y2="103" stroke="#ffffff" stroke-width="0.9"/>
      </g>
      <g class="lid">
        <rect x="15" y="53" width="30" height="8" rx="2.5" fill="${c}" stroke="${INK}" stroke-width="2.2"/>
        <rect x="17" y="54.5" width="26" height="2" rx="1" fill="#ffffff" opacity="0.3"/>
      </g>
    </g>`;
}

// Der Mann in Alltagskleidung, etwa 81 Einheiten groß. Vordere Hand bei (80, 58).
const MAN_SVG = `
  <g class="man">
    <path d="M97 70 L94 88 L93 102 M104 70 L107 88 L108 102" fill="none" stroke="${INK}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M97 70 L94 88 L93 102 M104 70 L107 88 L108 102" fill="none" stroke="${TROUSERS}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M89 103.5 H97 M104 103.5 H112" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M109 44 L113 58 L110 66" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M109 44 L113 58 L110 66" fill="none" stroke="${SKIN}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M89 44 Q100 40 111 44 L112 71 Q100 74 88 71 Z" fill="${BLUE}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M88 70 Q100 73 112 70" fill="none" stroke="${INK}" stroke-width="2"/>
    <path d="M90 46 Q82 48 80 58" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M90 46 Q82 48 80 58" fill="none" stroke="${BLUE}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="80" cy="58" r="2.6" fill="${SKIN}" stroke="${INK}" stroke-width="1.6"/>
    <rect x="97" y="36" width="6" height="6" fill="${SKIN}"/>
    <circle cx="100" cy="30" r="7.5" fill="${SKIN}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M92.5 29 Q93 21 100 21 Q107.5 21 107.5 29 Q104 25.5 100 25.5 Q96 25.5 92.5 29 Z" fill="${HAIR}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="97.5" cy="30.5" r="0.9" fill="${INK}"/>
    <circle cx="102.5" cy="30.5" r="0.9" fill="${INK}"/>
    <path d="M97.5 34 Q100 35.8 102.5 34" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>
  </g>`;

// Haus und Boden, bleiben immer stehen.
const HOUSE_SVG = `
  <rect x="82" y="12" width="38" height="92" fill="#efe3cf" stroke="${INK}" stroke-width="2.2"/>
  <rect x="92" y="42" width="22" height="62" fill="#9a6a45" stroke="${INK}" stroke-width="2.2"/>
  <line x1="0" y1="103.5" x2="120" y2="103.5" stroke="${INK}" stroke-width="2.2"/>`;

// Die Tonne wird vom Mann über den Gehweg gerollt, dabei drehen sich die Räder.
function convoySvg(color) {
  return `
    <g class="convoy">
      <ellipse cx="66" cy="104" rx="16" ry="2.2" fill="${INK}" opacity="0.18"/>
      <g transform="translate(36,0)">${binSvg(color)}</g>
      ${MAN_SVG}
    </g>`;
}

// Die Szene einer Tonne: Abholung bevorsteht oder heute ist, Mann mit Köder oder schiebend.
function sceneSvg(name, color) {
  const type = binType(name);
  return `
    <svg class="scene" viewBox="0 0 120 120">
      ${HOUSE_SVG}
      <g class="static-set">
        <ellipse cx="30" cy="104" rx="16" ry="2.2" fill="${INK}" opacity="0.18"/>
        ${binSvg(color)}
        <ellipse cx="100" cy="104" rx="11" ry="2" fill="${INK}" opacity="0.18"/>
        <g class="rod-set">
          <g class="rod">
            <line x1="80" y1="58" x2="48" y2="22" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
            <g transform="translate(48,22)"><g class="bait">${baitSvg(type)}</g></g>
          </g>
        </g>
        ${MAN_SVG}
      </g>
      <g class="convoy-set">${convoySvg(color)}</g>
    </svg>`;
}

class LutarymWasteCollectionCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._signature = null;
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
    return 2;
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

  _render() {
    if (!this._config) return;
    if (!this._config.demo && !this._hass) return;

    const cfg = this._config;
    const mann = cfg.style === "mann";
    const fullDate = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };

    const tiles = cfg.bins.map((bin, index) => {
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
      const bubbleText = status === "today" ? "Heute!" : status === "tomorrow" ? "Morgen!" : "";

      const dateLine = cfg.show_dates
        ? `<div class="bin-date">${escapeHtml(date ? date.toLocaleDateString("de-DE", fullDate) : "kein Termin")}</div>`
        : "";
      const nameLine = `<div class="bin-name">${escapeHtml(name)}</div>`;

      if (mann) {
        const bubble = cfg.show_badges && bubbleText ? `<div class="bubble">${bubbleText}</div>` : "";
        const speed = status === "today" ? `<div class="speed"></div>` : "";
        return `
          <div class="tile mann-tile ${animated}" style="--c:${escapeHtml(color)}">
            <div class="stage">
              ${speed}
              ${bubble}
              ${sceneSvg(name, color)}
            </div>
            <div class="shadow"></div>
            ${nameLine}
            ${dateLine}
          </div>`;
      }

      return `
        <div class="tile ${animated}" style="--c:${escapeHtml(color)}">
          <div class="glass">
            <div class="gloss"></div>
            <div class="band">${escapeHtml(month)}</div>
            <div class="wk">${escapeHtml(weekday)}</div>
            <div class="day">${escapeHtml(day)}</div>
            ${cfg.show_badges && badgeText ? `<div class="badge">${badgeText}</div>` : ""}
          </div>
          <div class="shadow"></div>
          ${nameLine}
          ${dateLine}
        </div>`;
    });

    const titleText = cfg.demo ? `${cfg.title || ""} (Demo)`.trim() : cfg.title;
    const title = titleText ? `<div class="title">${escapeHtml(titleText)}</div>` : "";

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
        .shadow {
          width: 84px;
          height: 10px;
          margin-top: 6px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.18);
          filter: blur(3px);
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

        /* Mann mit Tonnen */
        .stage {
          position: relative;
          width: 112px;
          height: 112px;
          margin: 0 auto;
        }
        .scene {
          width: 112px;
          height: 112px;
          display: block;
          overflow: visible;
        }
        .scene * { transform-box: view-box; }
        .bin-anim { transform-origin: 30px 103px; }
        .lid { transform-origin: 18px 53px; }
        .wheel-l { transform-origin: 22px 101px; }
        .wheel-r { transform-origin: 38px 101px; }
        .rod { transform-origin: 80px 58px; }
        .convoy-set { display: none; }
        .rod-set { display: none; }

        /* Zustand: ohne Termin, der Mann wartet, die Tonne steht am Haus */
        .none .static-set .bin-anim { animation: binIdle 6s ease-in-out infinite; }
        .none .static-set .man { animation: manWait 4s ease-in-out infinite; }

        /* Zustand: einen Tag vorher, der Mann angelt, die Tonne hüpft zum Köder */
        .tomorrow .rod-set { display: block; }
        .tomorrow .static-set .bin-anim { animation: binCome 2.2s ease-in-out infinite; }
        .tomorrow .static-set .lid { animation: lidAjar 1.1s ease-in-out infinite; }
        .tomorrow .static-set .rod { animation: rodSwing 1.8s ease-in-out infinite; }
        .tomorrow .static-set .man { animation: manWait 1.8s ease-in-out infinite; }

        /* Zustand: Abholtag, der Mann rollt die Tonne an den Rand */
        .today .static-set { display: none; }
        .today .convoy-set { display: block; }
        .today .convoy { animation: convoyRoll 2.6s ease-in-out infinite; }
        .today .convoy .bin-anim { animation: binThud 2.6s ease-in-out infinite; }
        .today .convoy .wheel { animation: wheelSpin 2.6s ease-in-out infinite; }
        .today .convoy .man { animation: manPush 0.6s ease-in-out infinite; }

        .bubble {
          display: none;
          position: absolute;
          top: -2px;
          right: -6px;
          z-index: 2;
          padding: 2px 9px;
          border: 3px solid ${INK};
          border-radius: 14px;
          background: #ffffff;
          color: ${INK};
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 2px 2px 0 ${INK};
        }
        .mann-tile.tomorrow .bubble,
        .mann-tile.today .bubble { display: block; animation: pop 0.6s ease-out; }
        .mann-tile.today .bubble { background: #ffd23f; left: 0; right: auto; top: 0; }

        .speed {
          display: none;
          position: absolute;
          left: -8px;
          top: 40px;
          width: 22px;
          height: 50px;
          background: repeating-linear-gradient(to bottom, ${INK} 0 3px, transparent 3px 12px);
          z-index: 1;
        }
        .mann-tile.today .speed { display: block; animation: speedFlash 0.7s ease-in-out infinite; }

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

        @keyframes binIdle {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(1.5deg) translateY(-1px); }
        }
        @keyframes binCome {
          0%, 100% { transform: translate(0, 0) scale(1, 1); }
          25% { transform: translate(6px, -12px) rotate(-6deg); }
          45% { transform: translate(12px, 0) scale(1.06, 0.94); }
          65% { transform: translate(12px, -2px) rotate(3deg); }
          85% { transform: translate(0, 0) scale(1, 1); }
        }
        @keyframes lidAjar {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(-18deg); }
        }
        @keyframes rodSwing {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes manWait {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes convoyRoll {
          0% { transform: translateX(0); opacity: 0; }
          8% { transform: translateX(0); opacity: 1; }
          62% { transform: translateX(-36px); opacity: 1; }
          80% { transform: translateX(-36px); opacity: 1; }
          90%, 100% { transform: translateX(-36px); opacity: 0; }
        }
        @keyframes binThud {
          0%, 58%, 100% { transform: translate(0, 0) rotate(0deg) scale(1, 1); }
          64% { transform: translate(0, -3px) rotate(-3deg) scale(1, 1); }
          70% { transform: translate(0, 0) rotate(0deg) scale(1.04, 0.96); }
          76% { transform: translate(0, 0) rotate(0deg) scale(1, 1); }
        }
        @keyframes wheelSpin {
          0% { transform: rotate(0deg); }
          60% { transform: rotate(1080deg); }
          100% { transform: rotate(1080deg); }
        }
        @keyframes manPush {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes pop {
          0% { transform: scale(0.4); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes speedFlash {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      </style>
      <ha-card>
        ${title}
        <div class="tiles">${tiles.join("")}</div>
      </ha-card>
    `;
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
