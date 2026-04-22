# Project UI migration rules

## Goal

Migrate the existing frontend toward an Apple-inspired visual language.

## Keep unchanged

- Do not change backend APIs
- Do not change business logic
- Do not rename routes unless necessary
- Preserve existing component props where possible

## Visual direction

- Use the installed Apple UI skill when making UI decisions
- Prefer light mode by default
- Prefer clean whitespace and strong hierarchy
- Reduce visual noise
- Avoid heavy shadows and flashy gradients
- Avoid excessive animation

## Implementation strategy

1. Audit current design tokens, shared components, layout primitives, and page shells
2. Refactor theme tokens first
3. Update shared primitives second
4. Migrate one representative page first
5. After review, migrate the remaining pages in batches

## Tech constraints

- Prefer CSS variables / Tailwind tokens over hardcoded values
- Reuse existing components first
- Keep diffs small and reviewable
- Do not perform a full rewrite unless explicitly asked

- Prefer CSS variables / Tailwind tokens over hardcoded values
- Reuse existing components first
- Keep diffs small and reviewable
- Do not perform a full rewrite unless explicitly asked
