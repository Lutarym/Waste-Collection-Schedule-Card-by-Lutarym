/*
 * Waste Collection Schedule Card by Lutarym
 * Zeigt die Abholtermine der Müllbehälter aus der Integration "Waste Collection Schedule".
 * Comic-Stil mit Gesichtern: Am Abholtag hüpft die Tonne, der Deckel fliegt auf und Funken springen heraus.
 * Version 0.9.0: Comic-Stil zurück, ohne Müllwagen, mit mehr Animation (Deckel, Funken, Zwinkern).
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
const CARD_VERSION = "0.9.0";

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

// Comic-Tonne mit Gesicht. Der Deckel ist ein eigenes Element und dreht sich am linken Scharnier.
function binSvg(color) {
  return `
    <svg viewBox="0 0 64 80" aria-hidden="true">
      <circle cx="18" cy="77" r="4" fill="#222222"></circle>
      <circle cx="46" cy="77" r="4" fill="#222222"></circle>
      <rect class="lid" x="8" y="10" width="48" height="11" rx="4"
            fill="${color}" stroke="#111111" stroke-width="2.5"></rect>
      <path d="M14 22 L50 22 L46 70 Q45.5 75 40 75 L24 75 Q18.5 75 18 70 Z"
            fill="${color}" stroke="#111111" stroke-width="2.5" stroke-linejoin="round"></path>
      <g class="eyes">
        <ellipse cx="25" cy="40" rx="6" ry="7" fill="#ffffff" stroke="#111111" stroke-width="1.8"></ellipse>
        <ellipse cx="39" cy="40" rx="6" ry="7" fill="#ffffff" stroke="#111111" stroke-width="1.8"></ellipse>
        <circle cx="26" cy="42" r="3" fill="#111111"></circle>
        <circle cx="40" cy="42" r="3" fill="#111111"></circle>
      </g>
      <path d="M24 53 Q32 62 40 53" fill="none" stroke="#111111" stroke-width="2.6" stroke-linecap="round"></path>
    </svg>`;
}

// Kleiner Funke als Stern, wird am Abholtag um die Tonne herum eingeblendet.
function sparkSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="12,0 14.5,9.5 24,12 14.5,14.5 12,24 9.5,14.5 0,12 9.5,9.5"
               fill="#ffd60a" stroke="#111111" stroke-width="1.5" stroke-linejoin="round"></polygon>
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
    return 2;
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

      const badgeText = status === "today" ? "Heute!" : status === "tomorrow" ? "Morgen" : "";
      const sparks =
        animated === "today"
          ? `<span class="spark s1">${sparkSvg()}</span>
             <span class="spark s2">${sparkSvg()}</span>
             <span class="spark s3">${sparkSvg()}</span>`
          : "";

      return `
        <div class="tile ${animated}" style="--bin-color:${escapeHtml(color)}">
          <div class="bin-wrap">
            ${sparks}
            ${binSvg(color)}
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
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--primary-text-color);
        }
        .bins {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-around;
          gap: 14px;
          padding-top: 44px;
        }
        .tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 96px;
        }
        .bin-wrap {
          position: relative;
          width: 64px;
          height: 80px;
          transform-origin: 50% 100%;
        }
        .bin-wrap > svg {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }
        .lid {
          transform-box: fill-box;
          transform-origin: 0% 100%;
        }
        .eyes {
          transform-box: fill-box;
          transform-origin: center;
          animation: blink 3.4s infinite;
        }
        .bin-name {
          margin-top: 6px;
          font-weight: 600;
          color: var(--primary-text-color);
          text-align: center;
        }
        .bin-date {
          font-size: 0.85em;
          color: var(--secondary-text-color);
          text-align: center;
        }

        /* Sprechblasen-Hinweise */
        .badge {
          margin-top: 8px;
          padding: 3px 12px;
          border: 2.5px solid #111111;
          border-radius: 14px 14px 14px 4px;
          font-family: "Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive;
          font-size: 0.85em;
          font-weight: 700;
          color: #111111;
          background: #fff3a3;
          box-shadow: 2px 2px 0 #111111;
          transform: rotate(-4deg);
        }
        .badge.today {
          background: #ff6b6b;
          color: #ffffff;
          animation: wiggle 0.6s ease-in-out infinite;
        }

        /* Idle: die Tonne wiegt sich leicht */
        .none .bin-wrap {
          animation: sway 4s ease-in-out infinite;
        }

        /* Einen Tag vorher: gemütliches Hüpfen, Deckel wackelt */
        .tomorrow .bin-wrap {
          animation: boingSoft 2.4s ease-in-out infinite;
        }
        .tomorrow .lid {
          animation: lidWiggle 2.4s ease-in-out infinite;
        }

        /* Am Abholtag: große Hüpfer, Deckel fliegt auf, Funken springen */
        .today .bin-wrap {
          animation: boingBig 1.2s ease-in-out infinite;
        }
        .today .lid {
          animation: lidPop 1.2s ease-in-out infinite;
        }
        .spark {
          position: absolute;
          width: 16px;
          height: 16px;
          z-index: 2;
          opacity: 0;
          animation: spark 1.2s ease-out infinite;
        }
        .spark svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .spark.s1 { top: 0; left: -6px; animation-delay: 0s; }
        .spark.s2 { top: 4px; right: -8px; animation-delay: 0.35s; }
        .spark.s3 { top: 34px; right: -14px; animation-delay: 0.7s; }

        @keyframes sway {
          0%, 100% { transform: rotate(-2.5deg); }
          50% { transform: rotate(2.5deg); }
        }
        @keyframes boingSoft {
          0%, 15% { transform: translateY(0) scale(1.1, 0.9); }
          40% { transform: translateY(-14px) scale(0.94, 1.06); }
          60% { transform: translateY(0) scale(1.08, 0.92); }
          80%, 100% { transform: translateY(0) scale(1, 1); }
        }
        @keyframes boingBig {
          0%, 12% { transform: translateY(0) scale(1.18, 0.82) rotate(0deg); }
          35% { transform: translateY(-30px) scale(0.9, 1.12) rotate(-8deg); }
          50% { transform: translateY(-30px) scale(0.9, 1.12) rotate(8deg); }
          70% { transform: translateY(0) scale(1.2, 0.8) rotate(0deg); }
          82%, 100% { transform: translateY(0) scale(1, 1) rotate(0deg); }
        }
        @keyframes lidWiggle {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg); }
        }
        @keyframes lidPop {
          0%, 22% { transform: rotate(0deg); }
          34%, 62% { transform: rotate(-34deg); }
          74%, 100% { transform: rotate(0deg); }
        }
        @keyframes spark {
          0% { opacity: 0; transform: scale(0.2) rotate(0deg); }
          25% { opacity: 1; transform: scale(1.15) rotate(90deg); }
          60% { opacity: 0; transform: scale(0.4) rotate(180deg); }
          100% { opacity: 0; transform: scale(0.2) rotate(180deg); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(0.1); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(3deg) scale(1.05); }
        }
      </style>
      <ha-card>
        ${title}
        <div class="bins">${tiles.join("")}</div>
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
  description: "Müllabfuhr-Termine mit lustigen Comic-Tonnen, die am Abholtag hüpfen und Funken sprühen.",
  preview: false,
});

console.info(
  `%c WASTE-COLLECTION-SCHEDULE-CARD-BY-LUTARYM %c v${CARD_VERSION} `,
  "color: white; background: #2e7d32; font-weight: 700;",
  "color: #2e7d32; background: white; font-weight: 700;"
);
