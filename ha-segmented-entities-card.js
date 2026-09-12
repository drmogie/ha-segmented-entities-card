/*
 * HA Segmented Entities Card
 * A Home Assistant Lovelace card that lets you build a card out of
 * configurable "segments". Each segment can be aligned independently
 * (top/bottom via column direction, left/right via row direction, plus
 * justify/align control) and can hold any mix of free text items and
 * entity items. Entities use domain-default icons and colors (matching
 * HA's active/inactive icon coloring) unless overridden, and each entity
 * can independently show/hide its icon, name, and state.
 *
 * Install: copy this file to <config>/www/ha-segmented-entities-card.js,
 * add it as a Lovelace resource (Settings > Dashboards > Resources):
 *   URL: /local/ha-segmented-entities-card.js   Type: JavaScript Module
 * Then add a card with type: custom:ha-segmented-entities-card
 * (the visual editor is available from the card picker).
 */
(() => {
  // Bail out cleanly if this file somehow loads twice (e.g. resource
  // added more than once) — re-defining a custom element throws and can
  // take the whole module down with it.
  if (customElements.get("ha-segmented-entities-card")) return;

  // Grab LitElement off an already-registered HA element rather than
  // bundling our own copy. IMPORTANT: at the moment this script first
  // runs, none of these elements are guaranteed to be registered yet
  // (it depends on when the browser loads this resource relative to
  // Lovelace's own bootstrapping). Previously this was a one-shot
  // `Object.getPrototypeOf(customElements.get(...))` — if every
  // candidate was still undefined at that instant, that line threw
  // immediately and killed the entire module before either custom
  // element got defined, which is what was crashing the card / dashboard.
  // Instead, try repeatedly until one of the candidates is ready.
  function getLitElementBase() {
    const candidates = [
      "hui-view",
      "hui-masonry-view",
      "ha-panel-lovelace",
      "home-assistant-main",
      "home-assistant",
    ];
    for (const tag of candidates) {
      try {
        const el = customElements.get(tag);
        if (el) {
          const base = Object.getPrototypeOf(el);
          if (base && base.prototype && base.prototype.html && base.prototype.css) {
            return base;
          }
        }
      } catch (err) {
        /* keep trying the next candidate */
      }
    }
    return null;
  }

  function defineCard(retries) {
    const LitElement = getLitElementBase();
    if (!LitElement) {
      if (retries > 0) {
        setTimeout(() => defineCard(retries - 1), 300);
      } else {
        console.error(
          "ha-segmented-entities-card: could not find a LitElement base class " +
            "to extend — the Home Assistant frontend may not have finished " +
            "loading. Try reloading the page."
        );
      }
      return;
    }

    const html = LitElement.prototype.html;
    const css = LitElement.prototype.css;

    const CARD_VERSION = "2026.09.12.2";

  // ---------------------------------------------------------------------
  // Domain default icon / color helpers
  // ---------------------------------------------------------------------
  const computeDomain = (entityId) => entityId.split(".")[0];

  const DOMAIN_ICONS = {
    light: "mdi:lightbulb",
    switch: "mdi:toggle-switch-variant",
    fan: "mdi:fan",
    cover: "mdi:window-shutter",
    lock: "mdi:lock",
    climate: "mdi:thermostat",
    media_player: "mdi:cast",
    sensor: "mdi:eye",
    binary_sensor: "mdi:checkbox-blank-circle-outline",
    person: "mdi:account",
    device_tracker: "mdi:account",
    automation: "mdi:robot",
    script: "mdi:script-text",
    scene: "mdi:palette",
    input_boolean: "mdi:toggle-switch-variant",
    input_number: "mdi:ray-vertex",
    input_select: "mdi:format-list-bulleted",
    input_text: "mdi:form-textbox",
    input_datetime: "mdi:calendar-clock",
    timer: "mdi:timer-outline",
    alarm_control_panel: "mdi:shield-home",
    camera: "mdi:video",
    vacuum: "mdi:robot-vacuum",
    water_heater: "mdi:water-boiler",
    humidifier: "mdi:air-humidifier",
    sun: "mdi:white-balance-sunny",
    weather: "mdi:weather-partly-cloudy",
    plant: "mdi:flower",
    update: "mdi:package-up",
    button: "mdi:gesture-tap-button",
    number: "mdi:ray-vertex",
    select: "mdi:format-list-bulleted",
    siren: "mdi:bullhorn",
    valve: "mdi:pipe-valve",
    counter: "mdi:counter",
    group: "mdi:google-circles-communities",
    zone: "mdi:map-marker-radius",
    air_quality: "mdi:air-filter",
    event: "mdi:calendar-clock",
    date: "mdi:calendar",
    datetime: "mdi:calendar-clock",
    text: "mdi:form-textbox",
    schedule: "mdi:calendar-clock",
    todo: "mdi:clipboard-list",
    calendar: "mdi:calendar",
  };

  // Icons that differ between the "on"/active and "off"/inactive state.
  const ICON_STATE_OVERRIDES = {
    cover: { on: "mdi:window-shutter-open", off: "mdi:window-shutter" },
    lock: { on: "mdi:lock-open-variant", off: "mdi:lock" },
    binary_sensor: {
      on: "mdi:checkbox-marked-circle",
      off: "mdi:checkbox-blank-circle-outline",
    },
    valve: { on: "mdi:pipe-valve", off: "mdi:pipe-valve" },
  };

  // device_class-aware icons — matches how HA itself picks default icons
  // for sensor / binary_sensor entities, which is far more specific than
  // a plain domain lookup (e.g. a temperature sensor gets a thermometer,
  // not a generic "sensor" icon).
  const SENSOR_DEVICE_CLASS_ICONS = {
    temperature: "mdi:thermometer",
    humidity: "mdi:water-percent",
    battery: "mdi:battery",
    power: "mdi:flash",
    energy: "mdi:lightning-bolt",
    voltage: "mdi:sine-wave",
    current: "mdi:current-ac",
    pressure: "mdi:gauge",
    illuminance: "mdi:brightness-5",
    carbon_dioxide: "mdi:molecule-co2",
    carbon_monoxide: "mdi:molecule-co",
    gas: "mdi:meter-gas",
    signal_strength: "mdi:wifi",
    timestamp: "mdi:clock-outline",
    date: "mdi:calendar",
    duration: "mdi:timer-outline",
    frequency: "mdi:sine-wave",
    distance: "mdi:ruler",
    volume: "mdi:cup-water",
    weight: "mdi:weight",
    speed: "mdi:speedometer",
    wind_speed: "mdi:weather-windy",
    precipitation: "mdi:weather-rainy",
    uv_index: "mdi:weather-sunny-alert",
    aqi: "mdi:air-filter",
    pm25: "mdi:air-filter",
    pm10: "mdi:air-filter",
    moisture: "mdi:water-percent",
    nitrogen_dioxide: "mdi:molecule",
    ozone: "mdi:molecule",
    sulphur_dioxide: "mdi:molecule",
    volatile_organic_compounds: "mdi:molecule",
    monetary: "mdi:cash",
    data_size: "mdi:database",
    data_rate: "mdi:transmission-tower",
  };

  const BINARY_SENSOR_DEVICE_CLASS_ICONS = {
    motion: { off: "mdi:motion-sensor-off", on: "mdi:motion-sensor" },
    door: { off: "mdi:door-closed", on: "mdi:door-open" },
    window: { off: "mdi:window-closed", on: "mdi:window-open" },
    garage_door: { off: "mdi:garage", on: "mdi:garage-open" },
    opening: { off: "mdi:square", on: "mdi:square-outline" },
    moisture: { off: "mdi:water-off", on: "mdi:water" },
    smoke: { off: "mdi:smoke-detector-outline", on: "mdi:smoke-detector" },
    gas: { off: "mdi:checkbox-blank-circle-outline", on: "mdi:gas-cylinder" },
    battery: { off: "mdi:battery", on: "mdi:battery-alert" },
    connectivity: { off: "mdi:lan-disconnect", on: "mdi:lan-connect" },
    occupancy: { off: "mdi:home-outline", on: "mdi:home" },
    presence: { off: "mdi:home-outline", on: "mdi:home" },
    problem: { off: "mdi:check-circle", on: "mdi:alert-circle" },
    safety: { off: "mdi:shield-check", on: "mdi:shield-alert" },
    sound: { off: "mdi:volume-off", on: "mdi:volume-high" },
    vibration: { off: "mdi:crop-portrait", on: "mdi:vibrate" },
    plug: { off: "mdi:power-plug-off", on: "mdi:power-plug" },
    cold: { off: "mdi:thermometer", on: "mdi:snowflake" },
    heat: { off: "mdi:thermometer", on: "mdi:fire" },
    tamper: { off: "mdi:shield-check", on: "mdi:shield-alert" },
    light: { off: "mdi:brightness-5", on: "mdi:brightness-7" },
  };

  function isActive(stateObj) {
    const domain = computeDomain(stateObj.entity_id);
    const state = stateObj.state;
    switch (domain) {
      case "cover":
        return state === "open" || state === "opening";
      case "lock":
        return state === "unlocked";
      case "climate":
        return state !== "off";
      case "media_player":
        return !["off", "idle", "standby"].includes(state);
      case "alarm_control_panel":
        return state.startsWith("armed");
      case "person":
      case "device_tracker":
        return state === "home";
      case "vacuum":
        return state === "cleaning";
      default:
        return state === "on";
    }
  }

  function getDefaultIcon(stateObj) {
    if (stateObj.attributes && stateObj.attributes.icon) {
      return stateObj.attributes.icon;
    }
    const domain = computeDomain(stateObj.entity_id);
    const deviceClass = stateObj.attributes && stateObj.attributes.device_class;
    const active = isActive(stateObj);

    if (domain === "sensor" && deviceClass && SENSOR_DEVICE_CLASS_ICONS[deviceClass]) {
      return SENSOR_DEVICE_CLASS_ICONS[deviceClass];
    }
    if (
      domain === "binary_sensor" &&
      deviceClass &&
      BINARY_SENSOR_DEVICE_CLASS_ICONS[deviceClass]
    ) {
      const pair = BINARY_SENSOR_DEVICE_CLASS_ICONS[deviceClass];
      return active ? pair.on : pair.off;
    }
    if (ICON_STATE_OVERRIDES[domain]) {
      return active
        ? ICON_STATE_OVERRIDES[domain].on
        : ICON_STATE_OVERRIDES[domain].off;
    }
    return DOMAIN_ICONS[domain] || "mdi:radiobox-blank";
  }

  function getDefaultColor(stateObj) {
    const state = stateObj.state;
    if (state === "unavailable" || state === "unknown") {
      return "var(--disabled-text-color, #bdbdbd)";
    }
    return isActive(stateObj)
      ? "var(--paper-item-icon-active-color, #fdd835)"
      : "var(--paper-item-icon-color, #44739e)";
  }

  // Converts HA's hs_color (hue 0-360, saturation 0-100) to an rgb() CSS
  // string at full value/brightness, matching how HA's own frontend
  // colors a light's icon — vivid hue regardless of the light's actual
  // dimmed brightness attribute, since that's what reads clearly as an
  // icon glyph color.
  function hsToRgbString(hue, sat) {
    const s = Math.max(0, Math.min(100, sat)) / 100;
    const h = ((hue % 360) + 360) % 360;
    const c = s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = 1 - c;
    const R = Math.round((r + m) * 255);
    const G = Math.round((g + m) * 255);
    const B = Math.round((b + m) * 255);
    return `rgb(${R}, ${G}, ${B})`;
  }

  // Reads a light entity's own current color from its state attributes,
  // if it has one. Returns null when the light is off/unavailable or
  // simply has no color info (e.g. a plain on/off or color-temp-only
  // light with no color set) so the caller can fall back to the normal
  // domain default color.
  function getLightEntityColor(stateObj) {
    if (!isActive(stateObj)) return null;
    const attrs = stateObj.attributes || {};
    if (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length === 3) {
      const [r, g, b] = attrs.rgb_color;
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (Array.isArray(attrs.rgbw_color) && attrs.rgbw_color.length >= 3) {
      const [r, g, b] = attrs.rgbw_color;
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (Array.isArray(attrs.rgbww_color) && attrs.rgbww_color.length >= 3) {
      const [r, g, b] = attrs.rgbww_color;
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (Array.isArray(attrs.hs_color) && attrs.hs_color.length === 2) {
      return hsToRgbString(attrs.hs_color[0], attrs.hs_color[1]);
    }
    return null;
  }

  // Icon color resolution used by the card: a `light` entity shows its
  // own actual color when it has one, otherwise every domain (including
  // `light`) falls back to the standard active/inactive domain coloring.
  function getIconColor(stateObj) {
    const domain = computeDomain(stateObj.entity_id);
    if (domain === "light") {
      const own = getLightEntityColor(stateObj);
      if (own) return own;
    }
    return getDefaultColor(stateObj);
  }

  function formatState(hass, stateObj) {
    try {
      if (hass.formatEntityState) return hass.formatEntityState(stateObj);
    } catch (e) {
      /* fall through */
    }
    return stateObj.state;
  }

  // Nudges an element by (x, y) px from its normal flex position without
  // pulling it out of flow — siblings keep their spacing, only this
  // element's paint position shifts. Used to let the icon/name/state
  // inside an entity item each be repositioned independently.
  function offsetStyle(x, y) {
    if (!x && !y) return "";
    return `position:relative;left:${x || 0}px;top:${y || 0}px;`;
  }

  // Combines icon_zoom and icon_flip into a single `transform`
  // declaration — a style attribute can only hold one `transform`
  // property, so these can't each build their own independently the way
  // offsetStyle's position:relative can.
  function iconTransformStyle(item) {
    const parts = [];
    if (item.icon_zoom && item.icon_zoom !== 1) {
      parts.push(`scale(${item.icon_zoom})`);
    }
    if (item.icon_flip === "horizontal" || item.icon_flip === "both") {
      parts.push("scaleX(-1)");
    }
    if (item.icon_flip === "vertical" || item.icon_flip === "both") {
      parts.push("scaleY(-1)");
    }
    return parts.length ? `transform:${parts.join(" ")};` : "";
  }

  // Sizing/positioning style shared by entity and text items.
  // `fill_segment` takes the item out of flex flow and stretches it to
  // exactly match its segment's own content box (position:absolute +
  // inset:0, the same trick the segment editor's "Fill card" button uses
  // one level up). `position: "absolute"` also takes it out of flow, but
  // instead places it freely with its own top/bottom/left/right offsets
  // — the exact same mechanism segments themselves use to place
  // themselves within the card. Either way it's still capped from ever
  // exceeding the segment: overflow:hidden + max-width/max-height:100%
  // on `.entity-item` / `.text-item` clip anything positioned past the
  // segment's own edges.
  function fillOrSizeStyle(item) {
    if (item.fill_segment) {
      return "position:absolute;inset:0;width:100%;height:100%;margin:0;";
    }
    if (item.position === "absolute") {
      const parts = ["position:absolute;margin:0;"];
      if (item.top != null) parts.push(`top:${item.top}px;`);
      if (item.bottom != null) parts.push(`bottom:${item.bottom}px;`);
      if (item.left != null) parts.push(`left:${item.left}px;`);
      if (item.right != null) parts.push(`right:${item.right}px;`);
      if (item.width != null) parts.push(`width:${item.width}px;`);
      if (item.height != null) parts.push(`height:${item.height}px;`);
      return parts.join("");
    }
    return `${item.width != null ? `width:${item.width}px;` : ""}${
      item.height != null ? `height:${item.height}px;` : ""
    }`;
  }

  // Minimal action handler covering the common cases: navigate to a
  // dashboard view, open a URL, or open an entity's more-info dialog.
  // "none" / missing config does nothing.
  function handleAction(node, tapAction) {
    if (!tapAction || !tapAction.action || tapAction.action === "none") {
      return;
    }
    switch (tapAction.action) {
      case "navigate": {
        if (!tapAction.navigation_path) return;
        history.pushState(null, "", tapAction.navigation_path);
        const navEvent = new Event("location-changed", {
          bubbles: true,
          composed: true,
        });
        navEvent.detail = { replace: false };
        window.dispatchEvent(navEvent);
        break;
      }
      case "url": {
        if (!tapAction.url_path) return;
        window.open(tapAction.url_path, "_blank");
        break;
      }
      case "more-info": {
        if (!tapAction.entity) return;
        const infoEvent = new Event("hass-more-info", {
          bubbles: true,
          composed: true,
        });
        infoEvent.detail = { entityId: tapAction.entity };
        node.dispatchEvent(infoEvent);
        break;
      }
      case "toggle": {
        if (!tapAction.entity || !node.hass) return;
        // homeassistant.toggle is the same generic service HA's own
        // built-in cards use for a "toggle" tap action — it knows how to
        // flip state for lights, switches, fans, covers, locks, and most
        // other toggleable domains without needing per-domain branching
        // here.
        node.hass.callService("homeassistant", "toggle", {
          entity_id: tapAction.entity,
        });
        break;
      }
      default:
        break;
    }
  }

  // ---------------------------------------------------------------------
  // Card
  // ---------------------------------------------------------------------
  class HaSegmentedEntitiesCard extends LitElement {
    static get properties() {
      return { hass: {}, _config: {}, _templateResults: { state: true } };
    }

    constructor() {
      super();
      // Rendered output of any text item whose markdown contains Jinja
      // ({{ ... }} / {% ... %}) — keyed by "segmentIndex-itemIndex".
      // Kept as a Lit reactive property so a live-updating template
      // result triggers a re-render.
      this._templateResults = {};
      // In-flight/active subscriptions for those same keys, so we can
      // unsubscribe a template that's edited or removed instead of
      // leaking a websocket subscription per stale key.
      this._templateUnsubs = {};
      this._lastTemplateStrings = {};
    }

    static getConfigElement() {
      return document.createElement("ha-segmented-entities-card-editor");
    }

    static getStubConfig() {
      return {
        title: "New Card",
        segments: [
          {
            direction: "row",
            justify: "flex-start",
            align: "center",
            wrap: true,
            items: [{ type: "text", text: "Segment 1", style: "header" }],
          },
        ],
      };
    }

    setConfig(config) {
      if (!config || !Array.isArray(config.segments)) {
        throw new Error(
          "ha-segmented-entities-card: a 'segments' array is required"
        );
      }
      this._config = config;
    }

    // Every text item whose markdown contains Jinja syntax, keyed by
    // "segmentIndex-itemIndex" -> the raw template string. Used both to
    // decide what to subscribe and, at render time, to know which items
    // should show their live-rendered result instead of the raw text.
    _collectTemplateStrings() {
      const map = {};
      (this._config.segments || []).forEach((seg, si) => {
        (seg.items || []).forEach((item, ii) => {
          if (
            item.type === "text" &&
            item.text &&
            /\{\{|\{%/.test(item.text)
          ) {
            map[`${si}-${ii}`] = item.text;
          }
        });
      });
      return map;
    }

    // Keeps the set of active render_template subscriptions in sync with
    // the current config: subscribes any new/changed template text,
    // unsubscribes anything removed or edited. Cheap to call repeatedly
    // (e.g. on every hass update) since it's a no-op once subscriptions
    // already match the config.
    _syncTemplateSubscriptions() {
      if (!this.hass || !this._config) return;
      const wanted = this._collectTemplateStrings();
      const wantedJson = JSON.stringify(wanted);
      if (wantedJson === JSON.stringify(this._lastTemplateStrings)) return;
      this._lastTemplateStrings = wanted;

      // Drop subscriptions for keys that no longer want a template (item
      // removed, or its text no longer contains Jinja).
      Object.keys(this._templateUnsubs).forEach((key) => {
        if (wanted[key] === undefined) {
          this._templateUnsubs[key]
            .then((unsub) => unsub())
            .catch(() => {});
          delete this._templateUnsubs[key];
          const results = { ...this._templateResults };
          delete results[key];
          this._templateResults = results;
        }
      });

      // Subscribe anything new. If a key's template text changed, drop
      // the stale subscription first so it's replaced rather than
      // stacked.
      Object.entries(wanted).forEach(([key, template]) => {
        if (this._templateUnsubs[key]) {
          this._templateUnsubs[key]
            .then((unsub) => unsub())
            .catch(() => {});
        }
        this._templateUnsubs[key] = this.hass.connection
          .subscribeMessage(
            (msg) => {
              this._templateResults = {
                ...this._templateResults,
                [key]: msg.result,
              };
            },
            { type: "render_template", template }
          )
          .catch((err) => {
            console.error(
              "ha-segmented-entities-card: template render failed",
              err
            );
            delete this._templateUnsubs[key];
          });
      });
    }

    updated(changedProps) {
      super.updated(changedProps);
      if (changedProps.has("_config") || changedProps.has("hass")) {
        this._syncTemplateSubscriptions();
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      Object.values(this._templateUnsubs).forEach((p) =>
        p.then((unsub) => unsub()).catch(() => {})
      );
      this._templateUnsubs = {};
      this._clearItemPressTimer();
    }

    getCardSize() {
      if (!this._config) return 1;
      return (this._config.segments || []).length + 1;
    }

    // Used by Home Assistant's grid-based "Sections" dashboard view (the
    // default Overview layout). Each section is a 12-column grid; a cell
    // is ~30px wide, 56px tall, with an 8px gap between cells — see
    // https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/#sizing-in-sections-view
    //
    // `grid_options` in the card config lets someone pin an exact size in
    // YAML, but normally this is unnecessary: once getGridOptions is
    // implemented, Home Assistant's own card editor gets a "Layout" tab
    // with drag handles that resize the card and write straight into
    // `grid_options` on the card config for you — that's the standard
    // way this card's width/height should be set. min_rows/min_columns
    // here just keep those handles from being dragged down to something
    // the card can't reasonably render in.
    getGridOptions() {
      if (!this._config) return { columns: 12, min_columns: 3, min_rows: 1 };
      const g = this._config.grid_options || {};

      const options = {
        columns: g.columns != null ? g.columns : 12,
        min_columns: g.min_columns != null ? g.min_columns : 3,
      };
      if (g.max_columns != null) options.max_columns = g.max_columns;

      // Per the docs: leaving `rows` undefined tells the sections grid to
      // size the card to its actual content height instead of locking it
      // to a fixed multiple of the 56px row cell — the right default
      // here since height depends entirely on how many segments/items
      // are configured. Only pin `rows` when the person has explicitly
      // sized the card, e.g. by dragging its resize handle in the
      // dashboard (which writes grid_options.rows for you).
      if (g.rows != null) {
        options.rows = g.rows;
      }
      options.min_rows = g.min_rows != null ? g.min_rows : 1;
      if (g.max_rows != null) options.max_rows = g.max_rows;

      return options;
    }

    // Whole-card tap action, configured via `tap_action` in the card
    // config. When this is set, tapping anywhere on the card — including
    // on an entity icon — runs this single action, giving the card one
    // predictable navigation target no matter where you click.
    _handleCardTap() {
      if (!this._config) return;
      const cardTap = this._config.tap_action;
      if (!cardTap || cardTap.action === "none") return;
      handleAction(this, cardTap);
    }

    // Per-entity tap action. Resolution order:
    //  1. an explicit `tap_action` on the item always wins
    //  2. otherwise, if the card has its own tap_action configured, the
    //     entity defers to it entirely (no independent click) — this is
    //     what keeps "click background" and "click icon by accident"
    //     going to the same place
    //  3. otherwise, default to opening that entity's more-info dialog
    _resolveItemTapAction(item) {
      if (item.tap_action) {
        const ta = item.tap_action;
        if (
          (ta.action === "more-info" || ta.action === "toggle") &&
          !ta.entity
        ) {
          return { ...ta, entity: item.entity };
        }
        return ta;
      }
      const cardTapSet =
        this._config.tap_action && this._config.tap_action.action !== "none";
      if (cardTapSet) {
        return { action: "none" };
      }
      return { action: "more-info", entity: item.entity };
    }

    _handleItemTap(e, item) {
      const tapAction = this._resolveItemTapAction(item);
      if (!tapAction || tapAction.action === "none") {
        // No independent action — let the click bubble up so the
        // card-level tap action (if any) handles it instead.
        return;
      }
      e.stopPropagation();
      this._clearItemPressTimer();
      if (tapAction.action === "toggle") {
        // A long-press already fired more-info for this same press —
        // don't also toggle when the pointer lifts and the click event
        // follows right behind it.
        if (this._itemLongPressFired) {
          this._itemLongPressFired = false;
          return;
        }
      }
      handleAction(this, tapAction);
    }

    // Press-and-hold support for entities in "toggle" tap mode: holding
    // for HOLD_MS opens more-info instead of toggling, exactly like tap
    // actions work throughout the rest of Home Assistant. Only wired up
    // when the resolved tap action is "toggle" — every other tap mode
    // is unaffected by these handlers (they just no-op).
    _handleItemPointerDown(e, item) {
      const tapAction = this._resolveItemTapAction(item);
      if (!tapAction || tapAction.action !== "toggle") return;
      this._itemLongPressFired = false;
      this._clearItemPressTimer();
      this._itemPressTimer = setTimeout(() => {
        this._itemLongPressFired = true;
        handleAction(this, { action: "more-info", entity: item.entity });
      }, 500);
    }

    _clearItemPressTimer() {
      if (this._itemPressTimer) {
        clearTimeout(this._itemPressTimer);
        this._itemPressTimer = null;
      }
    }

    _renderItem(item, extraMarginPx, si, ii, segment) {
      const marginStyle = extraMarginPx ? `margin:${extraMarginPx}px;` : "";
      if (item.type === "text") {
        const fontStyle = item.font_size
          ? `font-size:${item.font_size}px;`
          : "";
        const sizeStyle = fillOrSizeStyle(item);
        const hasMarkdown = !!customElements.get("ha-markdown");
        // If this text contains Jinja ({{ ... }} / {% ... %}), show the
        // live-rendered result from the render_template subscription
        // (see _syncTemplateSubscriptions) once it's arrived; until then,
        // or for plain text, fall back to the raw text as typed.
        const templateKey = `${si}-${ii}`;
        const displayText =
          this._templateResults[templateKey] != null
            ? this._templateResults[templateKey]
            : item.text;
        return html`<div
          class="text-item ${item.style || "body"}"
          style="${fontStyle} ${marginStyle} ${sizeStyle}"
        >
          ${hasMarkdown
            ? html`<ha-markdown breaks .content=${displayText || ""}></ha-markdown>`
            : displayText}
        </div>`;
      }
      if (item.type === "spacer") {
        const size = item.size;
        const style = size
          ? `flex:0 0 ${size}px; width:${size}px; height:${size}px;`
          : `flex:1 1 auto;`;
        return html`<div class="spacer-item" style="${style}"></div>`;
      }
      if (item.type === "break") {
        return html`<div class="break-item"></div>`;
      }
      if (item.type === "entity") {
        if (!item.entity) return html``;
        const stateObj = this.hass && this.hass.states[item.entity];
        if (!stateObj) {
          return html`<div class="entity-item missing">
            ${item.entity} (unavailable)
          </div>`;
        }
        // A segment's own hide_unavailable setting overrides the card's
        // global one when it's explicitly set (true or false); otherwise
        // the segment just inherits the card-wide default.
        const hideUnavailable =
          segment && segment.hide_unavailable != null
            ? segment.hide_unavailable
            : !!this._config.hide_unavailable;
        if (
          hideUnavailable &&
          (stateObj.state === "unavailable" || stateObj.state === "unknown")
        ) {
          return html``;
        }
        // Color priority: an on/off-specific override (color_on /
        // color_off) wins first, letting someone pin an exact color per
        // state without touching the domain default logic at all. Next,
        // a single static `color` override applies regardless of state.
        // Otherwise falls through to getIconColor — which itself shows a
        // `light` entity's own bulb color when it's on, or the normal
        // domain active/inactive default for everything else.
        const isOn = isActive(stateObj);
        const color =
          (isOn && item.color_on) ||
          (!isOn && item.color_off) ||
          item.color ||
          getIconColor(stateObj);
        // Same on/off-first priority for the icon glyph itself: icon_on
        // / icon_off win when they match the current state, then a
        // static `icon` override, then the computed domain default.
        const explicitIcon =
          (isOn && item.icon_on) ||
          (!isOn && item.icon_off) ||
          item.icon ||
          null;
        const icon = explicitIcon || getDefaultIcon(stateObj);
        const domain = computeDomain(item.entity);
        // A `person` entity shows its own entity_picture (avatar photo)
        // when it has one, falling back to the normal mdi:account icon
        // otherwise. Any explicit icon override (icon, icon_on, or
        // icon_off) always wins over the picture, same as it does over
        // the computed default icon.
        const entityPicture =
          stateObj.attributes && stateObj.attributes.entity_picture;
        const usePicture =
          domain === "person" && !explicitIcon && entityPicture;
        const pictureUrl = usePicture
          ? this.hass && this.hass.hassUrl
            ? this.hass.hassUrl(entityPicture)
            : entityPicture
          : null;
        const name =
          item.name || stateObj.attributes.friendly_name || item.entity;
        const showName = item.show_name !== false;
        const showIcon = item.show_icon !== false;
        const showState = item.show_state !== false;
        // icon_zoom scales the glyph itself via CSS transform rather than
        // resizing its layout box — most MDI icons don't fill their own
        // canvas, so this crops out that built-in artwork whitespace
        // without touching the segment's Gap spacing at all. The scaled
        // icon can never visually escape this entity's own box (or the
        // segment's), because both have overflow:hidden — see the
        // `.entity-item` / `.segment` styles. Position offsets use
        // `position:relative; left/top` rather than margin, so nudging
        // one element doesn't reflow its siblings — and anything nudged
        // past the entity's own box is clipped for the same reason the
        // zoom is. icon_flip mirrors the glyph horizontally/vertically —
        // combined into the same `transform` as the zoom, since a style
        // attribute can only hold one `transform` declaration.
        const iconTransform = iconTransformStyle(item);
        const iconStyle = `color:${color};${
          item.icon_size ? `--mdc-icon-size:${item.icon_size}px;` : ""
        }${iconTransform}${offsetStyle(item.icon_offset_x, item.icon_offset_y)}`;
        // The photo equivalent of iconStyle above — same size, zoom, and
        // offset controls, but as a round avatar image instead of a
        // colored glyph (color doesn't apply to a photo). icon_flip
        // applies here too, in case someone wants a mirrored photo.
        const pictureStyle = `display:block;flex:0 0 auto;width:${
          item.icon_size || 24
        }px;height:${
          item.icon_size || 24
        }px;border-radius:50%;object-fit:cover;${iconTransform}${offsetStyle(
          item.icon_offset_x,
          item.icon_offset_y
        )}`;
        const nameStyle = `${
          item.name_size ? `font-size:${item.name_size}px;` : ""
        }${offsetStyle(item.name_offset_x, item.name_offset_y)}`;
        const stateStyle = `${
          item.state_size ? `font-size:${item.state_size}px;` : ""
        }${offsetStyle(item.state_offset_x, item.state_offset_y)}`;
        // Lets the name/state block sit left (default), centered, or
        // pushed to the right within whatever extra space the entity's
        // own box has — most useful once the entity has an explicit
        // width/height (or fill_segment) larger than its content. The
        // icon's own position is unaffected either way.
        const textAlign = item.text_align || "left";
        const textAlignStyle =
          textAlign === "center"
            ? "align-items:center;text-align:center;margin-left:auto;margin-right:auto;"
            : textAlign === "right"
            ? "align-items:flex-end;text-align:right;margin-left:auto;"
            : "";
        const tapAction = this._resolveItemTapAction(item);
        const inert = !tapAction || tapAction.action === "none";
        const hasText = showName || showState;
        const paddingStyle =
          item.padding != null ? `padding:${item.padding}px;` : "";
        // Explicit entity width/height (or `fill_segment`) — see
        // fillOrSizeStyle. `.entity-item` always carries max-width/
        // max-height:100% plus overflow:hidden, and the parent
        // `.segment` does too, so no matter what's typed in here (or how
        // large icon_zoom gets) the entity can never visually spill past
        // its segment, and nothing clipped away is clickable either
        // (browsers don't hit-test content outside an overflow:hidden
        // box).
        const sizeStyle = fillOrSizeStyle(item);
        const iconEl = showIcon
          ? usePicture
            ? html`<img
                class="entity-picture"
                src=${pictureUrl}
                style="${pictureStyle}"
                alt=""
              />`
            : html`<ha-icon .icon=${icon} style="${iconStyle}"></ha-icon>`
          : "";
        const textEl = hasText
          ? html`<div class="entity-text" style="${textAlignStyle}">
              ${showName
                ? html`<span class="entity-name" style="${nameStyle}"
                    >${name}</span
                  >`
                : ""}
              ${showState
                ? html`<span class="entity-state" style="${stateStyle}"
                    >${formatState(this.hass, stateObj)}</span
                  >`
                : ""}
            </div>`
          : "";
        // icon_position swaps which side of the text the icon renders on
        // — everything else about the entity's layout (gap, alignment,
        // sizing) stays exactly the same either way.
        return html`
          <div
            class="entity-item ${inert ? "inert" : ""}"
            style="${marginStyle} ${paddingStyle} ${sizeStyle}"
            @click=${(e) => this._handleItemTap(e, item)}
            @pointerdown=${(e) => this._handleItemPointerDown(e, item)}
            @pointerup=${() => this._clearItemPressTimer()}
            @pointerleave=${() => this._clearItemPressTimer()}
            @pointercancel=${() => this._clearItemPressTimer()}
          >
            ${item.icon_position === "right"
              ? html`${textEl}${iconEl}`
              : html`${iconEl}${textEl}`}
          </div>
        `;
      }
      return html``;
    }

    _renderTitle() {
      const t = this._config;
      if (!t.title) return html``;

      let posStyle = "";
      if (t.title_position === "absolute") {
        const parts = ["position:absolute;"];
        if (t.title_top != null) parts.push(`top:${t.title_top}px;`);
        if (t.title_bottom != null) parts.push(`bottom:${t.title_bottom}px;`);
        if (t.title_left != null) parts.push(`left:${t.title_left}px;`);
        if (t.title_right != null) parts.push(`right:${t.title_right}px;`);
        parts.push(
          `width:${t.title_width != null ? t.title_width + "px" : "auto"};`
        );
        parts.push(
          `height:${t.title_height != null ? t.title_height + "px" : "auto"};`
        );
        posStyle = parts.join(" ");
      } else {
        posStyle = `
          position:relative;
          width:${t.title_width != null ? t.title_width + "px" : "100%"};
          ${t.title_height != null ? `height:${t.title_height}px;` : ""}
        `;
      }

      const fontSize = t.title_font_size
        ? `font-size:${t.title_font_size}px;`
        : "font-size:1.2em;";
      const textAlign = `text-align:${t.title_align || "left"};`;

      return html`<div
        class="card-title"
        style="${posStyle} ${fontSize} ${textAlign} box-sizing:border-box;"
      >
        ${t.title}
      </div>`;
    }

    _renderSegment(segment, si) {
      const border = segment.show_border
        ? `border:${
            segment.border_width != null ? segment.border_width : 1
          }px solid ${
            segment.border_color || "var(--divider-color, #ccc)"
          }; border-radius:${
            segment.border_radius != null ? segment.border_radius : 8
          }px;`
        : "";

      // CSS `gap` can't go negative — browsers just ignore it, silently
      // clamping to 0. To let items sit closer than "touching" (even
      // overlapping), negative gap values are implemented as matched
      // negative margins on each item, with a compensating positive
      // margin on the segment itself so the first/last item's outer edge
      // stays put relative to the segment's own padding/position.
      const gapValue = segment.gap != null ? segment.gap : 12;
      const isNegativeGap = gapValue < 0;
      const halfGap = isNegativeGap ? Math.abs(gapValue) / 2 : 0;

      let posStyle = "";
      if (segment.position === "absolute") {
        const parts = ["position:absolute;"];
        if (segment.top != null) parts.push(`top:${segment.top}px;`);
        if (segment.bottom != null) parts.push(`bottom:${segment.bottom}px;`);
        if (segment.left != null) parts.push(`left:${segment.left}px;`);
        if (segment.right != null) parts.push(`right:${segment.right}px;`);
        parts.push(
          `width:${segment.width != null ? segment.width + "px" : "auto"};`
        );
        parts.push(
          `height:${segment.height != null ? segment.height + "px" : "auto"};`
        );
        posStyle = parts.join(" ");
      } else {
        posStyle = `
          position:relative;
          width:${segment.width != null ? segment.width + "px" : "100%"};
          ${segment.height != null ? `height:${segment.height}px;` : ""}
        `;
      }

      const style = `
        display:flex;
        flex-direction:${segment.direction === "column" ? "column" : "row"};
        justify-content:${segment.justify || "flex-start"};
        align-items:${segment.align || "center"};
        flex-wrap:${segment.wrap === false ? "nowrap" : "wrap"};
        gap:${isNegativeGap ? 0 : gapValue}px;
        ${isNegativeGap ? `margin:${halfGap}px;` : ""}
        padding:${segment.padding != null ? segment.padding : 0}px;
        ${segment.min_height ? `min-height:${segment.min_height}px;` : ""}
        ${border}
        ${posStyle}
        box-sizing:border-box;
        overflow:${segment.overflow === "visible" ? "visible" : "hidden"};
      `;
      return html`<div class="segment" style="${style}">
        ${(segment.items || []).map((item, ii) =>
          this._renderItem(item, isNegativeGap ? -halfGap : 0, si, ii, segment)
        )}
      </div>`;
    }

    render() {
      if (!this._config) return html``;
      const padding =
        this._config.padding != null ? this._config.padding : 16;

      const bgParts = [];
      if (this._config.background_color) {
        bgParts.push(`background-color:${this._config.background_color};`);
      }
      if (this._config.background_image) {
        bgParts.push(
          `background-image:url('${this._config.background_image}');`,
          `background-size:${this._config.background_size || "cover"};`,
          `background-position:${
            this._config.background_position || "center"
          };`,
          `background-repeat:${this._config.background_repeat || "no-repeat"};`
        );
      }
      const backgroundStyle = bgParts.join(" ");

      const contentStyle = `
        position:relative;
        box-sizing:border-box;
        padding:${padding}px;
        flex:1 1 auto;
        min-height:100%;
        ${backgroundStyle}
        ${
          this._config.tap_action && this._config.tap_action.action !== "none"
            ? "cursor:pointer;"
            : ""
        }
      `;

      // Also expose the color through Home Assistant's own supported
      // theming hook (--ha-card-background), so anything that reads that
      // variable — including ha-card's own header bar area, if a title is
      // set — matches too. Same approach for the border: --ha-card-border-width
      // is the supported override, rather than fighting ha-card's own
      // internal border rule with a plain CSS `border` declaration.
      const cardStyleParts = [];
      if (this._config.background_color) {
        cardStyleParts.push(
          `--ha-card-background:${this._config.background_color};`
        );
      }
      if (this._config.hide_border) {
        cardStyleParts.push(`--ha-card-border-width:0;`);
      }
      const cardStyle = cardStyleParts.join(" ");

      return html`
        <ha-card style="${cardStyle}">
          <div
            class="card-content"
            style="${contentStyle}"
            @click=${() => this._handleCardTap()}
          >
            ${this._renderTitle()}
            ${(this._config.segments || []).map((s, si) =>
              this._renderSegment(s, si)
            )}
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        :host {
          display: block;
          /* Stretches to fill whatever box the layout gives this card —
             a Sections-view grid cell (once rows are pinned, via the
             card's own resize handles or grid_options.rows), or a
             masonry/panel view container. Where nothing constrains the
             host's height, this simply has no effect and the card sizes
             to its content as before. */
          height: 100%;
        }
        ha-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow: hidden;
        }
        .card-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .segment {
          width: 100%;
        }
        .card-title {
          font-weight: 600;
          color: var(--primary-text-color, inherit);
        }
        .text-item {
          box-sizing: border-box;
          max-width: 100%;
          max-height: 100%;
          overflow: hidden;
        }
        .text-item.header {
          font-size: 1.2em;
          font-weight: 600;
        }
        .text-item.subtitle {
          font-size: 1em;
          font-weight: 500;
          opacity: 0.8;
        }
        .text-item.body {
          font-size: 0.9em;
          opacity: 0.7;
        }
        .text-item ha-markdown {
          display: block;
        }
        .text-item ha-markdown p:first-child {
          margin-top: 0;
        }
        .text-item ha-markdown p:last-child {
          margin-bottom: 0;
        }
        .entity-item {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 1px;
          border-radius: 8px;
          background: transparent;
          transition: background 0.15s ease;
          flex: 0 0 auto;
          box-sizing: border-box;
          /* An explicit width/height (set via the entity's Width/Height
             fields) is a target size only — it can never exceed the
             segment it lives in, and anything that visually grows past
             this box (e.g. a zoomed icon) is clipped rather than
             spilling into neighboring items or off the card. Clipped
             content also isn't clickable, since it's never painted. */
          max-width: 100%;
          max-height: 100%;
          overflow: hidden;
        }
        .entity-item:hover {
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.08));
        }
        .entity-item.missing {
          color: var(--error-color, red);
          font-size: 0.85em;
          background: none;
        }
        .entity-item.inert {
          cursor: inherit;
        }
        .entity-item.inert:hover {
          background: transparent;
        }
        ha-icon {
          --mdc-icon-size: 22px;
        }
        .entity-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .entity-name {
          font-size: 0.85em;
          font-weight: 500;
        }
        .entity-state {
          font-size: 0.75em;
          opacity: 0.65;
        }
        .spacer-item {
          flex-shrink: 0;
        }
        .break-item {
          flex-basis: 100%;
          width: 100%;
          height: 0;
          overflow: hidden;
        }
      `;
    }
  }

  // ---------------------------------------------------------------------
  // Editor
  // ---------------------------------------------------------------------
  class HaSegmentedEntitiesCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, _config: {} };
    }

    constructor() {
      super();
      // Purely local UI state — which segments/items/subsections / the
      // card-settings block are collapsed in the editor. Not saved to
      // the card config.
      this._collapsedSegments = new Set();
      this._collapsedItems = new Set(); // keys are "segIndex-itemIndex"
      this._collapsedSubsections = new Set(); // keys "segIndex-itemIndex-icon"/"-text"
      this._cardDetailsCollapsed = false;
      this._collapseInitialized = false;
    }

    setConfig(config) {
      this._config = config;
      // The first time the editor opens, start every existing segment
      // (and every item inside it, and each item's Icon/Text
      // subsections) collapsed so a card with several segments doesn't
      // dump a huge form on screen. This only runs once — segments/items
      // added later in the same editing session (via "+ Add Segment" /
      // "+ Add Entity" etc.) stay expanded so you can fill them in right
      // away.
      if (!this._collapseInitialized) {
        this._collapseInitialized = true;
        (config.segments || []).forEach((seg, si) => {
          this._collapsedSegments.add(si);
          (seg.items || []).forEach((item, ii) => {
            this._collapsedItems.add(`${si}-${ii}`);
            if (item.type === "entity") {
              this._collapsedSubsections.add(`${si}-${ii}-icon`);
              this._collapsedSubsections.add(`${si}-${ii}-text`);
            }
          });
        });
      }
    }

    _toggleSegmentCollapse(si) {
      if (this._collapsedSegments.has(si)) {
        this._collapsedSegments.delete(si);
      } else {
        this._collapsedSegments.add(si);
      }
      this.requestUpdate();
    }

    _toggleItemCollapse(si, ii) {
      const key = `${si}-${ii}`;
      if (this._collapsedItems.has(key)) {
        this._collapsedItems.delete(key);
      } else {
        this._collapsedItems.add(key);
      }
      this.requestUpdate();
    }

    _toggleSubsection(key) {
      if (this._collapsedSubsections.has(key)) {
        this._collapsedSubsections.delete(key);
      } else {
        this._collapsedSubsections.add(key);
      }
      this.requestUpdate();
    }

    _toggleCardDetails() {
      this._cardDetailsCollapsed = !this._cardDetailsCollapsed;
      this.requestUpdate();
    }

    _fireChanged() {
      const event = new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }

    _updateConfig(mutator) {
      const newConfig = JSON.parse(JSON.stringify(this._config));
      mutator(newConfig);
      this._config = newConfig;
      this._fireChanged();
    }

    _addSegment() {
      this._updateConfig((c) => {
        if (!c.segments) c.segments = [];
        c.segments.push({
          direction: "row",
          justify: "flex-start",
          align: "center",
          wrap: true,
          items: [],
        });
      });
    }

    _removeSegment(i) {
      this._updateConfig((c) => c.segments.splice(i, 1));
    }

    // Swaps a segment with its neighbor. Collapsed/expanded editor state
    // is tracked by index, so it's swapped right along with the segment
    // — otherwise the wrong segment would appear collapsed after moving.
    _moveSegment(si, delta) {
      const newIndex = si + delta;
      if (
        !this._config ||
        newIndex < 0 ||
        newIndex >= this._config.segments.length
      ) {
        return;
      }
      this._updateConfig((c) => {
        const [seg] = c.segments.splice(si, 1);
        c.segments.splice(newIndex, 0, seg);
      });
      const wasCollapsed = this._collapsedSegments.has(si);
      const otherCollapsed = this._collapsedSegments.has(newIndex);
      if (wasCollapsed !== otherCollapsed) {
        if (otherCollapsed) this._collapsedSegments.add(si);
        else this._collapsedSegments.delete(si);
        if (wasCollapsed) this._collapsedSegments.add(newIndex);
        else this._collapsedSegments.delete(newIndex);
      }
    }

    _addItem(segIdx, type) {
      this._updateConfig((c) => {
        let item;
        if (type === "text") {
          item = { type: "text", text: "New text", style: "body" };
        } else if (type === "entity") {
          item = {
            type: "entity",
            entity: "",
            show_name: true,
            show_state: true,
            show_icon: true,
          };
        } else if (type === "spacer") {
          item = { type: "spacer" };
        } else if (type === "break") {
          item = { type: "break" };
        }
        c.segments[segIdx].items.push(item);
      });
    }

    _itemLabel(type) {
      switch (type) {
        case "text":
          return "📝 Text";
        case "entity":
          return "🔌 Entity";
        case "spacer":
          return "↔️ Spacer";
        case "break":
          return "↵ Line Break";
        default:
          return type;
      }
    }

    _removeItem(segIdx, itemIdx) {
      this._updateConfig((c) => c.segments[segIdx].items.splice(itemIdx, 1));
    }

    _moveItem(segIdx, itemIdx, dir) {
      this._updateConfig((c) => {
        const items = c.segments[segIdx].items;
        const newIdx = itemIdx + dir;
        if (newIdx < 0 || newIdx >= items.length) return;
        const [item] = items.splice(itemIdx, 1);
        items.splice(newIdx, 0, item);
      });
      // Collapsed state is tracked by "segment-item" index, so swap it
      // (and the Icon/Text subsection collapse state riding along with
      // it) to avoid the wrong item appearing collapsed after moving.
      const keyA = `${segIdx}-${itemIdx}`;
      const keyB = `${segIdx}-${itemIdx + dir}`;
      const a = this._collapsedItems.has(keyA);
      const b = this._collapsedItems.has(keyB);
      if (a !== b) {
        if (b) this._collapsedItems.add(keyA);
        else this._collapsedItems.delete(keyA);
        if (a) this._collapsedItems.add(keyB);
        else this._collapsedItems.delete(keyB);
      }
      ["icon", "text"].forEach((suffix) => {
        const subKeyA = `${keyA}-${suffix}`;
        const subKeyB = `${keyB}-${suffix}`;
        const subA = this._collapsedSubsections.has(subKeyA);
        const subB = this._collapsedSubsections.has(subKeyB);
        if (subA !== subB) {
          if (subB) this._collapsedSubsections.add(subKeyA);
          else this._collapsedSubsections.delete(subKeyA);
          if (subA) this._collapsedSubsections.add(subKeyB);
          else this._collapsedSubsections.delete(subKeyB);
        }
      });
    }

    _setSegmentProp(segIdx, prop, value) {
      this._updateConfig((c) => (c.segments[segIdx][prop] = value));
    }

    _setItemProp(segIdx, itemIdx, prop, value) {
      this._updateConfig((c) => (c.segments[segIdx].items[itemIdx][prop] = value));
    }

    // Keeps an entity's width/height from ever being entered larger than
    // its segment's own explicit size. If the segment has no explicit
    // size (i.e. it sizes itself to its content / 100% width) there's
    // nothing fixed to clamp against here — the runtime CSS clipping
    // (max-width/max-height:100% + overflow:hidden on both the entity
    // and the segment) still guarantees nothing escapes the segment.
    _clampToSegment(value, segmentDimension) {
      if (segmentDimension == null) return value;
      return Math.max(0, Math.min(value, segmentDimension));
    }

    // Shared "Position" controls for an entity/text item — mirrors the
    // segment editor's own Position dropdown and Top/Bottom/Left/Right
    // fields one level up, so an item can be freely placed with
    // position:absolute inside its segment the same way a segment
    // places itself inside the card.
    _renderPositionFields(si, ii, item) {
      return html`
        <div class="row">
          <label>Position</label>
          <select
            .value=${item.position === "absolute" ? "absolute" : "flow"}
            @change=${(e) =>
              this._setItemProp(
                si,
                ii,
                "position",
                e.target.value === "absolute" ? "absolute" : undefined
              )}
          >
            <option value="flow">Normal flow (segment's layout settings)</option>
            <option value="absolute">Exact pixel placement</option>
          </select>
        </div>
        ${item.position === "absolute"
          ? html`
              <div class="row-inline">
                <div class="row">
                  <label>Top (px)</label>
                  <input
                    type="number"
                    placeholder="auto"
                    .value=${item.top != null ? item.top : ""}
                    @change=${(e) =>
                      this._setItemProp(
                        si,
                        ii,
                        "top",
                        e.target.value !== ""
                          ? Number(e.target.value)
                          : undefined
                      )}
                  />
                </div>
                <div class="row">
                  <label>Bottom (px)</label>
                  <input
                    type="number"
                    placeholder="auto"
                    .value=${item.bottom != null ? item.bottom : ""}
                    @change=${(e) =>
                      this._setItemProp(
                        si,
                        ii,
                        "bottom",
                        e.target.value !== ""
                          ? Number(e.target.value)
                          : undefined
                      )}
                  />
                </div>
              </div>
              <div class="row-inline">
                <div class="row">
                  <label>Left (px)</label>
                  <input
                    type="number"
                    placeholder="auto"
                    .value=${item.left != null ? item.left : ""}
                    @change=${(e) =>
                      this._setItemProp(
                        si,
                        ii,
                        "left",
                        e.target.value !== ""
                          ? Number(e.target.value)
                          : undefined
                      )}
                  />
                </div>
                <div class="row">
                  <label>Right (px)</label>
                  <input
                    type="number"
                    placeholder="auto"
                    .value=${item.right != null ? item.right : ""}
                    @change=${(e) =>
                      this._setItemProp(
                        si,
                        ii,
                        "right",
                        e.target.value !== ""
                          ? Number(e.target.value)
                          : undefined
                      )}
                  />
                </div>
              </div>
            `
          : ""}
      `;
    }

    _setItemTapMode(segIdx, itemIdx, mode) {
      this._updateConfig((c) => {
        const item = c.segments[segIdx].items[itemIdx];
        if (mode === "auto") {
          delete item.tap_action;
        } else if (mode === "more_info") {
          item.tap_action = { action: "more-info" };
        } else if (mode === "toggle") {
          item.tap_action = { action: "toggle" };
        } else if (mode === "none") {
          item.tap_action = { action: "none" };
        }
      });
    }

    _itemTapMode(item) {
      if (!item.tap_action) return "auto";
      if (item.tap_action.action === "none") return "none";
      if (item.tap_action.action === "more-info") return "more_info";
      if (item.tap_action.action === "toggle") return "toggle";
      return "auto";
    }

    _setTitle(value) {
      this._updateConfig((c) => (c.title = value));
    }

    _gridOption(key) {
      return this._config.grid_options ? this._config.grid_options[key] : undefined;
    }

    _setGridOption(key, value) {
      this._updateConfig((c) => {
        if (!c.grid_options) c.grid_options = {};
        if (value === "") {
          delete c.grid_options[key];
        } else {
          c.grid_options[key] = Number(value);
        }
        if (Object.keys(c.grid_options).length === 0) {
          delete c.grid_options;
        }
      });
    }

    _setCardPadding(value) {
      this._updateConfig(
        (c) => (c.padding = value !== "" ? Number(value) : undefined)
      );
    }

    _setCardProp(prop, value) {
      this._updateConfig((c) => (c[prop] = value !== "" ? value : undefined));
    }

    _setCardNumProp(prop, value) {
      this._updateConfig(
        (c) => (c[prop] = value !== "" ? Number(value) : undefined)
      );
    }

    _setCardTapAction(prop, value) {
      this._updateConfig((c) => {
        if (!c.tap_action) c.tap_action = { action: "none" };
        if (prop === "action") {
          c.tap_action = { action: value };
        } else {
          c.tap_action[prop] = value !== "" ? value : undefined;
        }
      });
    }

    _fillCard(si) {
      this._updateConfig((c) => {
        const seg = c.segments[si];
        seg.position = "absolute";
        seg.top = 0;
        seg.bottom = 0;
        seg.left = 0;
        seg.right = 0;
        delete seg.width;
        delete seg.height;
      });
    }

    render() {
      if (!this._config) return html``;
      return html`
        <div class="editor">
          <div class="collapsible-header" @click=${() =>
            this._toggleCardDetails()}>
            <span class="chevron">${
              this._cardDetailsCollapsed ? "▸" : "▾"
            }</span>
            <strong>Card Settings</strong>
          </div>
          ${this._cardDetailsCollapsed
            ? ""
            : html`
          <div class="row">
            <label>Card Title</label>
            <input
              type="text"
              .value=${this._config.title || ""}
              @change=${(e) => this._setTitle(e.target.value)}
            />
          </div>

          ${this._config.title
            ? html`
                <div class="row">
                  <label>Title position</label>
                  <select
                    .value=${this._config.title_position === "absolute"
                      ? "absolute"
                      : "flow"}
                    @change=${(e) =>
                      this._setCardProp("title_position", e.target.value)}
                  >
                    <option value="flow">
                      Normal flow (above the segments)
                    </option>
                    <option value="absolute">Exact pixel placement</option>
                  </select>
                </div>

                <div class="row-inline">
                  <div class="row">
                    <label>Align</label>
                    <select
                      .value=${this._config.title_align || "left"}
                      @change=${(e) =>
                        this._setCardProp("title_align", e.target.value)}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div class="row">
                    <label>Font size (px)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="default"
                      .value=${this._config.title_font_size || ""}
                      @change=${(e) =>
                        this._setCardNumProp(
                          "title_font_size",
                          e.target.value
                        )}
                    />
                  </div>
                </div>

                <div class="row-inline">
                  <div class="row">
                    <label>Width (px)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="auto"
                      .value=${this._config.title_width || ""}
                      @change=${(e) =>
                        this._setCardNumProp("title_width", e.target.value)}
                    />
                  </div>
                  <div class="row">
                    <label>Height (px)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="auto"
                      .value=${this._config.title_height || ""}
                      @change=${(e) =>
                        this._setCardNumProp("title_height", e.target.value)}
                    />
                  </div>
                </div>

                ${this._config.title_position === "absolute"
                  ? html`
                      <div class="row-inline">
                        <div class="row">
                          <label>Top (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${this._config.title_top != null
                              ? this._config.title_top
                              : ""}
                            @change=${(e) =>
                              this._setCardNumProp(
                                "title_top",
                                e.target.value
                              )}
                          />
                        </div>
                        <div class="row">
                          <label>Bottom (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${this._config.title_bottom != null
                              ? this._config.title_bottom
                              : ""}
                            @change=${(e) =>
                              this._setCardNumProp(
                                "title_bottom",
                                e.target.value
                              )}
                          />
                        </div>
                      </div>
                      <div class="row-inline">
                        <div class="row">
                          <label>Left (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${this._config.title_left != null
                              ? this._config.title_left
                              : ""}
                            @change=${(e) =>
                              this._setCardNumProp(
                                "title_left",
                                e.target.value
                              )}
                          />
                        </div>
                        <div class="row">
                          <label>Right (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${this._config.title_right != null
                              ? this._config.title_right
                              : ""}
                            @change=${(e) =>
                              this._setCardNumProp(
                                "title_right",
                                e.target.value
                              )}
                          />
                        </div>
                      </div>
                    `
                  : ""}
              `
            : ""}

          <div class="section-title">Sections View Sizing</div>
          <span class="hint"
            >Card height and width are controlled by Lovelace — drag the
            card's own resize handle from Home Assistant's card editor
            "Layout" tab, or set it directly here (writes to
            grid_options). Leave rows blank to let the card size itself
            to its content.</span
          >
          <div class="row-inline">
            <div class="row">
              <label>Width (columns, 1–12)</label>
              <input
                type="number"
                min="1"
                max="12"
                placeholder="12"
                .value=${this._gridOption("columns") ?? ""}
                @change=${(e) =>
                  this._setGridOption("columns", e.target.value)}
              />
            </div>
            <div class="row">
              <label>Height (rows)</label>
              <input
                type="number"
                min="1"
                placeholder="auto"
                .value=${this._gridOption("rows") ?? ""}
                @change=${(e) => this._setGridOption("rows", e.target.value)}
              />
            </div>
          </div>
          <div class="row-inline">
            <div class="row">
              <label>Min width (columns)</label>
              <input
                type="number"
                min="1"
                max="12"
                placeholder="3"
                .value=${this._gridOption("min_columns") ?? ""}
                @change=${(e) =>
                  this._setGridOption("min_columns", e.target.value)}
              />
            </div>
            <div class="row">
              <label>Max width (columns)</label>
              <input
                type="number"
                min="1"
                max="12"
                placeholder="none"
                .value=${this._gridOption("max_columns") ?? ""}
                @change=${(e) =>
                  this._setGridOption("max_columns", e.target.value)}
              />
            </div>
          </div>
          <div class="row-inline">
            <div class="row">
              <label>Min height (rows)</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                .value=${this._gridOption("min_rows") ?? ""}
                @change=${(e) =>
                  this._setGridOption("min_rows", e.target.value)}
              />
            </div>
            <div class="row">
              <label>Max height (rows)</label>
              <input
                type="number"
                min="1"
                placeholder="none"
                .value=${this._gridOption("max_rows") ?? ""}
                @change=${(e) =>
                  this._setGridOption("max_rows", e.target.value)}
              />
            </div>
          </div>

          <div class="row">
            <label
              >Card padding (px) — set to 0 so segments can reach the
              card's edges</label
            >
            <input
              type="number"
              min="0"
              placeholder="16"
              .value=${this._config.padding != null
                ? this._config.padding
                : ""}
              @change=${(e) => this._setCardPadding(e.target.value)}
            />
          </div>

          <div class="row">
            <label>
              <input
                type="checkbox"
                .checked=${!!this._config.hide_unavailable}
                @change=${(e) =>
                  this._updateConfig(
                    (c) =>
                      (c.hide_unavailable = e.target.checked
                        ? true
                        : undefined)
                  )}
              />
              Hide unavailable/unknown entities
            </label>
            <span class="hint"
              >Applies to every segment by default — each segment below
              can override this individually under its own settings.</span
            >
          </div>

          <div class="section-title">Background</div>

          <div class="row">
            <label
              >Background color — try "transparent", a hex code, or
              rgba(0,0,0,0.4) for a see-through tint</label
            >
            <input
              type="text"
              placeholder="transparent, #222, or rgba(0,0,0,0.4)"
              .value=${this._config.background_color || ""}
              @change=${(e) =>
                this._setCardProp("background_color", e.target.value)}
            />
          </div>

          <div class="row">
            <label>
              <input
                type="checkbox"
                .checked=${!!this._config.hide_border}
                @change=${(e) =>
                  this._updateConfig(
                    (c) => (c.hide_border = e.target.checked || undefined)
                  )}
              />
              Hide card border
            </label>
          </div>

          <div class="row">
            <label>Background image URL</label>
            <input
              type="text"
              placeholder="/local/my-image.jpg or https://..."
              .value=${this._config.background_image || ""}
              @change=${(e) =>
                this._setCardProp("background_image", e.target.value)}
            />
          </div>

          ${this._config.background_image
            ? html`
                <div class="row-inline">
                  <div class="row">
                    <label>Size</label>
                    <select
                      .value=${this._config.background_size || "cover"}
                      @change=${(e) =>
                        this._setCardProp("background_size", e.target.value)}
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="auto">Auto (original size)</option>
                      <option value="100% 100%">Stretch</option>
                    </select>
                  </div>
                  <div class="row">
                    <label>Position</label>
                    <select
                      .value=${this._config.background_position || "center"}
                      @change=${(e) =>
                        this._setCardProp(
                          "background_position",
                          e.target.value
                        )}
                    >
                      ${[
                        "center",
                        "top",
                        "bottom",
                        "left",
                        "right",
                        "top left",
                        "top right",
                        "bottom left",
                        "bottom right",
                      ].map((v) => html`<option value=${v}>${v}</option>`)}
                    </select>
                  </div>
                  <div class="row">
                    <label>Repeat</label>
                    <select
                      .value=${this._config.background_repeat || "no-repeat"}
                      @change=${(e) =>
                        this._setCardProp(
                          "background_repeat",
                          e.target.value
                        )}
                    >
                      <option value="no-repeat">No repeat</option>
                      <option value="repeat">Repeat</option>
                      <option value="repeat-x">Repeat X</option>
                      <option value="repeat-y">Repeat Y</option>
                    </select>
                  </div>
                </div>
              `
            : ""}

          <div class="section-title">Tap Action (whole card)</div>
          <div class="hint">
            When set, tapping anywhere on the card — background or any
            entity icon — runs this one action. Individual entities defer
            to it automatically unless they have their own "On tap" set
            below, so the card has a single, predictable click target.
          </div>

          <div class="row">
            <label>Action</label>
            <select
              .value=${(this._config.tap_action &&
                this._config.tap_action.action) ||
              "none"}
              @change=${(e) =>
                this._setCardTapAction("action", e.target.value)}
            >
              <option value="none">None</option>
              <option value="navigate">Navigate to dashboard view</option>
              <option value="url">Open URL</option>
              <option value="more-info">Open an entity's more-info</option>
            </select>
          </div>

          ${this._config.tap_action &&
          this._config.tap_action.action === "navigate"
            ? html`
                <div class="row">
                  <label>Navigation path</label>
                  <input
                    type="text"
                    placeholder="/lovelace-dashboard/view"
                    .value=${this._config.tap_action.navigation_path || ""}
                    @change=${(e) =>
                      this._setCardTapAction(
                        "navigation_path",
                        e.target.value
                      )}
                  />
                </div>
              `
            : ""}
          ${this._config.tap_action && this._config.tap_action.action === "url"
            ? html`
                <div class="row">
                  <label>URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    .value=${this._config.tap_action.url_path || ""}
                    @change=${(e) =>
                      this._setCardTapAction("url_path", e.target.value)}
                  />
                </div>
              `
            : ""}
          ${this._config.tap_action &&
          this._config.tap_action.action === "more-info"
            ? html`
                <div class="row">
                  <label>Entity</label>
                  <ha-entity-picker
                    .hass=${this.hass}
                    .value=${this._config.tap_action.entity || ""}
                    @value-changed=${(e) =>
                      this._setCardTapAction("entity", e.detail.value)}
                  ></ha-entity-picker>
                </div>
              `
            : ""}
          `}

          <div class="section-title">Segments</div>

          ${(this._config.segments || []).map(
            (seg, si) => html`
              <div class="segment-editor">
                <div class="segment-header">
                  <span
                    class="chevron"
                    @click=${() => this._toggleSegmentCollapse(si)}
                    >${this._collapsedSegments.has(si) ? "▸" : "▾"}</span
                  >
                  <strong
                    class="segment-title"
                    @click=${() => this._toggleSegmentCollapse(si)}
                    >Segment ${si + 1}</strong
                  >
                  <input
                    type="text"
                    class="segment-label-input"
                    placeholder="Label (for your reference only — not shown on the card)"
                    .value=${seg.label || ""}
                    @change=${(e) =>
                      this._setSegmentProp(si, "label", e.target.value)}
                  />
                  <button
                    class="segment-move-btn"
                    title="Move segment up"
                    ?disabled=${si === 0}
                    @click=${() => this._moveSegment(si, -1)}
                  >
                    ▲
                  </button>
                  <button
                    class="segment-move-btn"
                    title="Move segment down"
                    ?disabled=${si === this._config.segments.length - 1}
                    @click=${() => this._moveSegment(si, 1)}
                  >
                    ▼
                  </button>
                  <button @click=${() => this._removeSegment(si)}>
                    ✕ Remove Segment
                  </button>
                </div>

                <div class="row-inline segment-quick-toggles">
                  <label>
                    <input
                      type="checkbox"
                      .checked=${seg.wrap !== false}
                      @change=${(e) =>
                        this._setSegmentProp(si, "wrap", e.target.checked)}
                    />
                    Wrap items
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      .checked=${!!seg.show_border}
                      @change=${(e) =>
                        this._setSegmentProp(
                          si,
                          "show_border",
                          e.target.checked
                        )}
                    />
                    Show border
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      .checked=${seg.overflow === "visible"}
                      @change=${(e) =>
                        this._setSegmentProp(
                          si,
                          "overflow",
                          e.target.checked ? "visible" : undefined
                        )}
                    />
                    Allow content to overflow segment
                  </label>
                </div>

                <div class="row">
                  <label>Unavailable/unknown entities</label>
                  <select
                    .value=${seg.hide_unavailable === true
                      ? "hide"
                      : seg.hide_unavailable === false
                      ? "show"
                      : "default"}
                    @change=${(e) => {
                      const v = e.target.value;
                      this._setSegmentProp(
                        si,
                        "hide_unavailable",
                        v === "default" ? undefined : v === "hide"
                      );
                    }}
                  >
                    <option value="default">Use card default</option>
                    <option value="show">Always show</option>
                    <option value="hide">Hide</option>
                  </select>
                </div>

                ${this._collapsedSegments.has(si)
                  ? ""
                  : html`
                <div class="row">
                  <label>Direction</label>
                  <select
                    .value=${seg.direction === "column" ? "column" : "row"}
                    @change=${(e) =>
                      this._setSegmentProp(si, "direction", e.target.value)}
                  >
                    <option value="row">Row (left ↔ right)</option>
                    <option value="column">Column (top ↕ bottom)</option>
                  </select>
                </div>

                <div class="row">
                  <label>Alignment (main axis)</label>
                  <select
                    .value=${seg.justify || "flex-start"}
                    @change=${(e) =>
                      this._setSegmentProp(si, "justify", e.target.value)}
                  >
                    ${[
                      "flex-start",
                      "center",
                      "flex-end",
                      "space-between",
                      "space-around",
                    ].map((v) => html`<option value=${v}>${v}</option>`)}
                  </select>
                </div>

                <div class="row">
                  <label>Alignment (cross axis)</label>
                  <select
                    .value=${seg.align || "center"}
                    @change=${(e) =>
                      this._setSegmentProp(si, "align", e.target.value)}
                  >
                    ${["flex-start", "center", "flex-end"].map(
                      (v) => html`<option value=${v}>${v}</option>`
                    )}
                  </select>
                </div>

                <div class="row">
                  <label>Position</label>
                  <select
                    .value=${seg.position === "absolute" ? "absolute" : "flow"}
                    @change=${(e) =>
                      this._setSegmentProp(si, "position", e.target.value)}
                  >
                    <option value="flow">Normal flow (stacked in order)</option>
                    <option value="absolute">Exact pixel placement</option>
                  </select>
                </div>

                <div class="row">
                  <button @click=${() => this._fillCard(si)}>
                    ⛶ Fill Entire Card
                  </button>
                  <span class="hint"
                    >Sets this segment to Top:0, Bottom:0, Left:0, Right:0 so
                    it stretches across the whole card. Combine with Card
                    padding: 0 above for true edge-to-edge.</span
                  >
                </div>

                <div class="row-inline">
                  <div class="row">
                    <label>Width (px)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="auto"
                      .value=${seg.width || ""}
                      @change=${(e) =>
                        this._setSegmentProp(
                          si,
                          "width",
                          e.target.value ? Number(e.target.value) : undefined
                        )}
                    />
                  </div>
                  <div class="row">
                    <label>Height (px)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="auto"
                      .value=${seg.height || ""}
                      @change=${(e) =>
                        this._setSegmentProp(
                          si,
                          "height",
                          e.target.value ? Number(e.target.value) : undefined
                        )}
                    />
                  </div>
                </div>

                ${seg.position === "absolute"
                  ? html`
                      <div class="row-inline">
                        <div class="row">
                          <label>Top (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${seg.top != null ? seg.top : ""}
                            @change=${(e) =>
                              this._setSegmentProp(
                                si,
                                "top",
                                e.target.value !== ""
                                  ? Number(e.target.value)
                                  : undefined
                              )}
                          />
                        </div>
                        <div class="row">
                          <label>Bottom (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${seg.bottom != null ? seg.bottom : ""}
                            @change=${(e) =>
                              this._setSegmentProp(
                                si,
                                "bottom",
                                e.target.value !== ""
                                  ? Number(e.target.value)
                                  : undefined
                              )}
                          />
                        </div>
                      </div>
                      <div class="row-inline">
                        <div class="row">
                          <label>Left (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${seg.left != null ? seg.left : ""}
                            @change=${(e) =>
                              this._setSegmentProp(
                                si,
                                "left",
                                e.target.value !== ""
                                  ? Number(e.target.value)
                                  : undefined
                              )}
                          />
                        </div>
                        <div class="row">
                          <label>Right (px)</label>
                          <input
                            type="number"
                            placeholder="auto"
                            .value=${seg.right != null ? seg.right : ""}
                            @change=${(e) =>
                              this._setSegmentProp(
                                si,
                                "right",
                                e.target.value !== ""
                                  ? Number(e.target.value)
                                  : undefined
                              )}
                          />
                        </div>
                      </div>
                      <div class="hint">
                        Leave a field blank to leave that side unconstrained.
                        Set the card's Height above so this segment has room
                        to sit in.
                      </div>
                    `
                  : ""}

                <div class="row-inline">
                  <div class="row">
                    <label>Padding (px)</label>
                    <input
                      type="number"
                      min="0"
                      .value=${seg.padding != null ? seg.padding : 0}
                      @change=${(e) =>
                        this._setSegmentProp(
                          si,
                          "padding",
                          Number(e.target.value)
                        )}
                    />
                  </div>
                  <div class="row">
                    <label
                      >Gap between items (px) — negative pulls them
                      closer/overlapping</label
                    >
                    <input
                      type="number"
                      min="-200"
                      .value=${seg.gap != null ? seg.gap : 12}
                      @change=${(e) =>
                        this._setSegmentProp(si, "gap", Number(e.target.value))}
                    />
                  </div>
                  <div class="row">
                    <label>Min height (px)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="auto"
                      .value=${seg.min_height || ""}
                      @change=${(e) =>
                        this._setSegmentProp(
                          si,
                          "min_height",
                          e.target.value ? Number(e.target.value) : undefined
                        )}
                    />
                  </div>
                </div>

                ${seg.show_border
                  ? html`
                      <div class="row-inline">
                        <div class="row">
                          <label>Border width (px)</label>
                          <input
                            type="number"
                            min="0"
                            .value=${seg.border_width != null
                              ? seg.border_width
                              : 1}
                            @change=${(e) =>
                              this._setSegmentProp(
                                si,
                                "border_width",
                                Number(e.target.value)
                              )}
                          />
                        </div>
                        <div class="row">
                          <label>Border radius (px)</label>
                          <input
                            type="number"
                            min="0"
                            .value=${seg.border_radius != null
                              ? seg.border_radius
                              : 8}
                            @change=${(e) =>
                              this._setSegmentProp(
                                si,
                                "border_radius",
                                Number(e.target.value)
                              )}
                          />
                        </div>
                        <div class="row">
                          <label>Border color</label>
                          <input
                            type="text"
                            placeholder="var(--divider-color)"
                            .value=${seg.border_color || ""}
                            @change=${(e) =>
                              this._setSegmentProp(
                                si,
                                "border_color",
                                e.target.value
                              )}
                          />
                        </div>
                      </div>
                    `
                  : ""}

                <div class="items">
                  ${(seg.items || []).map(
                    (item, ii) => html`
                      <div class="item-editor">
                        <div class="item-header">
                          <span
                            class="chevron"
                            @click=${() => this._toggleItemCollapse(si, ii)}
                            >${this._collapsedItems.has(`${si}-${ii}`)
                              ? "▸"
                              : "▾"}</span
                          >
                          <span
                            class="item-title"
                            @click=${() => this._toggleItemCollapse(si, ii)}
                          >
                            ${this._itemLabel(item.type)}
                            ${item.type === "entity" && item.entity
                              ? html`<code>${item.entity}</code>`
                              : item.type === "text" && item.text
                              ? html`<span class="item-preview"
                                  >${item.text.slice(0, 40)}${item.text
                                    .length > 40
                                    ? "…"
                                    : ""}</span
                                >`
                              : ""}
                          </span>
                          <span class="item-actions">
                            <button @click=${() => this._moveItem(si, ii, -1)}>
                              ↑
                            </button>
                            <button @click=${() => this._moveItem(si, ii, 1)}>
                              ↓
                            </button>
                            <button @click=${() => this._removeItem(si, ii)}>
                              ✕
                            </button>
                          </span>
                        </div>

                        ${this._collapsedItems.has(`${si}-${ii}`)
                          ? ""
                          : item.type === "text"
                          ? html`
                              <textarea
                                rows="3"
                                placeholder="Markdown text — **bold**, *italic*, lists, links, etc. Supports Jinja templates, e.g. {{ states('sensor.x') }}"
                                .value=${item.text || ""}
                                @change=${(e) =>
                                  this._setItemProp(
                                    si,
                                    ii,
                                    "text",
                                    e.target.value
                                  )}
                              ></textarea>
                              <div class="row-inline">
                                <div class="row">
                                  <label>Style</label>
                                  <select
                                    .value=${item.style || "body"}
                                    @change=${(e) =>
                                      this._setItemProp(
                                        si,
                                        ii,
                                        "style",
                                        e.target.value
                                      )}
                                  >
                                    ${["header", "subtitle", "body"].map(
                                      (v) =>
                                        html`<option value=${v}>${v}</option>`
                                    )}
                                  </select>
                                </div>
                                <div class="row">
                                  <label>Font size (px)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="default"
                                    .value=${item.font_size || ""}
                                    @change=${(e) =>
                                      this._setItemProp(
                                        si,
                                        ii,
                                        "font_size",
                                        e.target.value
                                          ? Number(e.target.value)
                                          : undefined
                                      )}
                                  />
                                </div>
                              </div>

                              <label>
                                <input
                                  type="checkbox"
                                  .checked=${!!item.fill_segment}
                                  @change=${(e) =>
                                    this._setItemProp(
                                      si,
                                      ii,
                                      "fill_segment",
                                      e.target.checked
                                    )}
                                />
                                Fill segment — stretch to exactly match
                                the segment's own width and height
                              </label>
                              ${!item.fill_segment
                                ? html`
                                    ${this._renderPositionFields(si, ii, item)}
                                    <div class="row-inline">
                                      <div class="row">
                                        <label
                                          >Width (px) — capped to the
                                          segment</label
                                        >
                                        <input
                                          type="number"
                                          min="0"
                                          max=${seg.width != null
                                            ? seg.width
                                            : undefined}
                                          placeholder="auto"
                                          .value=${item.width || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "width",
                                              e.target.value
                                                ? this._clampToSegment(
                                                    Number(e.target.value),
                                                    seg.width
                                                  )
                                                : undefined
                                            )}
                                        />
                                      </div>
                                      <div class="row">
                                        <label
                                          >Height (px) — capped to the
                                          segment</label
                                        >
                                        <input
                                          type="number"
                                          min="0"
                                          max=${seg.height != null
                                            ? seg.height
                                            : undefined}
                                          placeholder="auto"
                                          .value=${item.height || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "height",
                                              e.target.value
                                                ? this._clampToSegment(
                                                    Number(e.target.value),
                                                    seg.height
                                                  )
                                                : undefined
                                            )}
                                        />
                                      </div>
                                    </div>
                                  `
                                : ""}
                            `
                          : item.type === "spacer"
                          ? html`
                              <div class="row">
                                <label>Size (px, blank = flexible/auto)</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="flexible"
                                  .value=${item.size || ""}
                                  @change=${(e) =>
                                    this._setItemProp(
                                      si,
                                      ii,
                                      "size",
                                      e.target.value
                                        ? Number(e.target.value)
                                        : undefined
                                    )}
                                />
                              </div>
                            `
                          : item.type === "break"
                          ? html`
                              <div class="hint">
                                Forces the next item onto a new line (segment
                                must have Wrap items enabled).
                              </div>
                            `
                          : html`
                              <ha-entity-picker
                                .hass=${this.hass}
                                .value=${item.entity || ""}
                                @value-changed=${(e) =>
                                  this._setItemProp(
                                    si,
                                    ii,
                                    "entity",
                                    e.detail.value
                                  )}
                              ></ha-entity-picker>

                              <div class="row">
                                <label>On tap</label>
                                <select
                                  .value=${this._itemTapMode(item)}
                                  @change=${(e) =>
                                    this._setItemTapMode(
                                      si,
                                      ii,
                                      e.target.value
                                    )}
                                >
                                  <option value="auto">
                                    Default (more-info, unless the card has
                                    its own tap action)
                                  </option>
                                  <option value="more_info">
                                    Always open more-info
                                  </option>
                                  <option value="toggle">
                                    Toggle (press and hold for more-info)
                                  </option>
                                  <option value="none">
                                    Do nothing (defer to card tap action)
                                  </option>
                                </select>
                              </div>

                              <div class="section-title">Appearance</div>

                              <input
                                type="text"
                                placeholder="Name override"
                                .value=${item.name || ""}
                                @change=${(e) =>
                                  this._setItemProp(
                                    si,
                                    ii,
                                    "name",
                                    e.target.value
                                  )}
                              />

                              <input
                                type="text"
                                placeholder="Icon override (mdi:...), any state"
                                .value=${item.icon || ""}
                                @change=${(e) =>
                                  this._setItemProp(
                                    si,
                                    ii,
                                    "icon",
                                    e.target.value
                                  )}
                              />
                              <div class="row-inline">
                                <div class="row">
                                  <label>Icon override when ON</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. mdi:lightbulb-on"
                                    .value=${item.icon_on || ""}
                                    @change=${(e) =>
                                      this._setItemProp(
                                        si,
                                        ii,
                                        "icon_on",
                                        e.target.value
                                      )}
                                  />
                                </div>
                                <div class="row">
                                  <label>Icon override when OFF</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. mdi:lightbulb-off"
                                    .value=${item.icon_off || ""}
                                    @change=${(e) =>
                                      this._setItemProp(
                                        si,
                                        ii,
                                        "icon_off",
                                        e.target.value
                                      )}
                                  />
                                </div>
                              </div>

                              <input
                                type="text"
                                placeholder="Color override (css color, any state)"
                                .value=${item.color || ""}
                                @change=${(e) =>
                                  this._setItemProp(
                                    si,
                                    ii,
                                    "color",
                                    e.target.value
                                  )}
                              />
                              <div class="row-inline">
                                <div class="row">
                                  <label>Icon color when ON</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. #fdd835"
                                    .value=${item.color_on || ""}
                                    @change=${(e) =>
                                      this._setItemProp(
                                        si,
                                        ii,
                                        "color_on",
                                        e.target.value
                                      )}
                                  />
                                </div>
                                <div class="row">
                                  <label>Icon color when OFF</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. #44739e"
                                    .value=${item.color_off || ""}
                                    @change=${(e) =>
                                      this._setItemProp(
                                        si,
                                        ii,
                                        "color_off",
                                        e.target.value
                                      )}
                                  />
                                </div>
                              </div>

                              <div class="section-title">
                                Fill &amp; Position
                              </div>

                              <label>
                                <input
                                  type="checkbox"
                                  .checked=${!!item.fill_segment}
                                  @change=${(e) =>
                                    this._setItemProp(
                                      si,
                                      ii,
                                      "fill_segment",
                                      e.target.checked
                                    )}
                                />
                                Fill segment — stretch to exactly match
                                the segment's own width and height
                              </label>
                              ${!item.fill_segment
                                ? html`
                                    ${this._renderPositionFields(si, ii, item)}
                                    <div class="row-inline">
                                      <div class="row">
                                        <label
                                          >Width (px) — capped to the
                                          segment</label
                                        >
                                        <input
                                          type="number"
                                          min="0"
                                          max=${seg.width != null
                                            ? seg.width
                                            : undefined}
                                          placeholder="auto"
                                          .value=${item.width || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "width",
                                              e.target.value
                                                ? this._clampToSegment(
                                                    Number(e.target.value),
                                                    seg.width
                                                  )
                                                : undefined
                                            )}
                                        />
                                      </div>
                                      <div class="row">
                                        <label
                                          >Height (px) — capped to the
                                          segment</label
                                        >
                                        <input
                                          type="number"
                                          min="0"
                                          max=${seg.height != null
                                            ? seg.height
                                            : undefined}
                                          placeholder="auto"
                                          .value=${item.height || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "height",
                                              e.target.value
                                                ? this._clampToSegment(
                                                    Number(e.target.value),
                                                    seg.height
                                                  )
                                                : undefined
                                            )}
                                        />
                                      </div>
                                    </div>
                                  `
                                : ""}

                              <div class="row">
                                <label
                                  >Padding around this item (px) — box
                                  never grows past its content regardless
                                  of segment width</label
                                >
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="1"
                                  .value=${item.padding != null
                                    ? item.padding
                                    : ""}
                                  @change=${(e) =>
                                    this._setItemProp(
                                      si,
                                      ii,
                                      "padding",
                                      e.target.value !== ""
                                        ? Number(e.target.value)
                                        : undefined
                                    )}
                                />
                              </div>

                              <div
                                class="subsection-header"
                                @click=${() =>
                                  this._toggleSubsection(`${si}-${ii}-icon`)}
                              >
                                <span class="chevron"
                                  >${this._collapsedSubsections.has(
                                    `${si}-${ii}-icon`
                                  )
                                    ? "▸"
                                    : "▾"}</span
                                >
                                <span class="section-title">Icon</span>
                              </div>
                              ${!this._collapsedSubsections.has(
                                `${si}-${ii}-icon`
                              )
                                ? html`
                                    <div class="row">
                                      <label>Icon position</label>
                                      <select
                                        .value=${item.icon_position ||
                                        "left"}
                                        @change=${(e) =>
                                          this._setItemProp(
                                            si,
                                            ii,
                                            "icon_position",
                                            e.target.value === "left"
                                              ? undefined
                                              : e.target.value
                                          )}
                                      >
                                        <option value="left">
                                          Left of text
                                        </option>
                                        <option value="right">
                                          Right of text
                                        </option>
                                      </select>
                                    </div>

                                    <div class="row-inline">
                                      <div class="row">
                                        <label>Icon size (px)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="22"
                                          .value=${item.icon_size || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "icon_size",
                                              e.target.value
                                                ? Number(e.target.value)
                                                : undefined
                                            )}
                                        />
                                      </div>
                                      <div class="row">
                                        <label
                                          >Icon zoom — crops the icon's
                                          own built-in whitespace, doesn't
                                          affect Gap spacing</label
                                        >
                                        <input
                                          type="number"
                                          min="1"
                                          max="3"
                                          step="0.1"
                                          placeholder="1.0"
                                          .value=${item.icon_zoom || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "icon_zoom",
                                              e.target.value
                                                ? Number(e.target.value)
                                                : undefined
                                            )}
                                        />
                                      </div>
                                    </div>

                                    <div class="row">
                                      <label>Flip icon</label>
                                      <select
                                        .value=${item.icon_flip || "none"}
                                        @change=${(e) =>
                                          this._setItemProp(
                                            si,
                                            ii,
                                            "icon_flip",
                                            e.target.value === "none"
                                              ? undefined
                                              : e.target.value
                                          )}
                                      >
                                        <option value="none">
                                          Don't flip
                                        </option>
                                        <option value="horizontal">
                                          Horizontal (mirror left/right)
                                        </option>
                                        <option value="vertical">
                                          Vertical (mirror up/down)
                                        </option>
                                        <option value="both">
                                          Both (180° flip)
                                        </option>
                                      </select>
                                    </div>

                                    <label>
                                      <input
                                        type="checkbox"
                                        .checked=${item.show_icon !== false}
                                        @change=${(e) =>
                                          this._setItemProp(
                                            si,
                                            ii,
                                            "show_icon",
                                            e.target.checked
                                          )}
                                      />
                                      Show icon
                                    </label>
                                    ${item.show_icon !== false
                                      ? html`
                                          <div class="row-inline">
                                            <div class="row">
                                              <label
                                                >Icon X offset (px)</label
                                              >
                                              <input
                                                type="number"
                                                placeholder="0"
                                                .value=${item.icon_offset_x ||
                                                ""}
                                                @change=${(e) =>
                                                  this._setItemProp(
                                                    si,
                                                    ii,
                                                    "icon_offset_x",
                                                    e.target.value
                                                      ? Number(
                                                          e.target.value
                                                        )
                                                      : undefined
                                                  )}
                                              />
                                            </div>
                                            <div class="row">
                                              <label
                                                >Icon Y offset (px)</label
                                              >
                                              <input
                                                type="number"
                                                placeholder="0"
                                                .value=${item.icon_offset_y ||
                                                ""}
                                                @change=${(e) =>
                                                  this._setItemProp(
                                                    si,
                                                    ii,
                                                    "icon_offset_y",
                                                    e.target.value
                                                      ? Number(
                                                          e.target.value
                                                        )
                                                      : undefined
                                                  )}
                                              />
                                            </div>
                                          </div>
                                        `
                                      : ""}
                                  `
                                : ""}


                              <div
                                class="subsection-header"
                                @click=${() =>
                                  this._toggleSubsection(`${si}-${ii}-text`)}
                              >
                                <span class="chevron"
                                  >${this._collapsedSubsections.has(
                                    `${si}-${ii}-text`
                                  )
                                    ? "▸"
                                    : "▾"}</span
                                >
                                <span class="section-title">Text</span>
                              </div>
                              ${!this._collapsedSubsections.has(
                                `${si}-${ii}-text`
                              )
                                ? html`
                                    <div class="row">
                                      <label>Text alignment</label>
                                      <select
                                        .value=${item.text_align || "left"}
                                        @change=${(e) =>
                                          this._setItemProp(
                                            si,
                                            ii,
                                            "text_align",
                                            e.target.value === "left"
                                              ? undefined
                                              : e.target.value
                                          )}
                                      >
                                        <option value="left">Left</option>
                                        <option value="center">
                                          Center
                                        </option>
                                        <option value="right">Right</option>
                                      </select>
                                    </div>

                                    <div class="row-inline">
                                      <div class="row">
                                        <label>Name size (px)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="default"
                                          .value=${item.name_size || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "name_size",
                                              e.target.value
                                                ? Number(e.target.value)
                                                : undefined
                                            )}
                                        />
                                      </div>
                                      <div class="row">
                                        <label>State size (px)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="default"
                                          .value=${item.state_size || ""}
                                          @change=${(e) =>
                                            this._setItemProp(
                                              si,
                                              ii,
                                              "state_size",
                                              e.target.value
                                                ? Number(e.target.value)
                                                : undefined
                                            )}
                                        />
                                      </div>
                                    </div>

                                    <label>
                                      <input
                                        type="checkbox"
                                        .checked=${item.show_name !== false}
                                        @change=${(e) =>
                                          this._setItemProp(
                                            si,
                                            ii,
                                            "show_name",
                                            e.target.checked
                                          )}
                                      />
                                      Show name
                                    </label>
                                    ${item.show_name !== false
                                      ? html`
                                          <div class="row-inline">
                                            <div class="row">
                                              <label
                                                >Name X offset (px)</label
                                              >
                                              <input
                                                type="number"
                                                placeholder="0"
                                                .value=${item.name_offset_x ||
                                                ""}
                                                @change=${(e) =>
                                                  this._setItemProp(
                                                    si,
                                                    ii,
                                                    "name_offset_x",
                                                    e.target.value
                                                      ? Number(
                                                          e.target.value
                                                        )
                                                      : undefined
                                                  )}
                                              />
                                            </div>
                                            <div class="row">
                                              <label
                                                >Name Y offset (px)</label
                                              >
                                              <input
                                                type="number"
                                                placeholder="0"
                                                .value=${item.name_offset_y ||
                                                ""}
                                                @change=${(e) =>
                                                  this._setItemProp(
                                                    si,
                                                    ii,
                                                    "name_offset_y",
                                                    e.target.value
                                                      ? Number(
                                                          e.target.value
                                                        )
                                                      : undefined
                                                  )}
                                              />
                                            </div>
                                          </div>
                                        `
                                      : ""}
                                    <label>
                                      <input
                                        type="checkbox"
                                        .checked=${item.show_state !== false}
                                        @change=${(e) =>
                                          this._setItemProp(
                                            si,
                                            ii,
                                            "show_state",
                                            e.target.checked
                                          )}
                                      />
                                      Show state
                                    </label>
                                    ${item.show_state !== false
                                      ? html`
                                          <div class="row-inline">
                                            <div class="row">
                                              <label
                                                >State X offset (px)</label
                                              >
                                              <input
                                                type="number"
                                                placeholder="0"
                                                .value=${item.state_offset_x ||
                                                ""}
                                                @change=${(e) =>
                                                  this._setItemProp(
                                                    si,
                                                    ii,
                                                    "state_offset_x",
                                                    e.target.value
                                                      ? Number(
                                                          e.target.value
                                                        )
                                                      : undefined
                                                  )}
                                              />
                                            </div>
                                            <div class="row">
                                              <label
                                                >State Y offset (px)</label
                                              >
                                              <input
                                                type="number"
                                                placeholder="0"
                                                .value=${item.state_offset_y ||
                                                ""}
                                                @change=${(e) =>
                                                  this._setItemProp(
                                                    si,
                                                    ii,
                                                    "state_offset_y",
                                                    e.target.value
                                                      ? Number(
                                                          e.target.value
                                                        )
                                                      : undefined
                                                  )}
                                              />
                                            </div>
                                          </div>
                                        `
                                      : ""}
                                  `
                                : ""}
                            `}
                      </div>
                    `
                  )}
                </div>

                <div class="add-buttons">
                  <button @click=${() => this._addItem(si, "text")}>
                    + Add Text
                  </button>
                  <button @click=${() => this._addItem(si, "entity")}>
                    + Add Entity
                  </button>
                  <button @click=${() => this._addItem(si, "spacer")}>
                    + Add Spacer
                  </button>
                  <button @click=${() => this._addItem(si, "break")}>
                    + Add Line Break
                  </button>
                </div>
                  `}
              </div>
            `
          )}

          <button class="add-segment" @click=${() => this._addSegment()}>
            + Add Segment
          </button>
        </div>
      `;
    }

    static get styles() {
      return css`
        .editor {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px;
        }
        .row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 6px;
        }
        .row-inline {
          display: flex;
          gap: 10px;
        }
        .row-inline .row {
          flex: 1;
          min-width: 0;
        }
        .segment-quick-toggles {
          gap: 16px;
          margin: -2px 0 6px 0;
        }
        .segment-quick-toggles label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85em;
          opacity: 0.9;
          cursor: pointer;
        }
        .hint {
          font-size: 0.8em;
          opacity: 0.7;
          font-style: italic;
        }
        .section-title {
          font-weight: 700;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          opacity: 0.6;
          margin-top: 6px;
          border-top: 1px solid var(--divider-color, #ccc);
          padding-top: 12px;
        }
        .subsection-header {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          margin-top: 6px;
          border-top: 1px solid var(--divider-color, #ccc);
          padding-top: 12px;
        }
        .subsection-header .section-title {
          margin: 0;
          border: none;
          padding: 0;
        }
        label {
          font-size: 0.85em;
          opacity: 0.8;
        }
        input,
        select {
          padding: 6px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
        }
        textarea {
          padding: 6px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
          font-family: inherit;
          resize: vertical;
        }
        .segment-editor {
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .segment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .segment-move-btn {
          padding: 2px 8px;
          line-height: 1;
        }
        .segment-move-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }
        .segment-title {
          cursor: pointer;
          white-space: nowrap;
        }
        .segment-label-input {
          flex: 1;
          min-width: 0;
        }
        .chevron {
          cursor: pointer;
          display: inline-block;
          width: 1em;
          user-select: none;
          opacity: 0.7;
        }
        .collapsible-header {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 0;
        }
        .item-editor {
          border: 1px dashed var(--divider-color, #ccc);
          border-radius: 6px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 4px 0;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85em;
          gap: 6px;
        }
        .item-title {
          flex: 1;
          min-width: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
          white-space: nowrap;
        }
        .item-title code {
          font-size: 0.95em;
          opacity: 0.8;
        }
        .item-preview {
          opacity: 0.7;
          font-style: italic;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-actions button {
          margin-left: 4px;
        }
        .add-buttons {
          display: flex;
          gap: 8px;
        }
        button {
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--secondary-background-color, #f2f2f2);
        }
        .add-segment {
          align-self: flex-start;
          font-weight: 600;
        }
      `;
    }
  }

    try {
      customElements.define("ha-segmented-entities-card", HaSegmentedEntitiesCard);
      customElements.define(
        "ha-segmented-entities-card-editor",
        HaSegmentedEntitiesCardEditor
      );
    } catch (err) {
      // Already defined (e.g. resource loaded twice) — nothing else to do.
      console.warn("ha-segmented-entities-card: element already defined", err);
      return;
    }

    window.customCards = window.customCards || [];
    window.customCards.push({
      type: "ha-segmented-entities-card",
      name: "HA Segmented Entities Card",
      description:
        "Build a card from aligned segments of text and entities, with domain default icons/colors and per-entity show/hide state.",
      preview: false,
    });

    console.info(
      `%c HA-SEGMENTED-ENTITIES-CARD %c v${CARD_VERSION} `,
      "color: white; background: #039be5; font-weight: 700;",
      "color: #039be5; background: white; font-weight: 700;"
    );
  }

  defineCard(20); // retry for up to ~6 seconds before giving up
})();
