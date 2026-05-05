# Visual Language

## Intent

The interface should feel like a serious desktop tool, not a marketing site and not a colorful dashboard. The visual tone is closer to editor chrome than to consumer SaaS.

## Palette

Use a pure monochrome system:

- background: near-black
- foreground: near-white
- surfaces: stepped neutral grays
- borders: slightly lighter than surfaces
- muted text: neutral gray
- focus ring: white or light neutral, never brand color

No green accent should remain in the redesign. If semantic differentiation is needed, use contrast, iconography, weight, labels, and border treatment first.

## Recommended Token Direction

Shadcn should be configured with semantic CSS variables. A target token shape:

```css
:root {
  --background: oklch(0.98 0 0);
  --foreground: oklch(0.12 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.12 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.12 0 0);
  --primary: oklch(0.12 0 0);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.95 0 0);
  --secondary-foreground: oklch(0.2 0 0);
  --muted: oklch(0.95 0 0);
  --muted-foreground: oklch(0.5 0 0);
  --accent: oklch(0.95 0 0);
  --accent-foreground: oklch(0.16 0 0);
  --border: oklch(0.88 0 0);
  --input: oklch(0.88 0 0);
  --ring: oklch(0.2 0 0);
}

.dark {
  --background: oklch(0.11 0 0);
  --foreground: oklch(0.96 0 0);
  --card: oklch(0.14 0 0);
  --card-foreground: oklch(0.96 0 0);
  --popover: oklch(0.14 0 0);
  --popover-foreground: oklch(0.96 0 0);
  --primary: oklch(0.96 0 0);
  --primary-foreground: oklch(0.12 0 0);
  --secondary: oklch(0.18 0 0);
  --secondary-foreground: oklch(0.92 0 0);
  --muted: oklch(0.18 0 0);
  --muted-foreground: oklch(0.68 0 0);
  --accent: oklch(0.2 0 0);
  --accent-foreground: oklch(0.96 0 0);
  --border: oklch(1 0 0 / 0.1);
  --input: oklch(1 0 0 / 0.12);
  --ring: oklch(0.78 0 0);
}
```

The app should likely default to the dark set above.

## Layout Tone

- Full-screen shell with shallow layering
- Narrower content padding than the current UI
- Panels should read as structured workspaces, not large marketing cards
- Use separators and borders more than shadows

## Density

- Default to compact spacing
- Prefer `h-8` and `h-9` control heights
- Prefer `text-xs` and `text-sm` for supporting UI
- Use tighter gaps in toolbars, forms, and tabs

Nothing should feel oversized. If a component looks comfortable on mobile-first SaaS, it is probably too large for this desktop app.

## Typography

- Primary text should be clean and neutral
- Avoid loud display typography in the app shell
- Section titles should be understated
- Meta information should be smaller and lighter, but still readable

Recommended direction:

- UI font: a clean sans or technical neo-grotesk
- mono usage: logs, keyboard shortcuts, generated paths, structured values

## Shape

- Radius should be restrained
- Default target: `--radius` around `0.5rem` or slightly less
- Buttons and inputs should feel precise, not pill-shaped

## Motion

- Keep animations short and quiet
- Favor fade and tiny translate transitions only
- Avoid bounce, pulse, exaggerated spring, and attention-seeking hover effects

## States

- Hover: slight surface lift or border brightening
- Active: darker press state
- Focus: crisp ring with clear keyboard visibility
- Selected: contrast shift, border emphasis, or inset treatment
- Disabled: lower contrast, no blur

## Accessibility

- Preserve strong text contrast
- Do not rely on color alone for error or success states
- Keep keyboard focus obvious on dark surfaces
- Ensure compact controls still hit acceptable click targets
