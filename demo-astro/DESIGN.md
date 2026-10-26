# DESIGN.md

**Source system:** `design-md/ibm` (a Carbon-style analysis) in
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md).
I chose it because the page is meant to read as a precise audit instrument. That system is flat, square
and dense, and uses hairlines instead of shadows. Its single accent leaves the colour for the data.

## Adopted
- **Spacing:** 4px base grid (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64), dense by design.
- **Shape:** 0px corners on every button, input, panel and segmented control. The only exception is a
  2px radius on status tags.
- **Elevation:** no drop shadows. Depth comes from a change of surface (`canvas` to `surface-1` to `surface-2`)
  and from 1px hairlines. A 2px rule in ink marks a selected tab and the top of the control panel.
- **Type scale:** light (300) display headline with tight leading. Body is 16/1.5 with small positive
  tracking, 14px for secondary text and 12px for captions. Eyebrows and labels are sentence case, never
  tracked all-caps.
- **Components:**
  - Tabs underline the selected item and have a 48px tap height.
  - Inputs use a bottom rule on a grey field.
  - The primary button is a solid square block.
  - Data tables are hairline-ruled.
- **Voice:** careful and technical. Sentence case throughout.

## Changed
- **No brand identity.** I did not use the brand's blue, its logo, its name or IBM Plex. The chrome is greyscale
  (ink `#161817` on white). Colour is reserved for the data series and for the two verdict states:
  - published `#1f6f5c`
  - proposed `#b4532a`
  - no rule `#8a8f8c`
  - replay `#3b6fb6`
  - rival = ink
  - flag red and clear green, for the verdicts only
- **Faces:** all open licence, self-hosted through `@fontsource`, each with a system fallback.
  - Newsreader (display, light 300, and the italic for the model's quotes)
  - Public Sans (body)
  - Spline Sans Mono (readouts, tabular numerals)
- **Dark theme:** added a full dark palette (the source documents only a light marketing theme). It is
  used under `prefers-color-scheme`, and `data-theme` can override it.
- **Structure carries meaning:**
  - Figures are numbered exhibits.
  - The two auditors are a side-by-side ruling with a strong centre rule.
  - The results are an instrument panel of hairline cells with mono readouts.
- **Motion:** one moment only, made with anime.js. When the shock or a preset is applied, the published line draws in
  and the naive verdict settles into place. There is no motion under `prefers-reduced-motion`, and no
  resting state is invisible.

All tokens live in `src/styles/tokens.css`. Layout and components are in `src/styles/global.css`.
