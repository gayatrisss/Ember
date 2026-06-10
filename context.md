# Ember — Project Context

Ember monitors Recreation.gov and notifies users when Forest Service cabins become available.
Tagline: "Refresh less, camp more." Portfolio project targeting a demoable coded prototype.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6, App Router, Turbopack, TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Database | Supabase (Postgres + Auth) |
| Auth | Google OAuth via Supabase Auth + `@supabase/ssr` (cookie-based sessions) |
| Deployment | Vercel (auto-deploys on push to `main`) |
| Formatter | Prettier (`npm run format`, format-on-save in VS Code) |

---

## Environments

### Local dev
- Local Supabase via Docker at `http://127.0.0.1:54321`
- Studio at `http://127.0.0.1:54323`
- `.env.local` points to local Supabase (production values commented out)
- Google OAuth works locally — `http://127.0.0.1:54321/auth/v1/callback` registered in GCC
- **To resume:** open Docker Desktop → `supabase start` → `npm run dev`
- Schema migrations in `supabase/migrations/`
- To apply schema changes locally: `supabase db reset`
- To push schema changes to production: `supabase db push`

### Production
- Supabase project: `https://hbbqnptnopgrxproigux.supabase.co`
- Deployed to Vercel at `https://ember-five-beige.vercel.app`
- Preview deployments use production Supabase (no separate staging DB)

---

## Authentication

Google OAuth via Supabase Auth. Fully wired end-to-end.

- **Google** = identity provider (verifies the user, issues an auth code)
- **Supabase Auth** = session manager (exchanges code, stores user in `auth.users`, issues JWT cookie)
- **`@supabase/ssr`** = makes the session readable on both server and client via cookies (not localStorage)
- Session is refreshed on every request by `proxy.ts` at the repo root (Next.js 16 renamed `middleware.ts` → `proxy.ts`)
- After Google OAuth, Supabase redirects to `app/auth/callback/route.ts` which sets the session cookie

Architecture documented in `docs/authentication.md`.

SMS is explicitly dropped. Email only (from `auth.users.email`). SMS may be added later with Twilio.

---

## Supabase clients

Two clients — never use the old `lib/supabase.ts` pattern (deleted):

- `lib/supabase/server.ts` — cookie-based, `async createClient()`, for server components + API routes + server actions
- `lib/supabase/client.ts` — browser-based, `createClient()`, for client components

---

## Database

### `cabins` — 519 rows, public read
Seeded from RIDB bulk data via `scripts/ingest_ridb.py` + `scripts/seed_supabase.py`.

Primary key: `facility_id` (text) — the RIDB FacilityID, same ID used in Recreation.gov
availability API and the app's `/cabin/[id]` route.

Key columns:
- `facility_id`, `facility_name`, `rec_area_name` — identity / display
- `latitude`, `longitude` — map pins
- `reservation_url` — link to book on rec.gov
- `stay_limit_raw` — raw text ("14 nights")
- `description_plain` — full plain-text description from RIDB

Metadata fields (each paired with a `_conf` float confidence score):
```
elevation_ft   sleeps        built_year    heat_source   water_access
restroom_type  road_access   season        electricity   firewood_provided
waterfront     fishing_nearby pets_allowed ada_accessible
checkin_time   checkout_time num_beds      bed_type      nightly_rate
```
**Rule: only display a metadata field as a hard fact if its `_conf >= 0.8`.**

### `cabin_images` — 3818 rows, public read
FK → `cabins.facility_id`. Columns: `media_id`, `url`, `title`, `is_primary`, `is_preview`, `is_gallery`.

Fetch for a listing: `.eq('facility_id', id).order('is_primary', { ascending: false })`

### `alerts` — user-owned, RLS enforced
One row = one user watching one cabin for a date range.

**Schema (v2 — migration applied):**
```
id                  uuid primary key
user_id             uuid not null → auth.users (cascade delete)
facility_id         text not null → cabins (cascade delete)
type                text not null  -- "cancellation" | "reminder"
date_from           date not null
date_to             date not null
flexibility         text nullable  -- "strict" | "flexible" (cancellation only)
notify_when         text nullable  -- "1day" | "1week" (reminder only)
notification_method text not null default 'email'  -- "email" | "sms"
status              text not null default 'active'  -- "active" | "triggered" | "cancelled"
created_at          timestamptz default now()
updated_at          timestamptz default now()
```

Constraints:
- Unique: `(user_id, facility_id, date_from, date_to)` — exact duplicates, returns 23505
- GiST exclusion constraint (requires `btree_gist`): prevents overlapping date ranges for same user + cabin, returns 23P01
- Index on `status = 'active'` for efficient cron job queries

RLS: users can select/insert/update/delete only their own rows (`auth.uid() = user_id`).

Architecture documented in `docs/alerts-architecture.md`.

### `notifications` — append-only log (future)
One row per notification fired. Written server-side only.

---

## Data pipeline

```
RIDB bulk dump (CSV)
  → scripts/ingest_ridb.py   — filters 519 cabins/lookouts/yurts, regex metadata extraction
  → data/ember.db             — SQLite, 3.1MB (CABINS + CABIN_IMAGES tables)
  → scripts/seed_supabase.py  — upserts to Supabase (needs SUPABASE_SERVICE_KEY)
```

Availability is **never stored** — always a live call to the rec.gov availability endpoint:
`/api/camps/availability/campground/{facilityId}/month?start_date=...`
Proxied server-side via `app/api/availability/route.ts` (avoids CORS, caches 5 min).

---

## Design system

All tokens in `app/theme.css` inside `@theme {}`. Use as Tailwind utilities.

### Colors
| Token | Hex | Usage |
|---|---|---|
| `night` | `#0f1510` | Dark surfaces (listing page, alerts dashboard bg) |
| `evergreen` | `#1a241b` | Landing page base, cards, elevated surfaces |
| `ember` | `#d45a20` | Brand accent, CTAs |
| `ember-selected` | `#b24c1b` | Calendar selected dates (80% brightness) |
| `ember-range` | `#803913` | Calendar in-range / hover bg (50% brightness) |
| `smoke` | `#5f7a8a` | Muted text, avatar bg |
| `wax` | `#ede8dc` | Primary text |
| `wax-muted` | `#b2afa6` | Secondary labels on cards |
| `ash` | `#171a17` | Nav scrolled bg, auth pill + dropdown surface |
| `slate` | `#6d736e` | Muted text/icons on light (wax) surfaces — e.g. nav search bar |

`--container-nav-search: 600px` — max-width of the centered nav search bar. (Note: `max-w-*` named utilities require a `--container-*` token in Tailwind v4, **not** `--width-*`, which only powers `w-*`.)

### Type scale (locked — never use `text-[Xpx]`)
| Class | Usage |
|---|---|
| `.text-display-fraunces` | Hero headline (64px italic Fraunces) |
| `.text-display-fraunces-sm` | Cabin names, step headlines (24px) |
| `.text-display-geist` | Hero subheadline (64px Geist bold) |
| `.text-heading` | Section headings (20px 600) |
| `.text-body` | Body, buttons (16px 400) |
| `.text-label` | Badges, disclaimers (12px 500) |
| `.text-data` | Mono labels, timestamps (10px Geist Mono) |
| `.text-calendar-date` | Active calendar date cells (20px 500) |

### Layout
- `.page-container` — always use for full-width sections. Responsive: 24px mobile → 48px tablet → 120px desktop, max-width 1280px.
- Never apply `px-gutter` or `px-[120px]` manually.
- Grids always start `grid-cols-1`, add breakpoint columns on top.
- Fixed widths always have a `w-full` base: `w-full lg:w-sidebar`.

### Backgrounds
- Landing page: `bg-evergreen bg-page-glow`. The `bg-page-glow` token is two ember radial gradients: bottom-left (26%, 130%) at 0.5 opacity and bottom-right (105%, 108%) at 0.4 opacity.
- All other pages (listing, alerts dashboard): `bg-night`.

### Shadows
`shadow-ember-sm` / `shadow-ember-md` / `shadow-ember-lg`

---

## Component inventory

### `components/ui/` — reusable primitives
- `field.tsx` — `<Field>` (label below input) + `<FieldControl>` (non-input variant)
- `auth-button.tsx` — nav auth state. Props: `email: string | null`, `name: string | null` (from `user.user_metadata.full_name`). **Logged out:** ember-filled "Log in" pill (`bg-ember p-4 rounded-lg`). **Logged in:** dark trigger pill (`bg-ash p-4 rounded-xl`) = avatar + first name + static down-chevron. **Opens on hover** (`onMouseEnter`/`onMouseLeave`; click = touch/keyboard fallback). The button is the single header (never animates); only the menu (divider + Log out) drops in below — button `rounded-t-xl` when open, menu `absolute top-full left-0 right-0 rounded-b-xl` animating `opacity + y:-6→0`, so they read as one continuous pill. Outside-click closes via `mousedown` listener.
- `calendar-input.tsx` — date range picker. Props: `checkIn`, `checkOut`, `onChange`, `availableDates?`, `fetchedMonths?`, `onMonthChange?`. Root is `w-fit mx-auto`.
- `date-cell.tsx` — calendar cell primitive. States: `default`, `disabled`, `unavailable`, `day`, `hover`, `selected`, `in-range`. `unavailable` = booked/not-open, clickable with dot indicator. `disabled` = past dates or before selected start, non-interactive.
- `booking-panel.tsx` — shell for booking flows: `h-[600px]`, `p-9`, title + `flex-1` content + sticky CTA slot.
- `availability-panel.tsx` — full booking widget. Fetches rec.gov availability, calendar with date states, three CTA states (book / alert / reminder), alert-setup + reminder-setup + confirmed views. Auth-gated: triggers Google OAuth if not signed in, restores view+dates from URL params after redirect.
- `spinner.tsx` — `<Spinner size={24} />` centered loading indicator.
- `use-cabin-search.ts` — headless cabin-search hook. Loads cabin list + builds Fuse index **once at module level** (shared singleton across all consumers). Returns `query/setQuery/ready/q/visibleResults/hasMore/handleScroll`. No UI.
- `search.tsx` — vertical cabin autocomplete (landing `AlertForm`). Consumes `useCabinSearch`. cmdk input + dark dropdown, infinite scroll. Navigates to `/cabin/{id}` in a new tab on select.
- `nav-search.tsx` — `<NavSearch />`, the horizontal joint bar in the scrolled top nav. Consumes `useCabinSearch`. Owns `selectedCabin`/`checkIn`/`checkOut`/`popover`. Left = cabin autocomplete (commits cabin, dark dropdown); right = `CalendarInput` popover (evergreen, no availability data) + ember submit arrow (disabled until a cabin is picked; **dates optional**). Submit → `router.push('/cabin/{id}?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD')`, params omitted when no dates. `AvailabilityPanel` reads these params and pre-selects the range.
- `status-bar.tsx` — "● last checked Xs ago" + rec.gov link bar
- `toggle-options.tsx`, `radio-options.tsx` — form toggle primitives
- `confirmation-animations.tsx` — success state animations

### `components/listing/` — page-section components (non-reusable)
- `cabin-header.tsx` — rec area badge + Fraunces title
- `cabin-facts.tsx` — `<CabinFacts facts={[{label, value}]}/>`. `flex justify-between p-9`. Figma-spec stats row (Sleeps, Type, Signal, Price).
- `topo-image.tsx` — cabin photo fading into topo SVG. Uses `h-full` — must be placed in a sized container.
- `field-notes.tsx` — dynamic pool of 8 notes, shows best 6

### `components/landing/` — page-section components (non-reusable)
`top-nav.tsx`, `hero.tsx`, `alert-form.tsx`, `lately-on-ember.tsx`, `activity-card.tsx`, `how-it-works.tsx`, `footer.tsx`

**`top-nav.tsx`** — props: `email: string | null`, `name: string | null`. Fixed, `z-50`, `h-20` spacer sibling. **Above-fold (default):** transparent bg; left group = logo (`text-display-fraunces-nav`, 48px Fraunces with SOFT/WONK axes) + EXPLORE + ALERTS links (`flex gap-[60px]` uppercase); right = `<AuthButton>`. **Scrolled (>400px):** `bg-ash backdrop-blur-sm`; links fade out and the **`<NavSearch>` bar fades in absolutely-centered** in the nav (`absolute left-1/2 -translate-x-1/2`, `w-full max-w-nav-search` capped 600px) via `AnimatePresence` (`opacity + y`). Mobile (below `md`): logo + auth only, no search.

**Always check `components/ui/` before building any new element.**

---

## Key files

| File | Purpose |
|---|---|
| `proxy.ts` | Session refresh on every request (Next.js 16 = middleware.ts renamed) |
| `app/auth/callback/route.ts` | OAuth callback — exchanges code for session cookie, redirects via `?next=` |
| `lib/supabase/server.ts` | Server-side Supabase client (cookies) |
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `supabase/config.toml` | Local Supabase config incl. Google OAuth settings |
| `supabase/migrations/` | Schema migration files — applied with `supabase db reset` (local) or `supabase db push` (prod) |
| `docs/authentication.md` | Full auth architecture doc |
| `docs/alerts-architecture.md` | Alerts data model + server action design |

---

## Conventions

1. No magic values — no `style={{}}`, no `text-[Xpx]`, no `w-[Npx]` unless a named token
2. Tokens over raw values — `bg-night` not `bg-[#0f1510]`
3. Always `@/` import alias — never relative paths
4. `console.log` must be prefixed `[ember]`
5. Before finishing: `npm run lint` + `npm run build`
6. Rule of 3 — extract repeated UI into `components/ui/` before it appears 3 times
7. shadcn only for: Calendar, Dialog, Popover, Select, Sonner, Form — not installed yet
8. Delete superseded files immediately — verify with `grep` that zero files import them first
9. No nested or chained ternaries (`a ? b : c ? d : e`) — ESLint enforces `no-nested-ternary`. Use if/else or a lookup object instead.
