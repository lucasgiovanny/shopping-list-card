# Shopping List Card

A Home Assistant Lovelace card for any to-do list, built for [Bring!](https://www.home-assistant.io/integrations/bring/).
It is drawn to sit beside the [Daylight Calendar Card](https://github.com/lucasgiovanny/daylight-calendar-card):
no card chrome, dark item cards with a thin colour bar.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=lucasgiovanny&repository=shopping-list-card&category=dashboard)

## Features

- Items sorted alphabetically; completed items stay out of the way
- **Tap** an item to mark it bought — it lingers two seconds with *Undo*
- **Hold** an item to rename it, change its quantity or delete it
- The add field separates the quantity: `2 kg arroz`, `arroz, 2 kg` and `arroz 2kg` all add
  *arroz* with *2 kg* as its description (Bring! shows it as the specification)
- On Bring! lists, a **Going shopping** button notifies the family through Bring!, after a confirmation
- English and Portuguese, following the Home Assistant language

## Installation

HACS → ⋮ → *Custom repositories* → `https://github.com/lucasgiovanny/shopping-list-card`, type
*Dashboard*. Install *Shopping List Card* and reload the browser.

## Usage

```yaml
type: custom:shopping-list-card
entity: todo.supermercado
title: Supermercado
color: "#26A69A"
```

## Options

| Option | Default | Description |
|---|---|---|
| `entity` | — | **Required.** A `todo.*` entity |
| `title` | the entity's name | Header title. `""` hides it |
| `color` | `var(--primary-color)` | Colour of the item bar, ring and buttons |
| `show_shopping_button` | `true` | Show *Going shopping* on Bring! lists |

Theme variables: `--slc-item-background` (item card) and `--slc-control-background` (header buttons).

## Development

The card is a single file, `dist/shopping-list-card.js`, with no build step.

```bash
node --check dist/shopping-list-card.js
npm test
```

## License

[MIT](LICENSE)
