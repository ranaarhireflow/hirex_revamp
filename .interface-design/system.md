# Hirex Design System

> Source-of-truth for every visual decision. Loads each session — components stay coherent across edits.

## Direction: **Precision & Density**

Hirex is a **B2B recruiter copilot for live interviews** — content-dense, review-style work. The recruiter is scanning, ticking, scoring under time pressure. Visual weight from shadows/gradients would compete with the work.

We borrow from **Linear / Stripe / Notion** — calm slate palette, single blue accent, generous whitespace inside tight type rhythm, borders for depth.

Other directions considered: *Sophistication & Trust* (too cool / corporate for recruiters who skew fast-moving), *Warmth & Approachability* (too consumer), *Data & Analysis* (we have data but it's not the hero).

---

## Color tokens

CSS variables live in [`apps/web/src/styles/tokens.css`](apps/web/src/styles/tokens.css). AntD ConfigProvider mirrors them in [`apps/web/src/main.tsx`](apps/web/src/main.tsx).

| Token | Value | Purpose |
|---|---|---|
| `--hx-text` | `#0F172A` (slate-900) | Primary text, headings |
| `--hx-text-2` | `#334155` (slate-700) | Body text |
| `--hx-text-3` | `#64748B` (slate-500) | Secondary / labels |
| `--hx-text-4` | `#94A3B8` (slate-400) | Disabled, helper |
| `--hx-accent` | `#2563EB` (blue-600) | Primary CTAs, active state, links |
| `--hx-accent-bg` | `#EFF6FF` (blue-50) | Active row / selected tint |
| `--hx-bg` | `#F8FAFC` (slate-50) | App shell |
| `--hx-surface` | `#FFFFFF` | Content surfaces |
| `--hx-surface-2` | `#F1F5F9` (slate-100) | Quiet surfaces (form panel, etc.) |
| `--hx-border` | `#E2E8F0` (slate-200) | Visible borders |
| `--hx-border-soft` | `#F1F5F9` (slate-100) | Subtle dividers |
| `--hx-success` | `#16A34A` | Positive state |
| `--hx-warn` | `#D97706` | Caution / skipped |
| `--hx-danger` | `#DC2626` | Destructive / errors |
| `--hx-ai` | `#7C3AED` (violet-600) | AI-generated content marker |

**Score-specific gradient** (5-button score selector): red → orange → amber → green-light → green-dark. Semantic intensity, not decorative.

**Candidate avatars**: 8 calm gradient pairs, deterministic by name hash. Branded touch in an otherwise restrained palette.

---

## Typography

- **Font**: [Inter](https://rsms.me/inter/) with stylistic sets `cv11`, `ss01`, `ss03` enabled. Mono: JetBrains Mono for Q-numbers, status counts.
- **Letter spacing**: `-0.003em` body; `-0.011em` to `-0.018em` on headings.

| Scale | Use |
|---|---|
| 11px / 600 / uppercase / `0.06em` tracking | Section labels, meta tags |
| 12px / 500 | Helper text, tooltips |
| 13px / 400 | Tertiary copy |
| 14px / 400 (base) | Body text, form labels |
| 15px / 500 | Emphasized body, row primary |
| 16px / 600 | Subsection headings |
| 18px / 600 | H3 |
| 22px / 600 | Hero question (the copy of the question being asked) |
| 28px / 600 | Page titles |

Never below 12px. Never above 32px (no decorative headers).

---

## Spacing

4pt grid. Token: `--hx-space-{n}` where n ∈ {1, 2, 3, 4, 5, 6, 8}.

| Token | Value | Use |
|---|---|---|
| 4 | space-1 | Tight inline gap, badge padding |
| 8 | space-2 | Default field-internal gap |
| 12 | space-3 | Field-to-field, list-item gap |
| 16 | space-4 | Card padding inset |
| 20 | space-5 | Subsection breaks |
| 24 | space-6 | Section breaks |
| 32 | space-8 | Page-level breaks |

No 5/7/9/11/13/15 spacing. If it doesn't fit the grid, it's wrong.

---

## Depth strategy: **borders, not shadows**

Rationale: this is a dashboard tool — users want density. Shadows add visual weight without conveying state.

- **Default cards**: `1px solid var(--hx-border-soft)` — almost invisible until hover
- **Surfaces of consequence** (hero question, active sidebar row): `1px solid var(--hx-border)` + optional `var(--hx-shadow-sm)` (1px subtle)
- **Modals / dropdowns**: `var(--hx-shadow-lg)` is acceptable — they need to lift above content
- **Sticky bars**: NO shadow at rest; faint shadow only when content scrolls under

Never: drop shadows on every card. Never: glow effects. Never: layered shadows for "depth."

---

## Component specs

### Button (AntD `<Button>` theme-overridden)

| Spec | Value |
|---|---|
| Height | 36px (`controlHeight: 36`) |
| Padding | 14px inline (`paddingInline: 14`) |
| Radius | 6px (`borderRadiusSM: 6`) |
| Font | 14px / weight 500 |
| Primary bg | `var(--hx-accent)` |

Use `size="small"` (28px) for inline actions inside rows. `size="large"` (40px) only for the single primary page CTA.

### Card (AntD `<Card>` theme-overridden)

| Spec | Value |
|---|---|
| Border | `1px solid var(--hx-border-soft)` (use `--hx-border` for high-emphasis) |
| Padding | 16px |
| Radius | 10px (`borderRadiusLG: 10`) |
| Background | `var(--hx-surface)` |

Avoid Card-on-Card. Within a Card, use section labels (`hx-section-label` class) + spacing — not nested borders.

### Input (AntD `<Input>` / `<TextArea>`)

- Border focus: `var(--hx-accent)` (Input `activeBorderColor`)
- Border hover: `#CBD5E1` (slate-300, between border and text-3)
- Radius: 6px

### Tag (AntD `<Tag>`)

- Default bg: `var(--hx-surface-2)`, color: `#475569`
- Semantic tags (success/warning/error) use the matching `--hx-*-bg` / fg pairings

### Custom: ScoreSelector, ChecklistRow, CoverageBar, SidebarRow, StatusPill, Avatar, Logo, PageHeader, GenerateMorePanel

Live in [`apps/web/src/components/`](apps/web/src/components/). Each is borderless-by-default, semantic-state-driven, no shadows on rest. See file-level comments for the contract.

---

## Animation budget

- **150ms ease-out** for hover / state changes (background, border tint)
- **200ms ease-out** for entry transitions (`hx-fade-in` keyframe: 6px translateY + opacity)
- **Never** animate width/height/top/left — only transform + opacity + bg/color
- Respect `prefers-reduced-motion` — all keyframes opt-in via media query

---

## Layout primitives

- **Recruiter shell**: 56px sticky top header (`white`, 1px border-bottom), 232px sticky left nav, content area `padding: 32px 40px`
- **Conduct page**: 56px shell + 56px own top bar (sticks at top: 56) + 320px sticky sidebar at top: 112 + main pane max-width 840px + fixed bottom action bar starting at left: 552 (so it sits only over main pane)
- **Page header**: title (22/600), count badge in mono, description (14/400 slate-3), actions on the right, filter chips on a new row

---

## Anti-patterns (don't)

- ✗ Card inside Card inside Card (each their own border + padding) — flatten with section labels
- ✗ AntD's default colors (`#1677ff` primary, `#bfbfbf` borders) — those tokens are overridden, use ours
- ✗ Emoji as icons — Ant Design Icons or Lucide via SVG
- ✗ Stars for hiring scores — segmented control with semantic colors (`ScoreSelector`)
- ✗ Generic status pills (just text) — `StatusPill` with dot + semantic tint
- ✗ Datetime strings like `26/05/2026, 03:13:11` — use relative (`1d ago`)
- ✗ Filling space with widgets — empty whitespace is the default
- ✗ Showing all advanced fields upfront — collapse into "Advanced" disclosure

---

## Reference

- Template basis: [Dammyjay93/interface-design](https://github.com/Dammyjay93/interface-design) — Precision & Density direction
- Inspirations: Linear (issue rows), Stripe Dashboard (forms), Notion (review UI), Ashby (recruiter pipeline), Lever (status pills)
- Tokens implementation: [`apps/web/src/styles/tokens.css`](apps/web/src/styles/tokens.css)
- AntD theme: [`apps/web/src/main.tsx`](apps/web/src/main.tsx)

**Last updated**: 2026-05-28 — adoption of Precision & Density direction, in-progress per-question time budget feature.
