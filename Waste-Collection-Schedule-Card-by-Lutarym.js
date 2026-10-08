/*
 * Waste Collection Schedule Card by Lutarym
 * Zeigt die Abholtermine der Müllbehälter aus der Integration "Waste Collection Schedule".
 * Eine Tonne hüpft einen Tag vorher, am Abholtag hüpft und leuchtet sie stärker.
 * Version 0.6.5: Versionsnummer angeglichen, keine Funktionsänderung.
 * Version 0.5.0: Comic-Stil mit Gesicht, Quetsch-und-Streck-Animation und Sprechblasen-Hinweisen.
 * Version 0.4.0: Versionsnummer angeglichen, keine Funktionsänderung.
 * Version 0.3.1: Animation ignoriert die Einstellung "Bewegung reduzieren".
 * Version 0.3.0: Demo-Modus mit Beispieldaten, ohne echte Sensoren.
 * Version 0.2.0: visueller Editor, neue Optionen show_dates, show_badges und animate.
 */

const CARD_TAG = "lutarym-waste-collection-card";
const EDITOR_TAG = "lutarym-waste-collection-card-editor";
const CARD_VERSION = "0.6.5";

const DATE_PATTERN = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;

// Tage ab heute für die Beispieldaten im Demo-Modus, pro Tonne in dieser Reihenfolge.
const DEMO_OFFSETS = [0, 1, 5, 12];

const DEFAULT_BINS = [
  { name: "Restmüll", color: "#222222" },
  { name: "Papier", color: "#1e6fd9" },
  { name: "Gelbe Tonne", color: "#ff8c1a" },
  { name: "Biotonne", color: "#8b5a2b" },
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

function binSvg(color) {
  return `
    <svg viewBox="0 0 64 84" aria-hidden="true">
      <circle cx="18" cy="79" r="4" fill="#555555"></circle>
      <circle cx="46" cy="79" r="4" fill="#555555"></circle>
      <path d="M14 20 L50 20 L46 74 Q45.5 78 41 78 L23 78 Q18.5 78 18 74 Z"
            fill="${color}" stroke="var(--primary-text-color)"
            stroke-opacity="0.5" stroke-width="1.5"></path>
      <rect x="9" y="8" width="46" height="12" rx="4" fill="${color}"
            stroke="var(--primary-text-color)" stroke-opacity="0.5" stroke-width="1.5"></rect>
      <g class="eyes">
        <ellipse cx="25" cy="40" rx="6" ry="7" fill="#ffffff" stroke="#111111" stroke-width="1.5"></ellipse>
        <ellipse cx="39" cy="40" rx="6" ry="7" fill="#ffffff" stroke="#111111" stroke-width="1.5"></ellipse>
        <circle cx="26" cy="42" r="3" fill="#111111"></circle>
        <circle cx="40" cy="42" r="3" fill="#111111"></circle>
      </g>
      <path d="M24 53 Q32 61 40 53" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round"></path>
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
        { entity: "sensor.waste_collection_schedule_restmulltonne", name: "Restmüll", color: "#222222" },
        { entity: "sensor.waste_collection_schedule_papiertonne", name: "Papier", color: "#1e6fd9" },
        { entity: "sensor.waste_collection_schedule_gelbe_tonne", name: "Gelbe Tonne", color: "#ff8c1a" },
        { entity: "sensor.waste_collection_schedule_biotonne", name: "Biotonne", color: "#8b5a2b" },
      ],
    };
  }

  _render() {
    if (!this._config) return;
    if (!this._config.demo && !this._hass) return;

    const cfg = this._config;
    const dateFormat = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };

    const bins = cfg.bins.map((bin, index) => {
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

      return {
        name,
        color,
        status: cfg.animate ? status : "none",
        dateText: date ? date.toLocaleDateString("de-DE", dateFormat) : "kein Termin",
        badgeText: status === "today" ? "Heute" : status === "tomorrow" ? "Morgen" : "",
      };
    });

    const binsHtml = bins
      .map(
        (bin) => `
        <div class="bin ${bin.status}">
          <div class="bin-wrap" style="--bin-color:${escapeHtml(bin.color)}">
            ${binSvg(bin.color)}
          </div>
          <div class="bin-name">${escapeHtml(bin.name)}</div>
          ${cfg.show_dates ? `<div class="bin-date">${escapeHtml(bin.dateText)}</div>` : ""}
          ${cfg.show_badges && bin.badgeText ? `<div class="badge ${bin.status}">${bin.badgeText}</div>` : ""}
        </div>`
      )
      .join("");

    const titleText = cfg.demo ? `${cfg.title || ""} (Demo)`.trim() : cfg.title;
    const title = titleText ? `<div class="title">${escapeHtml(titleText)}</div>` : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 16px; }
        .title {
          font-size: 1.1em;
          font-weight: 500;
          margin-bottom: 12px;
          color: var(--primary-text-color);
        }
        .bins {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-around;
          gap: 12px;
        }
        .bin {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 90px;
        }
        .bin-wrap {
          width: 64px;
          height: 84px;
          transform-origin: 50% 100%;
        }
        .bin-wrap svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .bin-name {
          margin-top: 6px;
          font-weight: 500;
          color: var(--primary-text-color);
          text-align: center;
        }
        .bin-date {
          font-size: 0.85em;
          color: var(--secondary-text-color);
          text-align: center;
        }
        .badge {
          margin-top: 8px;
          padding: 3px 12px;
          border: 2px solid #111111;
          border-radius: 14px 14px 14px 4px;
          font-family: "Comic Sans MS", "Chalkboard SE", cursive;
          font-size: 0.85em;
          font-weight: 700;
          color: #111111;
          background: #ffe14d;
          box-shadow: 2px 2px 0 #111111;
          transform: rotate(-4deg);
        }
        .badge.today {
          background: #ff5a5a;
          color: #ffffff;
        }
        .tomorrow .bin-wrap {
          animation: boing 1.6s ease-in-out infinite;
        }
        .today .bin-wrap {
          animation: boingBig 0.8s ease-in-out infinite, glow 1.2s ease-in-out infinite;
        }
        .bin-wrap .eyes {
          transform-box: fill-box;
          transform-origin: center;
          animation: blink 3.2s infinite;
        }
        @keyframes boing {
          0%, 12% { transform: translateY(0) scale(1.12, 0.88) rotate(0deg); }
          45% { transform: translateY(-24px) scale(0.92, 1.08) rotate(-10deg); }
          60% { transform: translateY(-24px) scale(0.92, 1.08) rotate(10deg); }
          80% { transform: translateY(0) scale(1.14, 0.86) rotate(0deg); }
          90% { transform: translateY(0) scale(0.98, 1.02) rotate(0deg); }
          100% { transform: translateY(0) scale(1, 1) rotate(0deg); }
        }
        @keyframes boingBig {
          0%, 12% { transform: translateY(0) scale(1.15, 0.85) rotate(0deg); }
          40% { transform: translateY(-36px) scale(0.9, 1.1) rotate(-14deg); }
          60% { transform: translateY(-36px) scale(0.9, 1.1) rotate(14deg); }
          80% { transform: translateY(0) scale(1.18, 0.82) rotate(0deg); }
          100% { transform: translateY(0) scale(1, 1) rotate(0deg); }
        }
        @keyframes blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 2px var(--bin-color)); }
          50% { filter: drop-shadow(0 0 12px var(--bin-color)); }
        }
      </style>
      <ha-card>
        ${title}
        <div class="bins">${binsHtml}</div>
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
      color: "Farbe (Hex, z. B. #1e6fd9)",
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
  description: "Müllabfuhr-Termine mit hüpfenden, leuchtenden Tonnen.",
  preview: false,
});

console.info(
  `%c WASTE-COLLECTION-SCHEDULE-CARD-BY-LUTARYM %c v${CARD_VERSION} `,
  "color: white; background: #2e7d32; font-weight: 700;",
  "color: #2e7d32; background: white; font-weight: 700;"
);
