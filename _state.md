# Ember — Session State

> Update this file at the end of every session. Takes 30 seconds. Saves 10 minutes rebuilding context.
> Start a new session by saying: "read _state.md and pick up where we left off."

---

## Current phase
**Build phase — Week 3**
Landing page live. Listing page live with real availability data. Google OAuth fully wired. Alert save fully wired. `/my-alerts` dashboard complete — AlertCard (mobile + desktop, expanded + collapsed states), cancel action, badge system. Top nav redesigned with scroll transition.

## Last session (2026-06-10)

### Profile dropdown (auth-button) — hover + Figma match
- **`components/ui/auth-button.tsx`** — logged-in profile pill now opens the log-out menu **on hover** (`onMouseEnter`/`onMouseLeave` on wrapper; click retained as touch/keyboard fallback).
- Restructured to kill a double-render flicker: the **button is the single header** (never animates); only the **menu portion** (divider + Log out) drops down. Button gets `rounded-t-xl` when open, menu is `absolute top-full left-0 right-0 rounded-b-xl`, animates `opacity + y:-6→0` (search-bar style) so the two ash blocks read as one continuous pill.
- Chevron stays pointing **down** in both states (Figma 3557-4105 collapsed / 3557-4021 expanded). Divider = `border-smoke/30`.

### Page background → evergreen + ember glow
- **`app/theme.css`** `--background-image-page-glow` = two ember radial gradients (bottom-left 26%/130% @0.5, bottom-right 105%/108% @0.4). Landing uses `bg-evergreen bg-page-glow`; other pages `bg-night`.

### Nav search bar — centered + sized + WIRED UP (the big one)
- **Placement:** search is now **absolutely centered** in the nav (`absolute left-1/2 top-1/2 -translate-x/y-1/2`), separate from the left-group links. Figma frame 2902-2103 centers at page-center.
- **Size:** `w-full max-w-nav-search`, capped **600px**. ⚠️ Token is `--container-nav-search` (NOT `--width-*`) — see Known mistakes.
- **New `--color-slate: #6d736e`** — muted text/icons on light (wax) surfaces. Search bar text + search/calendar icons use `text-slate` (was the bluer `text-smoke`).
- **`components/ui/use-cabin-search.ts`** (NEW) — headless hook: loads cabin list + builds Fuse index **once at module level** (shared singleton, so landing's two consumers don't double-fetch). Exposes `query/setQuery/ready/q/visibleResults/hasMore/handleScroll`.
- **`components/ui/search.tsx`** — rebased onto the hook (behavior unchanged, still navigates-on-select new tab). Dropped private `toTitleCase` → `formatCabinName`.
- **`components/ui/nav-search.tsx`** (NEW) — the joint horizontal bar. Owns `selectedCabin`/`checkIn`/`checkOut`/`popover`. Left = cabin autocomplete (commits cabin, no nav); right = `CalendarInput` popover (no availability data); arrow = submit, **disabled until a cabin is picked, dates optional**. On submit → `router.push('/cabin/{id}?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD')` (params omitted if no dates).
- **Cabin page needs ZERO changes** — `AvailabilityPanel` already reads `?checkIn/?checkOut` and pre-selects + evaluates availability (built for the OAuth round-trip).

### Open follow-ups for tomorrow
1. **Test in browser** — `.next` was cleared; restart `npm run dev`, scroll past 400px, run a full search → cabin page.
2. **Landing `AlertForm` still on old model** (Search navigates on select; its dates feed the alert, not a joint search). Decide whether to mirror the nav's joint model there.
3. **Optional polish:** `AvailabilityPanel` renders `CalendarInput` without `initialMonth`/`initialYear`, so future-month restored dates open on *today* with selection off-screen. 2-line fix to open on `checkIn`'s month.
4. Deferred filled-state styling reconciliation already partly done (gap-6, 24px arrow now in nav-search).

## Last session (2026-06-09)

### Top nav — complete redesign
- **`components/landing/top-nav.tsx`** — rewritten as `"use client"` with scroll detection (`SCROLL_THRESHOLD = 400`).
- Fixed `fixed top-0 left-0 right-0 z-50` with `h-20` spacer sibling div for page offset.
- **Default state:** transparent bg, logo left | Explore + Alerts links center (24px icons, gap-12) | auth right.
- **Scrolled state:** `bg-night/95 backdrop-blur-sm border-b border-wax/5`, links crossfade to inline search bar (wax pill: search icon + location + divider + calendar + ember arrow button).
- Framer Motion `AnimatePresence mode="wait"` with y-direction fade between the two center states.
- Mobile: logo + auth only (no links, no search bar) per AGENTS.md convention.
- Logo is now a `<Link href="/">` with ember `text-shadow` glow on hover (`logo-glow-hover` class in `utilities.css`).

### Auth — server-side, no more flicker
- **`app/page.tsx`** — made `async`, fetches `supabase.auth.getUser()` server-side, passes `email` to `<TopNav>`.
- **`app/my-alerts/page.tsx`** — already fetched user; now passes `email` to `<TopNav>`.
- **`app/cabin/[id]/page.tsx`** — added `auth.getUser()` to existing `Promise.all`, passes `email` to `<TopNav>`.
- **`components/landing/top-nav.tsx`** — accepts `email: string | null` prop, passes to `AuthButton`.
- **`components/ui/auth-button.tsx`** — rewrote: accepts `email` prop, no `useEffect`/loading state. Uses `router.refresh()` after sign-out to re-run server fetch. Zero flicker on load.

### Badge system redesign
- **`components/ui/badge.tsx`** — full rewrite with 3-axis system: `type` (default/accent/error), `fill` (ghost/fill), `size` (default/small/pill).
- All styles via lookup maps (no nested ternaries). Ghost uses border-only; fill uses solid bg.
- `ghost` default badge: `border-smoke/30 text-smoke`. Accent: `border-ember-selected text-ember`. Error: `border-red-600 text-red-400`.
- `fill` default: `bg-smoke`. Accent: `bg-ember`. Error: `bg-red-600`. All fill text: `text-wax`.
- `/design` page updated — 3×6 badge matrix (type × fill+size combinations).

### AlertCard — mobile layout
- **`components/alerts/alert-card.tsx`** — two separate DOM elements: `lg:hidden` mobile card / `hidden lg:block` desktop card, sharing `expanded` state.
- **Mobile collapsed:** full-width `aspect-[3/2]` landscape photo header → card body with rec area (text-data uppercase), Fraunces cabin name (link), date range (text-body).
- **Mobile badge overlay:** top-left `absolute top-4 left-4`, always `fill` variant for photo visibility. `active/triggered → accent fill`, `cancelled → error fill`.
- **Mobile expanded:** AnimatePresence height animate, settings rows + cancel button + map section revealed. Toggle button at bottom with ChevronDown rotation.
- **Desktop:** unchanged — thumbnail row, click to expand, `px-30 py-15` body.
- Map label: `text-wax-muted` (not smoke) — reinforced this rule.
- Clickable Pencil icons: `size={24}` (not 16).

## Last session (2026-06-08)

### Alerts dashboard — in progress
- **`supabase db push`** run — v2 alerts migration now live in prod (status, flexibility, notification_method, type columns confirmed).
- **`/my-alerts`** page created. Server component. Fetches user's non-cancelled alerts via Supabase directly, splits into `triggered` (Needs Attention) and `active` (Currently Watching) sections.
- Empty state: "Find a cabin worth waiting for. Set an alert and we'll do the refreshing for you." + "Explore cabins" CTA → `/`.
- **Top-nav Alerts link** now routes to `/my-alerts`.
- **`GET /api/alerts`** added to `app/api/alerts/route.ts` — returns non-cancelled alerts with cabin join for client-side use.
- **`AlertCard`** (`components/alerts/alert-card.tsx`) — Figma-spec row: thumbnail (106×71), Fraunces italic cabin name, forest · date range, WATCHING badge, chevron. Uses `next/image`.
- **Page spacing** (Figma-spec): 120px headline→label (`mt-30`), 46px label→cards (`mt-section-content`), 80px between sections (`gap-20`), 24px between cards (`gap-6`).

### New design tokens added to `theme.css`
- `--color-wax-muted: #b2afa6` — muted wax used throughout Figma for secondary text
- `--width-alert-thumb: 106px` / `--height-alert-thumb: 71px` — alert card thumbnail
- `--spacing-section-content: 46px` — gap between a section label and its first card

### New format helpers in `lib/format.ts`
- `formatCabinName(name)` — canonical wrapper around `formatFacilityName`. Use this everywhere a cabin name is displayed.
- `formatDateRange(from, to)` — parses DB date strings as local dates, returns e.g. "Jul 4 – Aug 31".

### Dashboard design decisions (do not re-litigate)
- Needs Attention = `status = 'triggered'`, Currently Watching = `status = 'active'`
- "Date flexibility" shown as hardcoded "± 7 days" in UI — DB stores 'strict'/'flexible' binary
- `notification_method` not shown in UI (column stays in schema)
- No notifications table yet — Needs Attention section is empty state: "Keep an eye out here for notifications regarding availability"
- Cancel alert: PATCH sets `status = 'cancelled'`, row shows CANCELLED badge briefly then fades out — **not yet built**
- Pause: deferred to later

## Last session (2026-06-05)

### Alerts — fully built
- Migration `20260604180000_alerts_v2.sql` applied locally and pushed to prod.
- `app/api/alerts/route.ts` — POST endpoint. Handles 23505 (duplicate) and 23P01 (overlap) errors.
- `availability-panel.tsx` wired: "Confirm alert" and "Confirm reminder" call the API, show loading/error states, display user email in confirmed view.
- Full architecture in `docs/alerts-architecture.md`.

### Alerts schema decisions (see doc for full rationale)
- `cabin_name` dropped — join on 500-row table is trivially cheap.
- `notification_method` added, default `"email"` — in place for future SMS without a schema migration.
- Unique constraint `(user_id, facility_id, date_from, date_to)` + GiST exclusion constraint for overlapping ranges (requires `btree_gist`).
- `active` boolean replaced by `status` text: `"active"` | `"triggered"` | `"cancelled"`.
- Reminders saved to DB but cron job will skip them — need `booking_window_opens_at` design first.
- One table for both types (cancellation + reminder).

### API pattern decision
Using `app/api/*/route.ts` for DB writes (not Next.js server actions). Reason: easier to explain in interviews.

### seed.sql cleanup
Stripped all `auth.*` session data from `supabase/seed.sql`. Now contains only `public.cabins` and `public.cabin_images` — safe for public repo, useful for contributors running `supabase db reset`.

### Local dev environment — fully set up
- Local Supabase via Docker. Schema pulled from prod. Cabin + image data seeded via `psql`.
- Google OAuth working locally — config in `supabase/config.toml`, secret in `.env.local`.
- `.env.local` now points to local Supabase (production values commented out).
- **To resume tomorrow:** open Docker Desktop → `supabase start` → `npm run dev`.

### Calendar date states — fixed
- Past dates → `disabled` (non-interactive). Dates before selected start → `disabled` when picking end date.
- Booked/not-open dates → new `"unavailable"` state: muted text + small dot indicator, still clickable so users can select them to set alerts.
- `no-nested-ternary` ESLint rule added. Fixed 5 violations across `date-cell.tsx`, `alert-form.tsx`, `search.tsx`.

### Google OAuth auth — fully wired and tested end to end

- `@supabase/ssr` installed. Old `lib/supabase.ts` deleted and replaced with:
  - `lib/supabase/server.ts` — cookie-based, async, for server components + API routes
  - `lib/supabase/client.ts` — browser-based, for client components
- `proxy.ts` at repo root — refreshes Supabase JWT on every request (Next.js 16 renamed `middleware.ts` → `proxy.ts`, export renamed `middleware` → `proxy`)
- `app/auth/callback/route.ts` — exchanges OAuth `?code=` for a session cookie, redirects via `?next=` param
- `components/ui/auth-button.tsx` — client component in nav. Shows email + "Sign out" when logged in, "Log in" (triggers Google OAuth) when logged out. Uses `onAuthStateChange` so it updates without a page reload.
- `components/ui/availability-panel.tsx` — "Set up an alert" / "Set a reminder" now checks auth before proceeding. If not signed in, fires Google OAuth with `?next=/cabin/[id]?view=alert-setup&checkIn=...&checkOut=...`. On return, URL params are read as `useState` initializers (not in an effect) to restore panel state. URL cleaned up with `router.replace`.
- Removed "How should we notify you?" Email/SMS toggle from alert-setup and reminder-setup — email is implicit from `auth.users.email`.
- Supabase dashboard: added `http://localhost:3000/**` to Redirect URLs allowlist to enable local dev OAuth testing.
- `docs/authentication.md` — written and updated with full arch explanation, flow diagram, credential notes, and connection to alert flow.

### Availability module — fully wired
- `app/api/availability/route.ts` — server proxy to rec.gov availability endpoint (`/api/camps/availability/campground/{facilityId}/month`). Caches 5 min. Accepts `?month=YYYY-MM`.
- `components/ui/availability-panel.tsx` — full booking widget. One container (`BookingPanel`), one return. Derives `title`/`body`/`cta` from a switch on `view` state. Four views: calendar, alert-setup, reminder-setup, confirmed.
- `components/ui/booking-panel.tsx` — reusable shell: `h-[600px]`, `p-9` (36px), title at top, content fills middle (`flex-1 min-h-0`), CTA always sticky at bottom.
- Booked dates (quantity = 0 across all campsites) shown as `disabled` cells in calendar on mount.
- Three CTA states after date selection: available → "Book on Recreation.gov", booked → "Set up an alert", not-open → "Set a reminder".
- Multi-month date ranges supported (parallel fetches, merged campsite quantities).

### Calendar design system
- `components/ui/date-cell.tsx` — new primitive. States: `default`, `disabled`, `day`, `hover`, `selected`, `in-range`. Positions: `single`, `start`, `end`. Active states use `text-calendar-date` (20px/500); inactive use `text-body` (16px/400) per Figma spec.
- `components/ui/calendar-input.tsx` — refactored to `CalendarInput > CalendarHeader + DateCell`. Root is `w-fit mx-auto` so it never stretches. `bookedDates?: Set<string>` prop.
- `app/utilities.css` — added `.text-calendar-date` (Geist 20px 500).
- `/design` page — added Date Cell States showcase section using real `DateCell` component.

### Listing page
- `components/listing/cabin-facts.tsx` — new `CabinFacts` component. `flex justify-between p-9`, label in `text-label text-smoke uppercase`, value in `text-body text-wax`. Figma-spec.
- `components/listing/topo-image.tsx` — changed root from `aspect-[3/4]` to `h-full` so it fills its container.
- `app/cabin/[id]/page.tsx` — two-column equal-height layout. Left: `flex flex-col gap-4` with `CabinFacts` + `TopoImage` wrapper (`aspect-[3/4]` mobile / `flex-1` desktop). Right: `AvailabilityPanel`.

### Code quality
- Installed Prettier (`prettier@3`) + `.prettierrc` + `.vscode/settings.json` (format on save). Run with `npm run format`.
- Deleted 8 unused files: `listing/sidebar.tsx`, `listing/wizard.tsx`, `ui/command.tsx`, `ui/dialog.tsx`, `ui/input-group.tsx`, `ui/input.tsx`, `ui/textarea.tsx`, `listing/availability-panel.tsx` (superseded by `ui/`).
- Added AGENTS.md rule #10: delete deprecated code immediately, verify with grep, one file per concept.

## Local dev environment (set up 2026-06-04)
- Local Supabase running via Docker at `http://127.0.0.1:54321`
- Schema pulled from production into `supabase/migrations/20260604172415_remote_schema.sql`
- Cabin + image data seeded locally via `psql`
- `.env.local` points to local Supabase (production values commented out)
- Google OAuth working locally — `http://127.0.0.1:54321/auth/v1/callback` registered in GCC
- To resume local dev: open Docker Desktop, run `supabase start`, then `npm run dev`

## Next tasks (priority order)
1. **AlertCard — triggered (Needs Attention) mobile layout** — triggered card has no mobile treatment yet; desktop shows a header strip + "Keep an eye out" copy
2. **Fraunces font rendering** — `text-display-fraunces-sm` looks different in browser vs Figma (tabled). Try adding `"SOFT" 0, "WONK" 1` to `font-variation-settings` in `utilities.css`. Axes are already loaded in `layout.tsx`.
3. **Nav search bar — ✅ WIRED (2026-06-10)** — needs browser test + decide whether landing `AlertForm` adopts the same joint model (see today's follow-ups)
4. **Listing page polish** — mobile layout, description text, image gallery
5. **Search / Map page** — lat/lng ready in Supabase; nav has a map page nav design too (hamburger + user dropdown — separate Figma nodes). The nav search's "region → map" branch is intentionally deferred (dropdown is cabin-only for now).

## Decisions log (stable — do not re-litigate)
- Search: Supabase + fuse.js client-side, all 519 cabins loaded on mount. Core extracted to `useCabinSearch()` hook (module-level shared Fuse singleton). Landing `<Search>` opens cabin in new tab on select; nav `<NavSearch>` commits cabin then submits via arrow to `/cabin/{id}?checkIn&checkOut` (same tab, dates optional).
- Availability: live call to rec.gov's undocumented internal API. **Known risk: endpoint can vanish without notice.** Acceptable for portfolio demo.
- Route: `/cabin/[id]` — `id` param = `facility_id` from RIDB/Supabase
- Auth: Google OAuth via Supabase. Email from `auth.users.email` — no manual contact input.
- DB writes: `app/api/*/route.ts` pattern, not server actions
- Facility name format: title-case + preserve parentheticals as-is (e.g. "(MT)", "(AK)")
- Signal: `—` always — only 1% RIDB coverage, not worth a live API call
- Nightly rate: from RIDB `FacilityUseFeeDescription` regex — 54/519 cabins, shows `—` otherwise
- shadcn/ui: not installed yet — add only for Calendar, Dialog, Popover, Select, Sonner, Form
- Type scale: locked — never use arbitrary `text-[Xpx]`
- Container: always `.page-container` — never manual padding
- AvailabilityPanel lives in `components/ui/` (not listing) — it's a reusable booking widget

## Data sources
| Field | Source | Coverage |
|---|---|---|
| cabin metadata | RIDB bulk dump → `data/ember.db` → Supabase | 519 cabins |
| images | RIDB Media → Supabase `cabin_images` | 3,818 images |
| sleeps | CampsiteAttributes "Max Num of People" | 97% |
| checkin/checkout | CampsiteAttributes | 97% |
| heat/water/access/season | regex from description (`_conf >= 0.8`) | ~50–70% |
| nightly_rate | regex from `FacilityUseFeeDescription` | ~10% |
| availability | live rec.gov API call — never stored | — |

## Env vars (.env.local)
```
RIDB_API_KEY                    # set (unused by search now)
NEXT_PUBLIC_SUPABASE_URL        # set — https://hbbqnptnopgrxproigux.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   # set
SUPABASE_SERVICE_KEY            # seed/ingest scripts only — not committed
```

## Known Claude mistakes to avoid
- No arbitrary `text-[Xpx]` — add named class to `utilities.css` first
- Always `@/` import alias, never relative paths
- Next.js 16.2.6 — check `node_modules/next/dist/docs/` before touching any framework API
- No shadcn components outside the approved list
- Don't call `setState` synchronously inside a `useEffect` body
- Don't read `ref.current` during render — store in state if needed
- Use `update()` not `upsert()` for Supabase rows that already exist
- Python < 3.10: use `Optional[X]` not `X | None` for type hints
- Delete superseded files immediately — verify with grep before deleting
- **Tailwind v4 token namespaces:** `--width-*` only generates `w-*` utilities; **`max-w-*` named utilities come from `--container-*`**. A `max-w-<token>` built on `--width-*` silently compiles to nothing. (The existing `max-w-copy`/`max-w-copy-wide` on `--width-copy` are latent no-ops — pre-existing bug.)
- **Don't run `npm run build` while `npm run dev` is running** — the prod build overwrites `.next/dev/*` manifests and crashes the dev server. Use `npx tsc --noEmit` + `npm run lint` to verify instead.
- Supabase query builder `.then()` returns a `PromiseLike`, not a `Promise` — wrap in an `async` fn if you need real Promise methods (`.catch`, etc.)

## Build status
| Page | Design | Code | Deployed |
|---|---|---|---|
| Landing | ✅ | ✅ | ✅ |
| Listing | ✅ | ✅ | 🔲 |
| Search / Map | ✅ | 🔲 | 🔲 |
| Alert dashboard | ✅ | ✅ | 🔲 |
| Email templates | 🔲 | 🔲 | 🔲 |
