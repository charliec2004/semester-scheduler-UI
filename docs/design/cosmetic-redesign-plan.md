# Cosmetic Redesign Plan

## Objective

Redesign the Electron app UI to feel closer to Linear, Cursor, and the OpenAI Codex app while preserving the app’s current structure and workflows.

This is a cosmetic redesign only.

## Hard Constraints

- Do not change the layout or structure of the app.
- Minor presentational adjustments are allowed.
- If a change would become more than minor at the layout level, stop and ask before proceeding.
- Preserve all current tabs, panels, action locations, flows, and interaction logic.
- Use `shadcn/ui` components as the interaction system.
- Keep controls compact, especially buttons, inputs, tabs, badges, dialogs, and sheets.
- Choose a ChatGPT-like product font for the main UI.
- Use icons simply and only where they add clarity.

## Inputs Reviewed

This plan is based on:

- live visual inspection of the current macOS Electron app using Computer Use on May 5, 2026
- official Cursor product materials
- official OpenAI Codex app announcement
- official Linear design refresh notes

References:

- [Cursor](https://cursor.com/)
- [OpenAI Codex app](https://openai.com/index/introducing-the-codex-app/)
- [Linear refresh](https://linear.app/now/behind-the-latest-design-refresh)

## Current UI Audit

The current app is structurally acceptable for this redesign, but the visual language misses the target profile in several ways:

- the UI is organized around a green accent rather than neutral hierarchy
- the top header branding block is larger and louder than necessary
- the tab row is wider and visually heavier than the target products
- cards and dropzones are too padded and too prominent
- the primary UI font reads more like a code editor than a polished product shell
- button and input sizing are larger and softer than the target density
- too much visual emphasis comes from color rather than spacing, border treatment, and contrast
- icon treatments are heavier than needed in some places

## Target Visual Profile

The redesign should feel:

- monochrome
- compact
- calm
- precise
- desktop-native
- operational rather than decorative

The redesign should not feel:

- branded by accent color
- playful
- marketing-oriented
- oversized
- card-heavy
- soft or glowy

## Font Direction

Use a ChatGPT-like product UI font for the main interface.

Planned direction:

- primary UI font: `Geist Sans`
- secondary mono font: `Geist Mono` or existing mono fallback only where useful

Mono should be limited to:

- logs
- shortcut hints
- structured numeric values
- technical metadata where tighter rhythm helps

It should not remain the default font for the entire shell.

## Component System Direction

Standardize on `shadcn/ui` components and shared tokens.

Core components to adopt or normalize:

- `Button`
- `Input`
- `Label`
- `Textarea`
- `Select`
- `Tabs`
- `Card`
- `Dialog`
- `Sheet`
- `DropdownMenu`
- `Tooltip`
- `Badge`
- `Separator`
- `ScrollArea`
- `Table`
- `Checkbox`
- `Switch`
- `Alert`

Rules:

- prefer built-in variants before custom classes
- prefer `size="sm"` where supported
- prefer token-level styling over per-instance color styling
- avoid bespoke replacements when a shadcn primitive already fits

## Non-Structural Redesign Areas

These are in scope because they change appearance, not product structure:

- global color tokens
- font family and type scale
- border contrast and radius
- component density
- spacing rhythm
- icon size and usage
- header visual weight
- tab styling
- card styling
- form styling
- empty state styling
- toast and sheet styling
- hover, focus, selected, disabled, and alert states

## Out of Scope

- changing the tab set
- moving primary actions to new locations
- changing content order inside screens in a meaningful way
- introducing new workflows
- changing solver behavior
- changing store logic or IPC
- redesigning the app into a different information architecture

## Implementation Plan

### Phase 1: Foundation

Goal:
Establish the monochrome visual system and typography without changing structure.

Tasks:

- install or verify the `shadcn/ui` setup path
- align styling around semantic CSS variables
- replace the current accent-led palette with a dark monochrome token system
- set the app to default to the dark token set
- introduce `Geist Sans` as the primary UI font
- reserve mono font usage for technical sub-surfaces only
- set a tighter radius baseline
- standardize focus rings to neutral, crisp visibility

Success criteria:

- the app reads as monochrome at first glance
- body text no longer defaults to a coding font
- focus and border styling feel cleaner and more deliberate

### Phase 2: Core Component Normalization

Goal:
Move the visual language of controls onto compact shadcn primitives.

Tasks:

- normalize buttons to compact shadcn sizing
- normalize inputs and selects to compact shadcn sizing
- replace bespoke card, badge, and tab treatments with shadcn-based equivalents
- standardize icon sizing around compact desktop usage
- replace colorful emphasis with neutral hierarchy and contrast

Success criteria:

- buttons feel closer to Codex density than the current build
- inputs and selects no longer feel oversized
- most interaction styling is driven by shared component primitives

### Phase 3: Shell Restyle

Goal:
Quiet the shell while preserving the exact app structure.

Tasks:

- keep the existing header structure
- reduce the visual weight of the app icon block
- tighten the header height and internal spacing
- shrink secondary header text and reduce contrast
- keep settings and shortcuts in the same location
- make the tab row more compact and less stretched
- reduce icon prominence in navigation

Success criteria:

- the shell recedes behind the content area
- the app feels more like Linear or Codex and less like a themed dashboard
- no structural shell changes were required

### Phase 4: Screen Surface Restyle

Goal:
Apply the compact monochrome system to each existing screen without changing the layout.

Tasks:

- Import:
  tighten cards and dropzones, reduce padding, simplify borders, shrink actions
- Staff:
  simplify empty state styling and compact creation actions
- Departments:
  apply the same density and panel treatment used elsewhere
- Flags & Solve:
  restyle dense forms, alerts, sliders, and grouped panels while preserving the current arrangement
- Results:
  match list, export, and result surfaces to the same neutral system
- Settings:
  keep the same sheet layout, but make it feel like a crisp utility panel

Success criteria:

- each tab feels like the same product
- no screen introduces a special visual language
- spacing is tighter but still readable

### Phase 5: State and Feedback Polish

Goal:
Ensure the app remains clear even after color is reduced.

Tasks:

- redesign warning, success, and error states to rely less on color
- tune selected, hover, active, and disabled states
- reduce loud alert styling
- make toasts and help surfaces feel system-like and quiet
- keep keyboard focus extremely legible on dark surfaces

Success criteria:

- states remain easy to scan in monochrome
- accessibility is preserved
- alerts no longer dominate entire screens visually

### Phase 6: Consistency Pass

Goal:
Remove residual mismatches and confirm compliance with the cosmetic-only constraint.

Tasks:

- compare spacing, radius, and sizing across tabs
- remove leftover green accent usage
- remove custom utility styling that duplicates shadcn behavior
- verify icon sizing and usage consistency
- compare live screens against the target inspiration profile
- confirm that no layout or structure changed in a meaningful way

Success criteria:

- the redesign feels intentional rather than partially migrated
- the app remains recognizably the same product structurally
- any remaining changes are clearly cosmetic

## Implementation Order

Recommended execution order:

1. global tokens and font
2. shadcn component setup and normalization
3. header and tab chrome
4. cards, forms, and dropzones
5. settings sheet and overlays
6. states, feedback, and consistency cleanup

## Acceptance Criteria

The redesign is successful when:

- the app remains structurally the same
- the entire interface reads as black, white, and neutral gray
- the shell feels quieter than the main content
- controls are noticeably smaller and cleaner
- typography feels closer to ChatGPT/Codex product UI than to a developer terminal
- shadcn components are the source of truth for interaction styling
- icons are simple, sparse, and useful
- there are no unauthorized non-minor layout changes

## Risk Controls

- If compact sizing causes clipping, overflow, or label truncation beyond minor tuning, pause and fix locally without changing structure.
- If any screen only works visually after a structural move, stop and ask before proceeding.
- If shadcn adoption conflicts with an existing pattern, preserve behavior and migrate visually first.

## First Execution Slice

The first implementation slice should cover:

- semantic monochrome theme tokens
- primary font migration to `Geist Sans`
- compact shadcn button, input, select, tab, and card primitives

That slice changes the app’s overall feel quickly while staying safely inside the cosmetic-only boundary.
