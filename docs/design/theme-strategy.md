# Light/Dark Theme Strategy

This document defines the implementation plan for adding light and dark mode to the Electron app without shipping a half-themed UI.

## Goal

Add theme support in a way that:

- preserves the current dark visual quality
- makes light mode first-class rather than a partial inversion
- avoids scattering theme logic across components
- keeps semantic accents consistent across both themes

## Current State

The renderer already has:

- class-based dark mode enabled in Tailwind
- a `:root` token set and a `.dark` token set in CSS
- most structural styling routed through CSS variables for `background`, `foreground`, `card`, `border`, and related semantic tokens

The renderer does not yet have:

- a persisted `theme` preference (`system`, `dark`, `light`)
- a single theme resolver/controller
- Electron window chrome synchronized with the active theme
- a full light-safe token migration for the many `surface-*` usages that still assume dark neutrals

## Hard Rule

Do not expose a public light-mode switch until the token audit is complete enough that the app is legible and coherent in light mode.

Adding a selector too early would create a broken feature rather than a smart rollout.

## Phased Plan

### Phase 1: Theme Infrastructure

Add the non-destructive plumbing:

- extend `AppSettings` with `theme: 'system' | 'dark' | 'light'`
- persist and normalize the setting
- add one renderer-side theme controller that:
  - resolves `system` via `prefers-color-scheme`
  - applies/removes the `.dark` class
  - updates `color-scheme`
  - listens for system theme changes while `theme === 'system'`

Notes:

- keep the app default on `dark` for now to avoid regressions
- do not expose light mode in Settings yet
- keep first-paint dark until a preload/bootstrap sync is added

### Phase 2: Token Audit

Replace dark-only styling assumptions with semantic tokens:

- primary action green
- warning banner and warning surfaces
- destructive surfaces and destructive text
- overlays and modal backdrops
- table headers, separators, and muted text
- titlebar and shell chrome

Priority target:

- remove or reduce hardcoded dark neutrals like `surface-800`, `surface-900`, `surface-950` in places where the value should differ by theme

### Phase 3: Light Theme QA Pass

Verify all major surfaces in both dark and light:

- header and tab bar
- home screen
- import flows and dropzones
- departments and staff tables
- flags forms and warnings
- results states
- settings sheet
- modals and toasts

Specific checks:

- text contrast
- border visibility
- disabled state readability
- warning/error emphasis
- focus ring clarity

### Phase 4: Public Theme Control

Once light mode is visually safe:

- add `Theme` to Settings with `System`, `Dark`, and `Light`
- optionally show the resolved theme when `System` is selected
- make the selection apply live without reload

### Phase 5: Native Window Sync

Synchronize Electron chrome with the resolved theme:

- BrowserWindow background color
- title bar overlay color
- title bar symbol color

This keeps the native shell from clashing with the renderer.

### Phase 6: First-Paint Consistency

Eliminate the initial theme flash by bootstrapping the theme before React mounts.

Likely approach:

- pass a saved theme hint through preload or early inline bootstrap
- set the initial `html` class before the renderer hydrates

## Acceptance Criteria

- dark mode remains visually unchanged or improved
- light mode is readable and intentional across all core screens
- theme changes apply live
- `system` tracks OS theme changes
- Electron chrome stays visually aligned with the resolved theme
- no critical UI depends on hardcoded dark-only colors

## Implementation Order

1. Add persisted theme infrastructure.
2. Audit and semanticize theme-sensitive tokens.
3. QA light mode end-to-end.
4. Expose the public theme selector.
5. Sync native Electron chrome.
6. Add first-paint bootstrapping.
