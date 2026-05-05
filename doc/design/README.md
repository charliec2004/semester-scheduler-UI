# Semester Scheduler UI Redesign

## Goal

Redesign the Electron UI to feel closer to Cursor, the Codex desktop app, and Linear:

- monochrome first
- compact by default
- quiet, precise, and highly legible
- cosmetic only, with no workflow or behavior changes

This redesign should standardize on `shadcn/ui` components and patterns. Existing custom button, input, card, tab, badge, and modal styling should be replaced rather than restyled in place wherever practical.

These docs are based on current `shadcn/ui` guidance pulled via Context7, especially:

- semantic CSS variable theming
- built-in variants before custom styling
- compact sizing such as `size="sm"` where supported

## Design Summary

- Theme: black, white, and neutral gray only
- Surface model: stacked dark surfaces with subtle separation, not colorful contrast blocks
- Density: small controls, tight spacing, controlled padding
- Borders: thin, crisp, and visible; avoid soft colorful glows
- Radius: restrained, generally small to medium
- Motion: minimal and purposeful
- Typography: technical, clean, and understated

## Core Rules

- Use `shadcn/ui` primitives exclusively for interactive UI where a matching component exists.
- Prefer built-in variants like `outline`, `secondary`, `ghost`, `destructive`, and `size="sm"` before adding custom classes.
- Keep all semantic meaning without adding color dependency. Errors, warnings, and status should still read clearly in monochrome.
- Preserve current information architecture and workflows in this phase.
- Do not introduce decorative gradients, saturated accent colors, glassmorphism, or oversized cards.

## Deliverables For The Redesign Phase

- global monochrome token system
- shadcn component installation and normalization
- compact application shell
- redesigned tabs, panels, forms, tables, dialogs, toasts, and empty states
- removal of legacy custom utility classes that duplicate shadcn behavior

## Non-Goals

- changing scheduling logic
- changing app navigation structure
- changing data models or IPC behavior
- adding new product features

## Document Map

- [Visual Language](</Users/charles/Documents/PROJECTS/semester-scheduler-app/doc/design/visual-language.md>)
- [Shadcn Rules](</Users/charles/Documents/PROJECTS/semester-scheduler-app/doc/design/shadcn-rules.md>)
- [Implementation Scope](</Users/charles/Documents/PROJECTS/semester-scheduler-app/doc/design/implementation-scope.md>)
- [Inspiration Research](</Users/charles/Documents/PROJECTS/semester-scheduler-app/doc/design/inspiration-research.md>)
