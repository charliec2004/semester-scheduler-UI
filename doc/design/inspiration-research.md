# Inspiration Research

## Scope

This document captures design cues from the official product materials for:

- Cursor
- OpenAI Codex app
- Linear

The goal is not to copy any one product directly. The goal is to extract the shared interface profile that makes these tools feel sharp, calm, and highly usable.

## Sources

- [OpenAI: Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)
- [Cursor product page](https://cursor.com/product)
- [Linear: A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh)

## Shared Profile

Across these products, the strongest recurring traits are:

- dark, neutral surfaces
- low-chroma interface hierarchy
- compact controls
- dense but orderly information layout
- restrained icon use
- clear work area emphasis
- subtle structure using borders and spacing more than shadow or color

## Linear

Linear is the clearest explicit design reference because they describe the refresh principles directly.

From the April 2026 refresh article:

- the interface should feel "familiar and fluid"
- dense information should not become overwhelming
- elements that support navigation should recede
- top tabs became more compact with smaller icon and text sizing
- icon usage was reduced and scaled down
- unnecessary visual treatments were removed
- borders were softened and used more selectively to reduce noise

Practical takeaways for this app:

- make side navigation and shell chrome quieter than the active workspace
- reduce icon size and icon count
- make tabs smaller and tighter
- use fewer separators, but make the remaining ones intentional
- avoid letting every card, row, and action compete equally for attention

## Cursor

Cursor’s official product materials emphasize a "familiar editor" and show a UI that remains visually controlled even when it is dense with agent activity.

Observed from the official product page and demos:

- work is organized into compact task rows and grouped states like "In Progress" and "Ready for Review"
- the interface uses restrained, solid backgrounds instead of decorative effects
- the working pane carries the most contrast and attention
- metadata is small and compressed rather than turned into loud pills
- command entry and task lists are treated as first-class interaction surfaces

Inference from those official demos:

- keep the shell thin and let the content workspace dominate
- compress status rows and action bars
- favor list density over large card blocks
- keep surfaces flat and sober
- use small affordances with crisp hierarchy instead of large, branded emphasis

## OpenAI Codex App

The official Codex app announcement frames the product as "a focused space for multi-tasking with agents" and "a command center for agents."

Observed from the announcement text:

- the product centers on separate threads, project organization, and reviewable changes
- the experience is designed around supervision, switching context, and staying oriented across parallel work
- the positioning favors focus and control over visual flair

Inference from the official framing and app screenshots:

- the app shell should feel operational and quiet
- navigation should support orientation without dominating the screen
- panels should read like tools, not like content cards
- lists, logs, thread summaries, and review states should be compact and scannable
- modal surfaces should feel like system panels with crisp edges and minimal ornament

## Synthesis For Semester Scheduler

The redesign target should combine these ideas into one profile:

- Linear’s compactness and receding navigation
- Cursor’s dense task-oriented shell and subdued surfaces
- Codex’s focused, command-center feel

That means the scheduler should become:

- more monochrome
- more compact
- more border-led
- less icon-heavy
- less card-heavy
- more tabular and operational

## Design Decisions To Carry Forward

- Default the app to a dark monochrome theme
- Use `shadcn/ui` small variants wherever supported
- Make the top navigation compact instead of full-bleed and oversized
- Tone down the header branding block
- Replace colorful status styling with neutral hierarchy plus shape, copy, and contrast
- Prefer panels, tables, and lists over large padded marketing-style cards
- Use motion sparingly and keep it nearly invisible

## Things To Avoid

- bright accent-led layouts
- oversized rounded controls
- heavy drop shadows
- large decorative icon containers
- strong color coding as the primary information system
- generous empty padding that reduces working density
