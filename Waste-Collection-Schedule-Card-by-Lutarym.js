/*
 * Waste Collection Schedule Card by Lutarym
 * Zeigt die Abholtermine der Müllbehälter aus der Integration "Waste Collection Schedule".
 *
 * Konzept "Abreißkalender": Jede Tonne ist ein Kalenderblatt, ohne Tonnen-Zeichnung.
 * - Ohne Termin hängt das Blatt ruhig am Ring und wiegt sich leicht.
 * - Einen Tag vorher wackelt das Blatt, die Ecke rollt sich auf und ein Stempel "Morgen" knallt drauf.
 * - Am Abholtag reißt das Blatt ab, fliegt weg und ein comicartiges "RRIP!" erscheint.
 *
 * Version 1.0.0: Erste große Version mit neuem Konzept (Abreißkalender), Versionssprung auf 1.0.0.
 * Version 0.12.0: Komplett neues Konzept (Abreißkalender statt Tonnenfiguren).
 * Version 0.11.0: Versionsnummer erhöht, keine Funktionsänderung.
 * Version 0.10.0: Schlafende Tonnen mit Party-Zustand (ersetzt durch 0.12.0).
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
const CARD_VERSION = "1.0.0";

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
      const badgeText = status === "today" ? "Heute!" : status === "tomorrow" ? "Morgen" : "";

      return `
        <div class="tile ${animated}" style="--c:${escapeHtml(color)}">
          <div class="block">
            <div class="page">
              <div class="rings"><i></i><i></i></div>
              <div class="strip">${escapeHtml(month)}</div>
              <div class="wk">${escapeHtml(weekday)}</div>
              <div class="day">${escapeHtml(day)}</div>
              <div class="corner"></div>
            </div>
            <div class="rip">RRIP!</div>
            ${cfg.show_badges && badgeText ? `<div class="stamp">${badgeText}</div>` : ""}
          </div>
          <div class="bin-name">${escapeHtml(name)}</div>
          ${cfg.show_dates ? `<div class="bin-date">${escapeHtml(date ? date.toLocaleDateString("de-DE", fullDate) : "kein Termin")}</div>` : ""}
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
          width: 120px;
        }
        .block {
          position: relative;
          width: 104px;
          height: 124px;
          margin-top: 6px;
        }

        /* Bindung oben mit zwei Ringen */
        .rings {
          position: absolute;
          top: -6px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          padding: 0 20px;
          z-index: 3;
        }
        .rings i {
          display: block;
          width: 10px;
          height: 16px;
          border: 2.5px solid #1b1b1b;
          border-radius: 6px;
          background: #d8d8d8;
        }

        /* Das Kalenderblatt */
        .page {
          position: absolute;
          left: 4px;
          top: 8px;
          width: 96px;
          height: 112px;
          background: #fffdf6;
          border: 2.5px solid #1b1b1b;
          border-radius: 10px;
          box-shadow: 4px 4px 0 #1b1b1b;
          text-align: center;
          transform-origin: 50% 0;
          z-index: 2;
        }
        .strip {
          height: 28px;
          line-height: 28px;
          margin: -2.5px -2.5px 0;
          background: var(--c);
          border-bottom: 2.5px solid #1b1b1b;
          border-radius: 7px 7px 0 0;
          color: #ffffff;
          font-family: "Comic Sans MS", "Comic Neue", cursive;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          text-shadow: 1px 1px 0 #1b1b1b;
        }
        .wk {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #555555;
          text-transform: uppercase;
        }
        .day {
          margin-top: 0;
          font-family: "Arial Black", Impact, sans-serif;
          font-size: 46px;
          font-weight: 900;
          line-height: 1.05;
          color: #1b1b1b;
        }

        /* Eingerollte Ecke unten rechts */
        .corner {
          position: absolute;
          right: -2.5px;
          bottom: -2.5px;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #fffdf6 50%, #e6dcc0 50%);
          border-left: 2.5px solid #1b1b1b;
          border-top: 2.5px solid #1b1b1b;
          border-top-left-radius: 8px;
          transform-origin: 100% 100%;
        }

        /* Comic-Ausruf beim Abreißen */
        .rip {
          display: none;
          position: absolute;
          right: -12px;
          top: 10px;
          font-family: "Comic Sans MS", "Comic Neue", cursive;
          font-size: 17px;
          font-weight: 900;
          color: #ff5a5a;
          text-shadow: 2px 2px 0 #1b1b1b;
          opacity: 0;
          z-index: 4;
        }

        /* Stempel */
        .stamp {
          display: none;
          position: absolute;
          left: -8px;
          bottom: -6px;
          padding: 3px 10px;
          border: 2.5px solid #1b1b1b;
          border-radius: 6px;
          font-family: "Comic Sans MS", "Comic Neue", cursive;
          font-size: 12px;
          font-weight: 900;
          color: #1b1b1b;
          background: #ffe066;
          box-shadow: 2px 2px 0 #1b1b1b;
          transform: rotate(-4deg);
          z-index: 5;
        }

        .bin-name {
          margin-top: 6px;
          font-weight: 700;
          color: var(--primary-text-color);
          text-align: center;
        }
        .bin-date {
          font-size: 0.82em;
          color: var(--secondary-text-color);
          text-align: center;
        }

        /* Zustand: ruhig am Ring hängend */
        .none .page {
          animation: sway 5s ease-in-out infinite;
        }

        /* Zustand: einen Tag vorher, das Blatt wackelt, die Ecke rollt sich auf */
        .tomorrow .page {
          animation: wobble 2.2s ease-in-out infinite;
        }
        .tomorrow .corner {
          animation: curl 2.2s ease-in-out infinite;
        }
        .tomorrow .stamp {
          display: block;
          animation: thump 2.2s ease-out infinite;
          background: #ffe066;
        }

        /* Zustand: Abholtag, das Blatt reißt ab und ein neues kommt nach */
        .today .page {
          animation: tear 2.4s ease-in infinite;
        }
        .today .corner {
          animation: curl 0.6s ease-in-out infinite;
        }
        .today .rip {
          display: block;
          animation: rip 2.4s ease-out infinite;
        }
        .today .stamp {
          display: block;
          color: #ffffff;
          background: #ff5a5a;
          animation: thump 1.2s ease-out infinite;
        }

        @keyframes sway {
          0%, 100% { transform: rotate(-1.2deg); }
          50% { transform: rotate(1.2deg); }
        }
        @keyframes wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-2.5deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(2.5deg); }
        }
        @keyframes curl {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.5); }
        }
        @keyframes thump {
          0% { opacity: 0; transform: scale(1.6) rotate(-4deg); }
          12% { opacity: 1; transform: scale(0.92) rotate(-4deg); }
          20% { transform: scale(1.04) rotate(-4deg); }
          28%, 100% { opacity: 1; transform: scale(1) rotate(-4deg); }
        }
        @keyframes tear {
          0%, 40% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          45% { transform: translate(-3px, 0) rotate(-2deg); opacity: 1; }
          50% { transform: translate(3px, 0) rotate(2deg); opacity: 1; }
          55% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          62% { transform: translate(70px, -150px) rotate(35deg); opacity: 0; }
          63% { transform: translate(0, 30px) rotate(0deg); opacity: 0; }
          80%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
        }
        @keyframes rip {
          0%, 56% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          62% { opacity: 1; transform: scale(1.25) rotate(-12deg); }
          72% { opacity: 1; transform: scale(1) rotate(-6deg); }
          85%, 100% { opacity: 0; transform: scale(1) rotate(-6deg); }
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
  description: "Müllabfuhr-Termine als Abreißkalender, der am Abholtag abreißt.",
  preview: false,
});

console.info(
  `%c WASTE-COLLECTION-SCHEDULE-CARD-BY-LUTARYM %c v${CARD_VERSION} `,
  "color: white; background: #2e7d32; font-weight: 700;",
  "color: #2e7d32; background: white; font-weight: 700;"
);
