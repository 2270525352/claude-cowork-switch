# Claude 中转切换器

## Register

product — dev tool for switching upstream providers behind a local Claude Desktop gateway. The UI is a control panel, not a marketing surface.

## Users

A single developer (the author), and other technically-fluent users who already maintain `cc-switch` configs. They debug gateway routing on macOS or Windows, comfortable with code, prefer dense information.

## Product purpose

Provide a stable local HTTP gateway at `http://127.0.0.1:8787` that Claude Desktop can be permanently configured against. The UI exists to:

1. List provider channels discovered from `cc-switch.db` / settings / profile files.
2. Switch the active channel atomically, surfacing drift between local state and cc-switch's source of truth.
3. Write the official 3p inference config into Claude Desktop and restart it.
4. Expose gateway diagnostics: bridge API key, request log, health probe state, model-source mode.

## Brand / Aesthetic

**Retro OS** — a 90s personal computer desktop. Teal wallpaper, grey window chrome with 3D bevels, navy title bar with white text, pixelated icons, bottom taskbar with a Start button and clock. The interface feels like a system tool from a 1996 ThinkPad, not a 2026 web app.

Reference touchstones (atmosphere, not pixel-perfect imitation): Windows 95 / NT 4 control panels, Trumpet Winsock dialogs, Norton Utilities, MS-DOS shell, classic Mac OS 9 finder windows (for the spirit of system tooling).

## Tone

- Menu mnemonics with underlines: `文件(F)`, `视图(V)`, `工具(T)`, `帮助(H)`.
- Status bar uses short sentence fragments: `就绪`, `已连接`, `扫描中…`, `读取 cc-switch.db 完成`.
- Dialog buttons are imperative two-word labels: `确定`, `取消`, `刷新`, `应用`.
- No marketing copy. Every word names a thing or describes a state.

## Anti-references (must not look like)

- Stripe/Linear/Vercel light dashboard with rounded cards.
- Generic "developer tool dark mode" with neon accents (that was the failed first attempt).
- Glassmorphism, neumorphism, large hero numbers.
- macOS Big Sur translucency.
- Material Design elevation shadows.

## Strategic principles

1. **System chrome over content cards.** Information lives inside windows with title bars and status bars, not floating cards. Headings exist as window titles, group labels, and column headers.
2. **3D bevels, never shadows.** Every button, panel border, input field, and divider uses two-tone bevels (top-left light / bottom-right dark for raised; inverse for sunken).
3. **Pixel-grid spacing.** Padding is a multiple of 2px. Icons are 16×16 with a limited palette. No subpixel softness.
4. **Snap motion.** Buttons go pressed/released in ≤60ms. No transitions on layout. No animation on hover beyond an immediate bevel inversion when clicked.
5. **Pure system colors.** Teal `#008080`, silver `#C0C0C0`, navy `#000080`, black `#000000`, white `#FFFFFF`. No OKLCH wildness, no gradient flashes.
