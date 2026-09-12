# HA Segmented Entities Card

A custom [Home Assistant](https://www.home-assistant.io/) Lovelace card for
building a single card out of independent, freely-arranged **segments** —
each one a row/column of text, entities, spacers, and line breaks with its
own layout, sizing, colors, and position. Includes a full visual editor
(no YAML required), and is built for Home Assistant's modern **Sections**
dashboard view.

## Features

- **Segments** — independent flex containers you arrange inside the card,
  each with its own direction, alignment, gap, size, border, background,
  and position (normal flow or exact pixel placement).
- **Items inside a segment** — entities, free text (with live Jinja
  templating), spacers, and line breaks, each individually sized,
  positioned, and styled.
- **Full visual editor** — every option below is exposed in the card
  editor UI, with collapsible segments/items so a large card doesn't turn
  into a giant form.
- **Sections-view aware** — implements `getGridOptions()` so the card
  works properly with Home Assistant's grid-based Sections dashboards,
  including the built-in drag-to-resize handle.
- Domain-aware default icons and colors, with full override support
  (including separate on/off overrides and true bulb colors for lights).
- Person entities show their own photo automatically.

## Installation

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=drmogie&repository=ha-segmented-entities-card&category=plugin)

1. HACS → Frontend → ⋮ → Custom repositories → add this repository as
   type **Dashboard**.
2. Install **HA Segmented Entities Card** from HACS.
3. Add the resource (HACS usually does this for you). If not, see below.

### Manual

[![Open your Home Assistant instance and show your dashboard resources.](https://my.home-assistant.io/badges/lovelace_resources.svg)](https://my.home-assistant.io/redirect/lovelace_resources/)

1. Copy `ha-segmented-entities-card.js` to
   `<config>/www/ha-segmented-entities-card/ha-segmented-entities-card.js`.
2. Go to **Settings → Dashboards → ⋮ → Resources** and add:
   ```
   /local/ha-segmented-entities-card/ha-segmented-entities-card.js
   ```
   as a **JavaScript Module**.
3. Hard-refresh your browser (Ctrl+Shift+R / Cmd+Shift+R).

> Browsers cache `.js` files aggressively. Whenever you replace the file
> with a new version, bump a cache-busting query string on the resource
> URL (e.g. `...card.js?v=2`) and hard-refresh, or the browser may keep
> serving the old copy.

## Quick start

Add a new card, search for **"HA Segmented Entities Card"**, and use the
visual editor — or paste YAML like this:

```yaml
type: custom:ha-segmented-entities-card
title: Living Room
segments:
  - direction: row
    justify: space-between
    align: center
    wrap: true
    items:
      - type: entity
        entity: light.living_room
      - type: entity
        entity: climate.living_room
  - direction: row
    justify: flex-start
    items:
      - type: text
        text: "**Temperature:** {{ states('sensor.living_room_temp') }}°"
        style: body
```

## Card-level options

| Option | Type | Description |
|---|---|---|
| `title` | string | Card title text. |
| `title_position` | `flow` \| `absolute` | `absolute` lets you place the title with exact pixel offsets instead of normal document flow. |
| `title_top` / `title_bottom` / `title_left` / `title_right` | number (px) | Offsets used only when `title_position: absolute`. |
| `title_width` / `title_height` | number (px) | Explicit title box size. |
| `title_align` | `left` \| `center` \| `right` | Title text alignment. |
| `title_font_size` | number (px) | Title font size. |
| `padding` | number (px) | Card content padding. Set to `0` so segments can reach the card's edges. |
| `hide_border` | boolean | Hides the card's outer border/shadow. |
| `background_color` | CSS color | Card background color. |
| `background_image` | URL | Card background image. |
| `background_size` / `background_position` / `background_repeat` | CSS values | Background image sizing/positioning, used with `background_image`. |
| `hide_unavailable` | boolean | Hides entity items whose state is `unavailable`/`unknown`, card-wide. Segments can override this individually (see below). |
| `tap_action` | action object | Whole-card tap action. Ignored by any item that has its own `tap_action` set. |
| `grid_options` | object | Sections-view sizing — see **Sizing in the Sections view** below. |
| `segments` | array | The list of segments (see below). **Required.** |

## Sizing in the Sections view

This card is built for Home Assistant's grid-based **Sections** dashboard
view. The easiest way to size it is to **drag the card's own resize
handle** from the card editor's "Layout" tab — that writes directly into
`grid_options` for you.

If you'd rather set it in YAML, or in the editor's "Sections View Sizing"
fields:

| Option | Type | Description |
|---|---|---|
| `grid_options.columns` | number (1–12) | Card width in grid columns. Default `12` (full width). |
| `grid_options.rows` | number | Card height in grid rows. Leave unset to let the card size itself to its content — recommended, since height depends on how many segments/items you've configured. |
| `grid_options.min_columns` / `max_columns` | number | Resize-handle bounds for width. |
| `grid_options.min_rows` / `max_rows` | number | Resize-handle bounds for height. |

In non-Sections views (masonry, panel), the card just sizes to its
content automatically.

## Segments

Each entry in `segments:` is an independent flex container.

| Option | Type | Description |
|---|---|---|
| `label` | string | **Editor only** — a note to help you identify the segment. Never shown on the card, and stays visible even when the segment is collapsed in the editor. |
| `direction` | `row` \| `column` | Flex direction of items inside the segment. |
| `justify` | flex `justify-content` value | e.g. `flex-start`, `center`, `space-between`. |
| `align` | flex `align-items` value | e.g. `flex-start`, `center`, `stretch`. |
| `wrap` | boolean | Whether items wrap to a new line. |
| `gap` | number (px) | Space between items. Negative values overlap items. |
| `padding` | number (px) | Inner padding of the segment. |
| `width` / `height` | number (px) | Explicit segment size. |
| `min_height` | number (px) | Minimum segment height. |
| `show_border` | boolean | Draws a border around the segment. |
| `border_color` / `border_width` / `border_radius` | CSS values | Border styling, used with `show_border`. |
| `overflow` | `hidden` (default) \| `visible` | By default nothing inside a segment (an item, a zoomed icon, etc.) can visually escape or be clicked outside the segment's own box. Set to `visible` only if you intentionally want content to overlap into neighboring segments. |
| `position` | `flow` (default) \| `absolute` | `absolute` places the segment with exact pixel offsets inside the card instead of normal document flow. |
| `top` / `bottom` / `left` / `right` | number (px) | Offsets used only when `position: absolute`. |
| `hide_unavailable` | boolean | Overrides the card-level `hide_unavailable` setting for just this segment. Leave unset to inherit the card default. |
| `items` | array | The segment's contents (see below). |

Segments can be reordered with the ▲/▼ buttons in the editor.

## Items

Every item has a `type`: `entity`, `text`, `spacer`, or `break`.

### Common to `entity` and `text` items

| Option | Type | Description |
|---|---|---|
| `fill_segment` | boolean | Stretches the item to exactly match the segment's own width and height. Takes priority over `width`/`height`/`position`. |
| `position` | `flow` (default) \| `absolute` | `absolute` places the item with exact pixel offsets inside the segment, the same mechanism segments use inside the card. |
| `top` / `bottom` / `left` / `right` | number (px) | Offsets used only when `position: absolute`. |
| `width` / `height` | number (px) | Explicit item size. Always capped so the item can never exceed its segment, regardless of what's entered. |
| `padding` | number (px) | Padding around the item. |
| `tap_action` *(entity only)* | action object | See **Tap actions** below. |

Everything inside an item (its icon, its zoomed icon, its resized box) is
clipped to the item's own box, and the item is clipped to its segment's
box — nothing can visually escape or be clicked outside the segment it's
in.

### Entity items (`type: entity`)

```yaml
- type: entity
  entity: light.kitchen
```

| Option | Type | Description |
|---|---|---|
| `entity` | entity ID | **Required.** |
| `name` | string | Overrides the entity's friendly name. |
| `icon` | mdi icon | Overrides the icon for any state. |
| `icon_on` / `icon_off` | mdi icon | Overrides the icon only when the entity is on/off. Takes priority over `icon`. |
| `color` | CSS color | Overrides the icon color for any state. |
| `color_on` / `color_off` | CSS color | Overrides the icon color only when the entity is on/off. Takes priority over `color`. A `light` entity with no color override shows its own actual bulb color (from `rgb_color`/`hs_color`/etc.) when it's on. A `person` entity with no icon override shows its own `entity_picture` photo when it has one. |
| `icon_position` | `left` (default) \| `right` | Which side of the name/state the icon renders on. |
| `icon_size` | number (px) | Icon size. |
| `icon_zoom` | number (1–3) | Scales the icon glyph to crop out its built-in whitespace, without affecting the segment's gap spacing. |
| `icon_flip` | `none` \| `horizontal` \| `vertical` \| `both` | Mirrors the icon glyph. |
| `icon_offset_x` / `icon_offset_y` | number (px) | Nudges the icon from its normal position without affecting sibling layout. |
| `show_icon` | boolean (default `true`) | Whether the icon renders at all. |
| `text_align` | `left` (default) \| `center` \| `right` | Aligns the name/state block within extra width/height the item's box has. Doesn't affect the icon's position. |
| `name_size` / `state_size` | number (px) | Font sizes. |
| `name_offset_x` / `name_offset_y` | number (px) | Nudges the name text. |
| `state_offset_x` / `state_offset_y` | number (px) | Nudges the state text. |
| `show_name` | boolean (default `true`) | Whether the name renders. |
| `show_state` | boolean (default `true`) | Whether the state renders. |

#### Tap actions

`tap_action.action` can be:

- `more-info` — opens the entity's more-info dialog (the default when
  nothing else is configured).
- `toggle` — calls `homeassistant.toggle` on tap; **press-and-hold opens
  more-info instead**, same as tap/hold works elsewhere in Home
  Assistant.
- `none` — item does nothing, letting a card-level `tap_action` (if any)
  handle the tap instead.

```yaml
- type: entity
  entity: switch.fan
  tap_action:
    action: toggle
```

### Text items (`type: text`)

```yaml
- type: text
  text: "**{{ states('sensor.outdoor_temp') }}°** outside"
  style: body
```

| Option | Type | Description |
|---|---|---|
| `text` | string | Markdown content. **Supports live Jinja templates** — e.g. `{{ states('sensor.x') }}` — which update automatically as the referenced entities change, the same way Home Assistant's built-in Markdown card works. |
| `style` | `header` \| `subtitle` \| `body` | Preset text styling. |
| `font_size` | number (px) | Overrides the font size for the chosen style. |

### Spacer items (`type: spacer`)

```yaml
- type: spacer
  size: 20
```

| Option | Type | Description |
|---|---|---|
| `size` | number (px) | Fixed spacer size. Leave blank for a flexible spacer that grows to fill available space. |

### Break items (`type: break`)

Forces a line break inside a wrapping segment. No options.

```yaml
- type: break
```

## Notes

- **Version format**: `YYYY.MM.DD.N` (e.g. `2026.09.12.1`), incrementing
  `N` for additional releases the same day.
- Items and segments are collapsible in the editor for easier navigation
  on cards with a lot of content — collapsed entity items still show
  which entity they're pointing at.
