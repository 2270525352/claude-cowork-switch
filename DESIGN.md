# DESIGN.md — Retro OS system

## Color tokens

Pure 8-bit system palette. No OKLCH, no gradient hero work.

```
--c-desktop      #008080   /* teal wallpaper */
--c-window       #C0C0C0   /* window face / button face */
--c-window-2     #DFDFDF   /* lighter inset surface */
--c-input        #FFFFFF   /* text fields, list views */
--c-bevel-light  #FFFFFF   /* top-left highlight */
--c-bevel-soft   #DFDFDF   /* secondary inner highlight */
--c-bevel-mid    #808080   /* bottom-right shadow */
--c-bevel-dark   #000000   /* outer shadow */
--c-title        #000080   /* active title bar */
--c-title-2      #1084D0   /* gradient stop for title bar */
--c-title-text   #FFFFFF
--c-title-dim    #808080   /* inactive title bar */
--c-text         #000000
--c-text-dim    #404040
--c-text-muted   #808080
--c-link         #0000FF
--c-select       #000080
--c-select-text  #FFFFFF
--c-warn         #804000
--c-danger       #800000
```

## Theme

Light. The scene sentence: *a developer in 1997 has booted a beige tower, double-clicked the "中转控制面板" icon, and the app opened a single window on a teal desktop*. No dark mode.

## Typography

Two families, no fancy webfonts:

- **UI**: `"Pixelated MS Sans Serif", "MS Sans Serif", "Microsoft Sans Serif", Tahoma, Geneva, sans-serif` — pixel-rendered when possible, falls back to Tahoma. Size: 11–12px for body, 11px for menus, 13px for window titles.
- **Mono / Code**: `"MS Gothic", "Courier New", "Lucida Console", monospace` — used for API key, URLs, log entries.

We can ship a webfont version of "W95FA" or use the bundled "Pixelated MS Sans Serif". I'll start with system stack only, font-smoothing off:

```css
font-family: "Pixelated MS Sans Serif", "MS Sans Serif", Tahoma, Geneva, sans-serif;
font-size: 11px;
-webkit-font-smoothing: none;
font-smooth: never;
```

Sizes:

```
title-bar-text   13px bold
menu-item        11px
button-label     11px
column-header    11px bold
list-row         11px
status-bar       11px
small-mono       11px
```

## Bevel recipe

The whole system is built on 2-pixel two-tone borders.

**Raised (buttons, panels, window):**

```css
border-top: 1px solid var(--c-bevel-light);
border-left: 1px solid var(--c-bevel-light);
border-right: 1px solid var(--c-bevel-dark);
border-bottom: 1px solid var(--c-bevel-dark);
box-shadow:
  inset -1px -1px 0 var(--c-bevel-mid),
  inset  1px  1px 0 var(--c-bevel-soft);
```

**Sunken (inputs, listview, status cells):**

```css
border-top: 1px solid var(--c-bevel-mid);
border-left: 1px solid var(--c-bevel-mid);
border-right: 1px solid var(--c-bevel-light);
border-bottom: 1px solid var(--c-bevel-light);
box-shadow:
  inset  1px  1px 0 var(--c-bevel-dark),
  inset -1px -1px 0 var(--c-bevel-soft);
```

**Pressed (active button):**

```css
border-top: 1px solid var(--c-bevel-dark);
border-left: 1px solid var(--c-bevel-dark);
border-right: 1px solid var(--c-bevel-light);
border-bottom: 1px solid var(--c-bevel-light);
box-shadow: inset 1px 1px 0 var(--c-bevel-mid);
padding-top: 1px;
padding-left: 1px;
```

## Layout

One viewport, one big "window" docked just above a fixed taskbar.

```
+--------------------------------------------------+ teal desktop
|  +-- Window ----------------------------------+  |
|  | [Title bar — navy gradient] ____  []  []  X  |
|  | File(F) View(V) Channel(C) Tools(T) Help(H)  |
|  | [Toolbar: Refresh | Configure | Restart |…]  |
|  | +----+-------------------------+----------+  |
|  | | L  |  list-view of providers |  log     |  |
|  | | E  |                         |  panel   |  |
|  | | F  |                         |          |  |
|  | | T  |                         |          |  |
|  | | tree                         |          |  |
|  | +----+-------------------------+----------+  |
|  | [Status bar: ready | active=… | url=… | NUM] |
|  +----------------------------------------------+
|                                                  |
+--------------------------------------------------+
| [Start] | Claude Cowork Switch |             14:32 |  <-- taskbar
+--------------------------------------------------+
```

- Title bar height: 22px.
- Menu bar height: 22px.
- Toolbar height: 30px with 22px buttons + 8px padding.
- Status bar height: 22px.
- Taskbar height: 32px.
- Window content: fills remaining space, internal 3-column grid (180px LEFT | flexible MIDDLE | 280px RIGHT). Collapses to 1-column under 960px.

## Components

| Element | Treatment |
|---|---|
| Window | Outer 2px raised bevel; 3px inner gap; thick body fill `--c-window`. Title bar with linear-gradient `var(--c-title)` → `var(--c-title-2)`, white title text bold 13px. Min/max/close buttons are 16×14 raised bevel squares with 1px black glyphs. |
| Menu bar | Row of buttons, label `文件(F)` with underlined mnemonic. Hover: white text on navy block. No icons in menu items. |
| Toolbar buttons | 22×22 or auto-width text buttons with 2px raised bevel. Active/hover: nothing visual (just cursor). Pressed: bevel inverts. Disabled: text greyed to `--c-text-muted` with 1px white drop. |
| List view (providers) | Sunken white panel; column headers as raised grey bevel cells; rows alternate `#FFFFFF` and `#F4F4F4`. Active row: `--c-select` background + `--c-select-text` foreground. No row striping when row is selected. |
| Selection state | Active row uses navy selection. Hover row shows a 1px dotted black focus rectangle inside the row. |
| Status plate (READY / NO COIN etc.) | Inline pill but flat — 1px black border, 2px padding, no bevel. Uses `--c-warn` text for NO COIN, `--c-danger` for OUT OF SERVICE, `--c-title` text for IN USE. |
| Icons | 16×16 inline SVG with a 4-color palette: black outline, white highlight, mid-grey shadow, optional one accent (yellow #FFFF00 / red #FF0000 / blue #0000FF). `image-rendering: pixelated`. |
| Inputs / select | Sunken white field with black 11px text; small `▼` glyph on selects. |
| Checkbox | 13×13 sunken white square; checked state shows a 1px-stroke black tick. |
| Modal dialog | Smaller window: title bar `[!] 提示` or `[?] 确认`; body with a left-aligned 32×32 icon and right-aligned 11px text; bottom button row with `确定` / `取消`. |
| Taskbar | Fixed bottom row, grey panel with 2px raised top border. Start button raised by default, pressed when Start menu open. Each running "task" is a slightly raised flat button. Right side: notification tray with 1-pixel-bordered cell + clock. |
| Start menu | Vertical panel that pops up from the start button. Left rail with vertical text "Claude Cowork Switch 95". Items use 16×16 icon + label. |

## Motion

Essentially zero. The total animation budget:

- Button `:active` pressed state — instantaneous, no transition.
- Modal appear — opacity 0 → 1 over 90ms, no scale/translate.
- Start menu reveal — clip-path or display toggle, no slide.
- Caret blink in inputs — native.
- Taskbar clock updates each second.

No hover transitions. Hover affordance comes from cursor + sometimes a 1px dotted focus rectangle.

## Accessibility

- Contrast: black text on `--c-window` silver = 12.6:1. Black on white listview rows = 21:1. White on navy title bar = 13.8:1. All pass WCAG AAA.
- Focus visible: 1px dotted black rectangle, 2px inset on focused items. Always rendered.
- Keyboard: tab order follows DOM order; menu mnemonics planned but not wired in this iteration (a future tweak).
- Pixel rendering keeps the font sharp at 1× and 2× DPI. We don't try for retina smoothing.

## Anti-patterns guarded

- No gradient text. Title bar gradient is on the bar, not on text.
- No side-stripe accent borders. Borders are full rectangles.
- No glass blur.
- No emoji.
- No animated hover halos.
- No card grids of identical-icon-plus-label tiles.
