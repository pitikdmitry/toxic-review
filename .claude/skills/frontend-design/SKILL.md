---
name: frontend-design
description: Design rules for building frontend UI. Invoke when creating or modifying React components, pages, layouts, or forms in the frontend (e.g. "add a modal", "build the settings page", "create a card component", "redesign the header", "add a form for X").
argument-hint: <component-or-page>
---

# Frontend Design Rules

## Before You Build

1. Check `src/components/` — extend, don't duplicate.
2. Check existing constants (`SEVERITY_COLORS`, `CRINGE_LABELS`) before inventing new ones.
3. Verify both themes. No hardcoded hex.
4. Default: more whitespace, less color, match existing components. Unsure? Pick the larger spacing, leave out the extra treatment.

## Type Scale

- **Hero** (h1): `text-4xl font-bold tracking-tight leading-tight`.
- **Page title**: `text-2xl font-bold tracking-tight`.
- **Section label**: `text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]`.
- **Card title**: `text-lg font-semibold leading-snug`.
- **Body**: `text-sm leading-relaxed`. Long-form: `text-base leading-relaxed`.
- **Meta/captions**: `text-xs text-[var(--text-tertiary)]`.
- Skip at least one weight step between heading and body. 500 next to 600 looks muddy.
- Three text-color tiers: `--text-primary`, `--text-secondary`, `--text-tertiary`. A 4th tier means your hierarchy is broken.
- Clamp AI/user text in cards: `line-clamp-2` or `line-clamp-3`. Prose blocks: `max-w-prose`.

## Spacing

Everything on a 4px grid.

- **Card padding**: `p-4` dense lists, `p-5`/`p-6` standalone. Padding ≥ 1.5× inner gap. Never `p-3` on content cards.
- **Proximity**: related items `mt-1`/`mt-2`. New sections `mt-4`. Actions `mt-6`.
- **Sections**: `py-8` small, `py-12`–`py-16` major. Hero: `py-16`–`py-24`.
- **Compact rows** (sidebar, lists): `px-4 py-3` minimum.
- **The Schoger rule**: start with too much whitespace, then reduce. You'll always undershoot going the other direction.

## Color

- `var(--*)` only. Never hardcode hex.
- **60-30-10**: 60% neutral (`--bg-primary/secondary`), 30% structural (`--bg-card`, borders), 10% accent. More than 2 accent elements per card = too much.
- **Tokens**: `--accent`, `--accent-hover`, `--accent-soft` (8%), `--accent-glow` (12-15%), `--orange` (warmth — slider, toggle).
- **Gradients**: `gradient-brand` (purple→blue→orange), `gradient-brand-text` (text clip).
- **Status colors** via Tailwind, always dual-theme: `bg-red-500/10 text-red-600 dark:text-red-400`.
- **Hover bg**: `hover:bg-[var(--bg-secondary)]` or `hover:bg-[var(--bg-tertiary)]`. Don't put Tailwind opacity modifiers on hex CSS vars — it breaks.

## Depth & Shadows

Dark mode depth = lighter backgrounds, not shadows. Surface stack: `--bg-primary` → `--bg-secondary` → `--bg-tertiary` → `--bg-card`.

- **Light mode**: two shadow layers minimum. Single-layer looks flat. Opacity 0.08–0.12 max — if the shadow is the first thing you notice, it's too heavy.
- **Dark mode**: borders do the work. `border-[var(--border-primary)]` default, `border-[var(--border-secondary)]` for dense lists.
- **Elevation**: flat → cards (border only) → dropdowns (`shadow-md` + border) → modals (`shadow-xl`). Four levels max.
- **Accent glow**: `shadow-[0_0_15px_var(--accent-glow)]` on the single most important CTA. One per viewport.
- Before adding a border: try more spacing → different bg → subtle shadow.

## Cards

- **Default**: `rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)]`. Feed cards use `p-4` + left-border accent with `--border-secondary`.
- **Premium card trick**: `border-t border-t-[rgba(255,255,255,0.04)]` — faint top-edge highlight simulates overhead light.
- **Hover** (standalone): `hover:border-[var(--accent)]/30 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200`. Dense lists: skip the lift, just brighten border.
- **Nesting**: inner radius = outer radius − padding. `rounded-xl` card → inner elements `rounded-lg`. Inner bg one tier up (`--bg-secondary` inside `--bg-card`).
- **Card-as-link**: `<Link>` wrapper + `group`. Children use `group-hover:` (arrow nudge: `group-hover:translate-x-0.5`).
- Max 3–4 treatments per card. A 5th makes it noisy.

## Buttons

One primary per visible area. Five levels:

- **Primary**: `bg-[var(--accent)] text-white rounded-lg px-4 py-2.5 font-medium hover:bg-[var(--accent-hover)] active:scale-[0.98]`
- **Secondary**: `border border-[var(--border-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)]`
- **Ghost**: `text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]`
- **Link**: `text-[var(--text-tertiary)] hover:text-[var(--accent)]`
- **Destructive**: `bg-red-600 text-white hover:bg-red-700` — always with confirmation.

All buttons: `active:scale-[0.98]` + `focus-visible:ring-2 focus-visible:ring-[var(--accent)]` (`ring-red-500` for destructive). Existing buttons lack these — add on new/modified components.

## Badges

Muted backgrounds, not solid. `bg-red-500/10 text-red-600 dark:text-red-400`.

- **Standard**: `text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md`.
- **Pill** (counts): `text-xs font-medium px-2 py-0.5 rounded-full`.
- **Dot**: `w-1.5 h-1.5 rounded-full bg-current` before text.
- Multiple badge colors on one card: all muted (10% bg). One filled element per card max.

## Icons

`lucide-react`. Inline SVG only for custom glyphs (vote arrows).

- Size = line-height, not font-size. `text-sm` → `w-4 h-4`. `text-base` → `w-5 h-5`.
- Gap: `gap-1.5` (small text), `gap-2` (base text).
- Icon-only buttons: `aria-label` + `before:absolute before:inset-[-8px]` for 44px hit area.
- Icon-only for toolbars/row actions. Icon+text for primary actions. Text-only for destructive actions.

## Inputs

- **Standalone**: `rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2.5 text-base`. Focus: `focus:ring-2 focus:ring-[var(--accent-glow)] focus:border-[var(--accent)]`.
- **Composite** (like PRInput): border/focus on wrapper (`focus-within:`), transparent input inside.
- Label above input: `text-sm font-medium text-[var(--text-primary)] mb-1.5`. Never placeholder-as-label.
- Error: `border-red-500 focus:ring-red-500/40` + `aria-invalid="true"`.
- Field spacing: `space-y-5`. Actions at `mt-6`.

## Modals

- **Backdrop**: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50`.
- **Dialog**: `bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6`.
- Structure: title (`text-lg font-semibold`) + close `X` top-right → body (`mt-4`) → footer (`mt-6 flex justify-end gap-3`).

## States

- **Loading**: CSS spinner (`h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent`). Content areas: skeleton (`bg-[var(--bg-tertiary)] animate-pulse rounded`).
- **Empty**: icon in `w-14 h-14 rounded-full bg-[var(--accent-soft)]` + `text-lg font-semibold` headline + `text-sm text-[var(--text-secondary)] max-w-sm` body. Optional CTA.
- **Error**: message + retry button.

## Dark Mode

- Tinted grays — pure gray is dead on dark.
- Never pure white text. `--text-primary` is ~87% opacity equivalent.
- Accent as light source: `--accent-soft` hover bg creates ambient glow.
- Borders at ~8% white opacity. If they're the loudest thing on screen, they're too heavy.
- Dark mode accent: `#a78bfa` (lighter, less saturated than light `#7c3aed`). Status colors desaturated via `dark:text-{color}-400`.

## Pixel Art & Personas

All images are **pixel art**. No photos, no flat vector, no AI photorealism.

**Art direction**: 64×64 or 128×128 canvas. SNES/GBA-era portraits, not 8-bit sprites. Personas are real people (Gordon Ramsay, Simon Cowell) — exaggerate 1–2 signature traits for instant recognition. Max 16–24 colors per character, shared base palette across all personas. Each persona gets a neutral + cringe-escalating expressions (separate assets, not CSS tricks). Transparent PNG always.

**Rendering**: `image-rendering: pixelated` is mandatory (`.pixel-art` utility in `globals.css`). PNG only — JPEG/WebP destroys edges. Next.js `<Image>` with `unoptimized` (optimizer blurs pixel art). Files at `public/personas/{name}/{expression}.png`.

**Display sizes**:
- **Avatar** (cards): `w-10 h-10` or `w-12 h-12`. `rounded-lg`, not `rounded-full` — circles clip pixel art badly. `border-2 border-[var(--border-primary)]`.
- **Profile** (detail/hero): `w-20 h-20` to `w-28 h-28`. `rounded-xl`. Optional `ring-2 ring-[var(--accent-soft)]`.
- **Cringe selector**: `w-8 h-8`, swap expression on level change with `transition-opacity duration-200` crossfade.
- **Frame trick**: wrap in `bg-[var(--bg-tertiary)] rounded-lg p-1` — pixel art looks intentional, not dropped in.
- **Fallback**: `bg-[var(--accent-soft)]` square + initials in `text-sm font-bold text-[var(--accent)]`.

## Animation

- Colors: `transition-colors duration-150`.
- Transforms: `transition-all duration-200 ease-out`. Never ease-in.
- Modals: `duration-300` enter, `duration-200` exit.
- Arrow nudge: `group-hover:translate-x-0.5 transition-transform duration-200`.

## Responsive

Mobile-first. Base = 375px, then `sm:` `md:` `lg:`.

- Hero: `text-2xl sm:text-3xl md:text-4xl`. Padding: `py-8 sm:py-12 md:py-16`.
- Two-column stacks below `lg`. Sidebar goes under main.
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- Meta rows: `flex-wrap` always — wrapping is fine on mobile.

## Visual Limits

| Constraint | Max |
|---|---|
| Font sizes per page | 4 |
| Font weights | 3 (400, 600, 700) |
| Colors per component | 3 |
| Treatments per card | 3–4 |
| Border radii | 4 (`rounded-md`, `lg`, `xl`, `full`) |
| Shadow levels | 4 |
| Primary CTAs per viewport | 1 |

## Recipes

**Feed card**: `flex gap-3`. Left: vote/score (`shrink-0`). Right: `min-w-0 flex-1` → title → body → meta (`flex items-center gap-3 flex-wrap`).

**Sidebar item**: `px-4 py-2.5 hover:bg-[var(--accent-soft)] rounded-lg transition-colors cursor-pointer`.

**Two-column**: `flex flex-col lg:flex-row gap-6`. Main: `flex-1 min-w-0`. Sidebar: `w-[280px] shrink-0 lg:sticky lg:top-20`.

## Code

- `"use client"` everywhere. Props: `{Name}Props`. Callbacks: `onX`.
- Components: `src/components/{Name}.tsx` (named export). Pages: `src/app/{route}/page.tsx` (default export).
- API: `lib/api.ts` `request<T>`. Types: `@/types`. Theme: `next-themes`.
- `.pixel-art { image-rendering: pixelated; }` in `globals.css`.
- Diff classes: `diff-line-addition`, `diff-line-deletion`, `diff-line-hunk`. Extend, don't override.
- `SEVERITY_COLORS` (CommentCard + DiffView) and `CRINGE_LABELS` (CommentCard + PRInput) are duplicated — extract when touching.
- Header `z-50`. Container `max-w-7xl mx-auto px-4`.
