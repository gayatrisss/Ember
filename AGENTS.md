# Ember — Agent Context

Ember is a web app that monitors Recreation.gov and notifies users when Forest Service
cabins become available. Tagline: "Refresh less, camp more." This is a design + engineering
portfolio project targeting a demoable coded prototype.

---

## ⚠️ Next.js version warning

This is **Next.js 16.2.6** — it has breaking changes from earlier versions your training
data reflects. Before touching any framework API (routing, layouts, server components,
metadata, image optimization, etc.), read the relevant guide in
`node_modules/next/dist/docs/`. Heed deprecation notices.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6, App Router, Turbopack, TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Deployment | Vercel (auto-deploys on push to main) |

shadcn/ui is **not yet installed**. All components are hand-rolled. When shadcn is added,
it will be used for accessibility-critical primitives only (Calendar, Dialog, Popover,
Select, Sonner, Form). Brand primitives stay hand-rolled.

---

## File structure

```
app/
  layout.tsx       — root layout, fonts loaded here
  page.tsx         — landing page, composes landing/ components
  globals.css      — imports theme.css + utilities.css
  theme.css        — @theme block: all design tokens
  utilities.css    — @layer components: type scale + layout utilities

components/
  landing/         — page-section components (not reusable primitives)
    top-nav.tsx
    hero.tsx
    alert-form.tsx
    lately-on-ember.tsx
    activity-card.tsx
    how-it-works.tsx
    footer.tsx
  ui/              — reusable brand primitives (design system)
    input.tsx
    field.tsx
```

**Rules:**
- New page sections → `components/landing/`
- New reusable UI elements → `components/ui/`
- Always check `components/ui/` before building any new UI element — it may already exist

---

## Design tokens

All tokens live in `app/theme.css` inside `@theme {}`. Use them as Tailwind utilities
(e.g. `bg-night`, `text-ember`, `border-smoke`).

### Colors

| Token | Hex | Usage |
|---|---|---|
| `night` | `#0f1510` | Page background, dark surfaces |
| `evergreen` | `#1a241b` | Cards, elevated surfaces |
| `ember` | `#d45a20` | Brand accent, CTAs, active states |
| `smoke` | `#5f7a8a` | Muted text, secondary UI |
| `wax` | `#ede8dc` | Primary text, light surfaces |

### Shadows

| Token | Usage |
|---|---|
| `shadow-ember-sm` | Tight ember glow (inputs, badges) |
| `shadow-ember-md` | Mid glow (cards, buttons) |
| `shadow-ember-lg` | Page-level ambient glow |

### Layout tokens (non-Tailwind-scale values)

| Token | Value | Usage |
|---|---|---|
| `spacing-gutter` | `120px` | Horizontal page padding |
| `width-copy` | `280px` | Narrow text columns |
| `width-copy-wide` | `300px` | Slightly wider text columns |
| `width-sidebar` | `440px` | Sidebar / form panel width |

The `.page-container` utility class (`utilities.css`) applies `max-w-6xl mx-auto px-gutter`
and should be used on every full-width page section.

---

## Type scale

All type styles are locked utility classes in `app/utilities.css`. **Never use arbitrary
`text-[Xpx]` values.** If a new size is genuinely needed, add a named class first.

| Class | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `.text-display-fraunces` | Fraunces italic | 64px | 700 | Hero headline |
| `.text-display-geist` | Geist | 64px | 700 | Hero subheadline |
| `.text-heading` | Geist | 20px | 600 | Section headings |
| `.text-body` | Geist | 16px | 400 | Body, subheads, button labels |
| `.text-label` | Geist | 12px | 500 | Badges, disclaimers |
| `.text-data` | Geist Mono | 10px | 400 | Uppercase labels, timestamps, step numbers |
| `.text-display-fraunces-sm` | Fraunces italic | 24px | 700 | Cabin names, step headlines, footer wordmark |

Fraunces is **display-tier only** — never use it for body text or labels.

---

## Component inventory (`components/ui/`)

Check this before building anything new.

### `<Input />`
`components/ui/input.tsx`
A styled `<input>` element. Inherits `fieldControlClassName` from `field.tsx`.
Applies: `bg-night/60 w-full p-4 border-b border-ember outline-none text-body text-wax caret-ember`

```tsx
import { Input } from "@/components/ui/input";
<Input type="email" placeholder="your@email.com" />
```

### `<Field />` and `<FieldControl />`
`components/ui/field.tsx`
`Field` wraps a control + label below it (Ember's inverted label pattern — label sits
below the input, not above). `FieldControl` is a styled wrapper div using the same base
styles as `Input`, for non-input content.

```tsx
import { Field, FieldControl } from "@/components/ui/field";

// Input field with label below
<Field label="EMAIL ADDRESS">
  <Input type="email" />
</Field>

// Non-input content with field styling
<FieldControl>
  <SomeSelectOrCustomThing />
</FieldControl>
```

---

## Conventions and rules

1. **No magic values.** No inline `style={{}}`, no `text-[Xpx]`, no `w-[Npx]` unless the
   value is already a named token. If you need a new spacing or size value, add it to
   `theme.css` first.

2. **Tokens over raw values.** Use `bg-night` not `bg-[#0f1510]`. Use `text-ember` not
   `text-[#d45a20]`.

3. **Type scale is locked.** Use the named classes above. Do not invent new sizes.

4. **Check `components/ui/` first.** Before writing a new input, button, badge, or any
   shared UI primitive, look there. Duplicate primitives are not acceptable.

5. **`components/landing/` is for page sections only.** These are compositional, not
   reusable. Keep logic light; pass data as props where possible.

6. **Import alias is `@/`.** Always use `@/components/...` and `@/app/...` — never
   relative paths like `../../`.

7. **Before finishing any task, run both:**
   - `npm run lint` — ESLint with Next.js core-web-vitals + TypeScript rules
   - `npm run build` — catches type errors and Next.js build issues
   Vercel will auto-deploy on push but it's faster to fail locally.
