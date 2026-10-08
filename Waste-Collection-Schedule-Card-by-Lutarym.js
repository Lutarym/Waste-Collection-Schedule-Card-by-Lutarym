/*
 * Waste Collection Schedule Card by Lutarym
 * Zeigt die Abholtermine der Müllbehälter aus der Integration "Waste Collection Schedule".
 *
 * Konzept "Die schlafenden Tonnen":
 * - Ohne Termin schlafen die Tonnen, mit Zzz-Zeichen und geschlossenen Augen.
 * - Einen Tag vorher wachen sie auf, reißen die Augen auf und das Ausrufezeichen erscheint.
 * - Am Abholtag feiern sie eine Party: Partyhut, Konfetti, Tanzen und offener Mund.
 *
 * Version 0.10.0: Komplett neues Design und neue Animation (Schlafen, Aufwachen, Party).
 * Version 0.9.0: Comic-Stil mit Funken, ohne Müllwagen.
 * Version 0.8.0: Ruhigeres Kachel-Design, inzwischen ersetzt.
 * Version 0.7.0: Müllwagen mit Abholung, Idle-Animation und Option show_truck.
 * Version 0.6.5: Versionsnummer angeglichen, keine Funktionsänderung.
 * Version 0.5.0: Comic-Stil mit Gesicht, Quetsch-und-Streck-Animation und Sprechblasen-Hinweisen.
 * Version 0.4.0: Versionsnummer angeglichen, keine Funktionsänderung.
 * Version 0.3.1: Animation ignoriert die Einstellung "Bewegung reduzieren".
 * Version 0.3.0: Demo-Modus mit Beispieldaten, ohne echte Sensoren.
 * Version 0.2.0: visueller Editor, neue Optionen show_dates, show_badges und animate.
 */

const CARD_TAG = "lutarym-waste-collection-card";
const EDITOR_TAG = "lutarym-waste-collection-card-editor";
const CARD_VERSION = "0.10.0";

const DATE_PATTERN = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;

// Tage ab heute für die Beispieldaten im Demo-Modus, pro Tonne in dieser Reihenfolge.
const DEMO_OFFSETS = [0, 1, 5, 12];

const DEFAULT_BINS = [
  { name: "Restmüll", color: "#3b3b3b" },
  { name: "Papier", color: "#2f6fbf" },
  { name: "Gelbe Tonne", color: "#e8a317" },
  { name: "Biotonne", color: "#7a5230" },
];

const DEFAULT_CONFIG = {
  title: "Müllabfuhr",
  show_dates: true,
  show_badges: true,
  animate: true,
  demo: false,
  bins: [],
};

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

// Die Tonne als Figur. Alle Zustände (schlafen, wach, Party) stecken im SVG,
// die CSS-Klassen am Kachel-Element schalten die Teile ein oder aus.
function binSvg(color) {
  return `
    <svg class="char" viewBox="-6 -16 82 104" aria-hidden="true">
      <g class="hat">
        <polygon points="35,-14 47,12 23,12" fill="#ffd60a" stroke="#1b1b1b" stroke-width="2.5" stroke-linejoin="round"></polygon>
        <circle cx="35" cy="-14" r="4.5" fill="#ff5a7a" stroke="#1b1b1b" stroke-width="2"></circle>
        <line x1="29" y1="3" x2="41" y2="3" stroke="#1b1b1b" stroke-width="2"></line>
      </g>
      <rect class="lid" x="6" y="6" width="58" height="14" rx="7" fill="${color}" stroke="#1b1b1b" stroke-width="2.5"></rect>
      <path class="body" d="M11 18 L59 18 L55 76 Q54 84 46 84 L24 84 Q16 84 15 76 Z"
            fill="${color}" stroke="#1b1b1b" stroke-width="2.5" stroke-linejoin="round"></path>
      <ellipse cx="22" cy="34" rx="4.5" ry="9" fill="#ffffff" opacity="0.2" transform="rotate(12 22 34)"></ellipse>
      <circle cx="19" cy="54" r="4.5" fill="#ff7a8a" opacity="0.55"></circle>
      <circle cx="51" cy="54" r="4.5" fill="#ff7a8a" opacity="0.55"></circle>
      <g class="eyes-open">
        <ellipse cx="27" cy="44" rx="5.5" ry="6.5" fill="#ffffff" stroke="#1b1b1b" stroke-width="1.8"></ellipse>
        <ellipse cx="43" cy="44" rx="5.5" ry="6.5" fill="#ffffff" stroke="#1b1b1b" stroke-width="1.8"></ellipse>
        <circle cx="28" cy="46" r="2.8" fill="#1b1b1b"></circle>
        <circle cx="44" cy="46" r="2.8" fill="#1b1b1b"></circle>
      </g>
      <g class="eyes-closed" fill="none" stroke="#1b1b1b" stroke-width="2.6" stroke-linecap="round">
        <path d="M21 45 Q27 50 33 45"></path>
        <path d="M37 45 Q43 50 49 45"></path>
      </g>
      <path class="mouth-smile" d="M28 62 Q35 69 42 62" fill="none" stroke="#1b1b1b" stroke-width="2.6" stroke-linecap="round"></path>
      <path class="mouth-party" d="M27 60 Q35 76 43 60 Z" fill="#1b1b1b" stroke="#1b1b1b" stroke-width="2" stroke-linejoin="round"></path>
      <ellipse class="mouth-sleep" cx="35" cy="63" rx="2.8" ry="3.2" fill="#1b1b1b"></ellipse>
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
    // So laufen die Animationen nicht bei jedem Status-Update neu los.
    const states = this._config.bins
      .map((bin) => {
        const stateObj = hass.states[bin.entity];
        return stateObj ? stateObj.state : "missing";
      })
      .join("|");
    const signature = `${states}|${this._config.demo}|${new Date().toDateString()}`;
    if (signature === this._signature) return;
    this._signature = signature;
    this._render();
  }

  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      title: "Müllabfuhr",
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
    const dateFormat = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };

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

      const badgeText = status === "today" ? "Party heute!" : status === "tomorrow" ? "Morgen!" : "";

      return `
        <div class="tile ${animated}" style="--bin-color:${escapeHtml(color)}">
          <div class="stage">
            <div class="halo"></div>
            <span class="zz z1">Z</span>
            <span class="zz z2">z</span>
            <span class="zz z3">z</span>
            <span class="bang">!</span>
            <span class="confetti k1"></span>
            <span class="confetti k2"></span>
            <span class="confetti k3"></span>
            <span class="confetti k4"></span>
            <span class="confetti k5"></span>
            <span class="confetti k6"></span>
            ${binSvg(color)}
            <div class="floor"></div>
          </div>
          <div class="bin-name">${escapeHtml(name)}</div>
          ${cfg.show_dates ? `<div class="bin-date">${escapeHtml(date ? date.toLocaleDateString("de-DE", dateFormat) : "kein Termin")}</div>` : ""}
          ${cfg.show_badges && badgeText ? `<div class="badge ${animated}">${badgeText}</div>` : ""}
        </div>`;
    });

    const titleText = cfg.demo ? `${cfg.title || ""} (Demo)`.trim() : cfg.title;
    const title = titleText ? `<div class="title">${escapeHtml(titleText)}</div>` : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 16px; }
        .title {
          font-size: 1.1em;
          font-weight: 700;
          margin-bottom: 8px;
          color: var(--primary-text-color);
        }
        .tiles {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-around;
          gap: 10px;
        }
        .tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 124px;
          padding: 8px 4px 10px;
          border-radius: 22px;
        }
        .stage {
          position: relative;
          width: 96px;
          height: 112px;
          margin-top: 14px;
        }
        .stage svg.char {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }

        /* Leuchtender Kreis hinter der Tonne in ihrer Farbe */
        .halo {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 104px;
          height: 104px;
          margin: -52px 0 0 -52px;
          border-radius: 50%;
          background: var(--bin-color);
          opacity: 0.12;
          z-index: 0;
        }
        .floor {
          position: absolute;
          left: 50%;
          bottom: -2px;
          width: 58px;
          height: 9px;
          margin-left: -29px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.22);
          z-index: 1;
        }

        /* Teile, die nur in bestimmten Zuständen sichtbar sind */
        .eyes-closed,
        .mouth-sleep,
        .mouth-party,
        .hat,
        .zz,
        .bang,
        .confetti {
          display: none;
        }
        .none .eyes-open,
        .none .mouth-smile,
        .none .mouth-party,
        .tomorrow .eyes-closed,
        .tomorrow .mouth-sleep,
        .tomorrow .mouth-party,
        .today .eyes-closed,
        .today .mouth-smile,
        .today .mouth-sleep { display: none; }
        .none .eyes-closed,
        .none .mouth-sleep,
        .tomorrow .mouth-smile,
        .today .mouth-party { display: inline; }
        .tomorrow .eyes-open,
        .today .eyes-open { display: inline; }
        .today .hat { display: inline; }

        /* Schlafen: Zzz steigen auf */
        .none .zz {
          display: block;
          position: absolute;
          right: 6px;
          top: 6px;
          font-weight: 800;
          color: var(--primary-text-color);
          opacity: 0;
          z-index: 3;
          animation: zfloat 3.2s ease-in infinite;
        }
        .none .z1 { font-size: 15px; animation-delay: 0s; }
        .none .z2 { font-size: 12px; animation-delay: 1.07s; }
        .none .z3 { font-size: 9px; animation-delay: 2.14s; }

        /* Aufwachen: Ausrufezeichen poppt auf */
        .tomorrow .bang {
          display: block;
          position: absolute;
          right: 0;
          top: 2px;
          width: 24px;
          height: 24px;
          line-height: 20px;
          border-radius: 50%;
          border: 2.5px solid #1b1b1b;
          background: #ff5a7a;
          color: #ffffff;
          font-weight: 900;
          font-size: 16px;
          text-align: center;
          z-index: 3;
          animation: bangPop 2.6s ease-in-out infinite;
        }

        /* Party: Konfetti regnet */
        .today .confetti {
          display: block;
          position: absolute;
          top: 22px;
          left: 50%;
          width: 6px;
          height: 11px;
          border-radius: 2px;
          opacity: 0;
          z-index: 3;
          animation: confetti 1.8s ease-out infinite;
        }
        .today .k1 { background: #ff5a7a; margin-left: -34px; animation-delay: 0s; }
        .today .k2 { background: #ffd60a; margin-left: 26px; animation-delay: 0.3s; }
        .today .k3 { background: #2f6fbf; margin-left: -18px; animation-delay: 0.6s; }
        .today .k4 { background: #6bcb77; margin-left: 12px; animation-delay: 0.9s; }
        .today .k5 { background: #ff8c42; margin-left: -4px; animation-delay: 1.2s; }
        .today .k6 { background: #b084f5; margin-left: 32px; animation-delay: 1.5s; }

        /* Badge: comic-artige Sprechblase */
        .badge {
          margin-top: 8px;
          padding: 3px 10px;
          border: 2.5px solid #1b1b1b;
          border-radius: 14px 14px 14px 4px;
          font-family: "Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive;
          font-size: 0.82em;
          font-weight: 700;
          color: #1b1b1b;
          background: #fff3a3;
          box-shadow: 2px 2px 0 #1b1b1b;
          transform: rotate(-4deg);
        }
        .badge.today {
          background: #ff5a7a;
          color: #ffffff;
          animation: wiggle 0.7s ease-in-out infinite;
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

        /* Lid und Augen blinzeln */
        .eyes-open {
          transform-box: fill-box;
          transform-origin: center;
        }
        .none .body { animation: breathe 3.2s ease-in-out infinite; }
        .none .halo { opacity: 0.08; animation: none; }
        .none .lid { animation: lidSleep 3.2s ease-in-out infinite; }
        .none .eyes-closed { animation: none; }

        .tomorrow svg.char { animation: stretch 2.6s ease-in-out infinite; }
        .tomorrow .lid { animation: yawn 2.6s ease-in-out infinite; }
        .tomorrow .eyes-open { animation: blink 3.4s infinite; }
        .tomorrow .halo { opacity: 0.2; animation: haloPulse 2.6s ease-in-out infinite; }
        .tomorrow .floor { animation: floorTomorrow 2.6s ease-in-out infinite; }

        .today svg.char { animation: dance 1.8s ease-in-out infinite; }
        .today .body { animation: squash 0.9s ease-in-out infinite; }
        .today .lid { animation: lidParty 0.9s ease-in-out infinite; }
        .today .hat { animation: hatPop 2.4s ease-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
        .today .eyes-open { animation: blink 2.8s infinite; }
        .today .halo { opacity: 0.28; animation: haloPulse 1.8s ease-in-out infinite; }
        .today .floor { animation: floorParty 1.8s ease-in-out infinite; }

        /* Keyframes */
        .lid { transform-box: fill-box; transform-origin: 0% 100%; }
        .body { transform-box: fill-box; transform-origin: 50% 100%; }

        @keyframes breathe {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.03, 0.98); }
        }
        @keyframes lidSleep {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-3deg); }
        }
        @keyframes zfloat {
          0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translate(14px, -30px) scale(1.25); }
        }
        @keyframes bangPop {
          0%, 8% { transform: scale(0); }
          16% { transform: scale(1.25) rotate(-12deg); }
          24%, 60% { transform: scale(1) rotate(0deg); }
          72%, 100% { transform: scale(0); }
        }
        @keyframes stretch {
          0%, 50% { transform: translateY(0) scale(1, 1); }
          58% { transform: translateY(-6px) scale(0.94, 1.08); }
          66% { transform: translateY(0) scale(1.06, 0.94); }
          74% { transform: translateY(0) scale(0.98, 1.03) rotate(-3deg); }
          82% { transform: translateY(0) scale(1, 1) rotate(3deg); }
          90%, 100% { transform: translateY(0) scale(1, 1) rotate(0deg); }
        }
        @keyframes yawn {
          0%, 40% { transform: rotate(0deg); }
          50%, 62% { transform: rotate(-18deg); }
          75%, 100% { transform: rotate(0deg); }
        }
        @keyframes haloPulse {
          0%, 100% { transform: scale(0.92); }
          50% { transform: scale(1.08); }
        }
        @keyframes floorTomorrow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.85); }
        }
        @keyframes floorParty {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.6); }
        }
        @keyframes dance {
          0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
          12% { transform: translateX(-6px) translateY(-12px) rotate(-8deg); }
          25% { transform: translateX(0) translateY(0) rotate(0deg); }
          37% { transform: translateX(6px) translateY(-12px) rotate(8deg); }
          50% { transform: translateX(0) translateY(0) rotate(0deg); }
          62% { transform: translateX(-6px) translateY(-12px) rotate(-8deg); }
          75% { transform: translateX(0) translateY(0) rotate(0deg); }
          87% { transform: translateX(6px) translateY(-12px) rotate(8deg); }
        }
        @keyframes squash {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.06, 0.92); }
        }
        @keyframes lidParty {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-22deg); }
        }
        @keyframes hatPop {
          0% { transform: translateY(-40px) rotate(-40deg) scale(0); }
          14% { transform: translateY(0) rotate(8deg) scale(1.2); }
          22%, 78% { transform: translateY(0) rotate(0deg) scale(1); }
          90%, 100% { transform: translateY(-40px) rotate(40deg) scale(0); }
        }
        @keyframes confetti {
          0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
          12% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx, 0), 80px) rotate(540deg); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(0.1); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(3deg) scale(1.06); }
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
  description: "Schlafende Müll-Tonnen, die aufwachen und am Abholtag eine Party feiern.",
  preview: false,
});

console.info(
  `%c WASTE-COLLECTION-SCHEDULE-CARD-BY-LUTARYM %c v${CARD_VERSION} `,
  "color: white; background: #2e7d32; font-weight: 700;",
  "color: #2e7d32; background: white; font-weight: 700;"
);
