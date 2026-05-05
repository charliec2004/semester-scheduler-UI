# Implementation Scope

## This Phase

This redesign phase is purely cosmetic. It should preserve:

- tab structure
- data flow
- solver interactions
- keyboard shortcuts
- existing workflows

The goal is to change visual language, density, and component system without changing how the app works.

## Immediate Refactor Targets

The current renderer has custom design utilities and accent-driven styling in:

- app shell
- tab navigation
- settings panel
- toast
- empty state
- drop zone
- forms and badges

Those areas should be moved toward shadcn components and shared tokens first.

## Styling Changes Expected

- replace green accent usage with monochrome tokens
- remove bespoke `.btn`, `.input`, `.card`, `.tab`, and badge styling over time
- centralize theme values into CSS variables compatible with shadcn
- tighten spacing across headers, forms, panels, and nav
- reduce decorative icon treatment in the app header

## Acceptance Criteria

- the app reads as monochrome at first glance
- controls are visibly smaller and cleaner than the current build
- the UI feels consistent across tabs
- shadcn components are the source of truth for interaction styling
- no user-facing workflow changes are introduced

## Visual Benchmark

The app should feel:

- quiet
- surgical
- dense without feeling cramped
- modern without looking trendy

It should not feel:

- colorful
- playful
- soft
- oversized
- marketing-oriented
