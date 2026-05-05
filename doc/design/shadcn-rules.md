# Shadcn Rules

## Standard

The redesign should use `shadcn/ui` as the UI system, not just as inspiration.

- prefer copied shadcn components over bespoke primitives
- prefer component composition over one-off utility stacks
- prefer semantic tokens over hard-coded colors
- prefer built-in variants and sizes before custom overrides

## Component Policy

When a matching shadcn component exists, use it.

Expected core set for this app:

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

If a UI need is not covered directly, compose from shadcn primitives first.

## Sizing

Compact is the default.

- use `size="sm"` for buttons wherever possible
- use compact input/select heights
- use smaller icon sizes, generally `h-4 w-4`
- keep tab triggers short and tight
- prefer narrow toolbars over spacious action rows

Large controls should be opt-in and rare.

## Variant Guidance

- Primary action: `Button` with default or equivalent high-contrast treatment
- Secondary action: `secondary`
- Tertiary action: `ghost`
- Structural action rows and toolbars: mostly `ghost` and `outline`
- Destructive action: `destructive`, but still visually restrained

Avoid inventing a custom variant unless there is repeated product value.

## Styling Guidance

- Start from shadcn defaults, then tune tokens and shared component classes
- Avoid per-instance styling unless necessary
- Avoid colorful focus states, colorful badges, and colorful empty states
- Border and background contrast should do most of the work

## Mapping From Current UI

Current custom classes should migrate approximately as follows:

- `.btn-*` -> `Button`
- `.input` -> `Input`, `Textarea`, `Select`
- `.card` -> `Card`
- custom tab buttons -> `Tabs`, `TabsList`, `TabsTrigger`
- custom badge classes -> `Badge`
- custom tooltip classes -> `Tooltip`
- custom modal/panel treatments -> `Dialog` or `Sheet`

## Desktop Shell Notes

- Header should become slimmer and more neutral
- Tab navigation should feel like editor navigation, not marketing tabs
- Settings entry point should become a small ghost or outline icon button
- Toasts and dialogs should feel like system panels with crisp boundaries

## Anti-Patterns

- large rounded cards everywhere
- oversized primary buttons
- bright accent color as the organizing principle
- heavy drop shadows
- custom utility classes that duplicate available shadcn primitives
- decorative hero-style spacing inside normal productivity screens
