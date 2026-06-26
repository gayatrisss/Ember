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

**Note:** in practice `status` is only `active` / `cancelled` now. The cron never sets
`triggered` — openings live in the `notifications` table, and `/my-alerts` "Needs
Attention" is driven by un-dismissed notifications, not alert status. `POST /api/alerts`
returns the new `alertId` (used by the test-email button + deep links).

### `notifications` — the dedup ledger (live)
One row per distinct opening the cron has emailed about. Written by the service-role
cron/sender; users can read + dismiss their own (RLS).

**Schema (v2 — migration `20260623150000_notifications_v2.sql`):**
```
id               uuid primary key
alert_id         uuid not null → alerts (cascade delete)
user_id          uuid not null   -- denormalized for cheap dashboard queries
facility_id      text not null → cabins (cascade delete)
found_date_from  date not null   -- the opening found (may differ from alert range when flexible)
found_date_to    date not null
email_to         text not null
type             text default 'email'   -- delivery channel
status           text default 'sent'    -- 'sent' | 'failed'
dismissed_at     timestamptz nullable   -- visibility only; does NOT affect dedup
sent_at          timestamptz default now()
unique (alert_id, found_date_from, found_date_to)   -- cron inserts ON CONFLICT DO NOTHING
```
- **Dedup is per-opening:** a re-seen opening (even a dismissed one) never re-sends.
- `dismiss` via `PATCH /api/notifications/[id] { dismissed: true }`.
- We persist **openings**, never raw availability (rec.gov stays the live source of truth).

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

## Notifications & email pipeline

When a watched cabin opens up, the user gets an email. Built around the `notifications`
ledger. Full design in `docs/notifications-architecture.md`.

```
Vercel Cron (daily — vercel.json)  →  GET /api/cron/check-alerts  (CRON_SECRET-guarded)
  → checkAlerts(liveDeps)            lib/notifications/check.ts
      active cancellation alerts; ONE rec.gov fetch per facility (batched);
      strict = exact range available · flexible = every bookable run within ±7 days
  → sendOpeningNotification(...)     lib/notifications/send.ts
      claim row ON CONFLICT DO NOTHING → render React Email → Resend → email
```

- **Availability matching** is in `lib/availability.ts`, shared by the booking panel and
  the cron (one source of truth). Bookability = rec.gov `availabilities` status ===
  `"Available"` — NOT the parallel `quantities` (stays `1` even when `"Closed"`).
  `"Closed"` counts as watchable (→ cancellation alert); missing/NYR → not-open.
- **Email template**: `emails/availability-alert.tsx` (React Email + Resend), brand colors
  inline, wordmark = `public/email/logo.png` (image; clients ignore webfonts). Preview
  gallery at `/emails`. Buttons deep-link to `/my-alerts?alert=<id>`.
- **Service-role client**: `lib/supabase/service.ts` (bypasses RLS, resolves emails via the
  auth admin API) for the cron + triggers.
- **On-demand triggers** (skip the checker, send instantly):
  - `POST /api/dev/trigger-alert { alertId }` — self-serve, caller's own alert. Powers the
    "Trigger test email" button on the confirmation view.
  - `POST /api/admin/trigger-alert { alertId, email? }` — admin-only (`EMBER_ADMIN_EMAIL`),
    any alert. Operator bookmarklet documented in `docs/admin-bookmarklet.md`.
- **Dev mock**: `EMBER_MOCK_AVAILABILITY` short-circuits the rec.gov fetch with synthetic
  availability so the full pipeline runs without a real cancellation (`1`/`all` = every
  night available; a comma-separated `YYYY-MM-DD` list = only those dates).
- **Reminders are parked** — the cron processes `type='cancellation'` only.

### Env vars (this feature)
| Key | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend auth (required for any send) |
| `EMBER_FROM_EMAIL` | sender (defaults to `onboarding@resend.dev` in dev) |
| `CRON_SECRET` | guards the cron route in prod (Vercel sets the Bearer header); route is open in dev |
| `EMBER_ADMIN_EMAIL` | gates `/api/admin/trigger-alert` |
| `EMBER_MOCK_AVAILABILITY` | dev synthetic availability |
| `NEXT_PUBLIC_SITE_URL` | base for email links + the wordmark image (prod domain; localhost in dev) |

**Prod deploy needs:** set the above in Vercel, and **verify a Resend domain** to email
addresses other than your own account (the `onboarding@resend.dev` sender only delivers to
the account owner).

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
| `smoke-deep` | `#35444d` | Info toast surface (smoke at 30% brightness) |

(The error toast reuses the `destructive` button's Tailwind reds: `bg-red-900/50`, `border-red-500/30`, `text-red-300`.)

Layout tokens: `--container-nav-search: 600px` (centered nav search bar) and `--container-toast: 582px` (toast width) — both power `max-w-*` named utilities, which in Tailwind v4 require a `--container-*` token, **not** `--width-*` (that only powers `w-*`, e.g. `--width-opening-card: 300px` for the min-width of a notification "window" card).

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
- `availability-panel.tsx` — full booking widget. Fetches rec.gov availability, calendar with date states, three CTA states (book / alert / reminder), alert-setup + reminder-setup + confirmed views. Auth-gated: triggers Google OAuth if not signed in, restores view+dates from URL params after redirect. The **confirmed view** (cancellation alerts) has a "Trigger test email" button that fires `POST /api/dev/trigger-alert` and pops a toast.
- `toast.tsx` — `<Toast intent="info|success|error" title description icon? onDismiss?>`. Position-agnostic visual: deep surface + bright intent icon (success = `ember-range`/`ember`, info = `smoke-deep`/`smoke`, error = destructive-button reds), bold title + regular description, self-dismissing X.
- `toast-provider.tsx` — `<ToastProvider>` (wraps the app in `app/layout.tsx`) + the `useToast()` hook: `toast({ intent, title, description, icon, duration })`. Renders a portal'd **top-right** stack, auto-dismiss 5s (X closes early), framer-motion slide-in/out. Fire from anywhere.
- `spinner.tsx` — `<Spinner size={24} />` centered loading indicator.
- `use-cabin-search.ts` — headless cabin-search hook. Loads cabin list + builds Fuse index **once at module level** (shared singleton across all consumers). Returns `query/setQuery/ready/q/visibleResults/hasMore/handleScroll`. No UI.
- `search.tsx` — vertical cabin autocomplete (landing `AlertForm`). Consumes `useCabinSearch`. cmdk input + dark dropdown, infinite scroll. Navigates to `/cabin/{id}` in a new tab on select.
- `nav-search.tsx` — `<NavSearch />`, the horizontal joint bar in the scrolled top nav. Consumes `useCabinSearch`. Owns `selectedCabin`/`checkIn`/`checkOut`/`popover`. Left = cabin autocomplete (commits cabin, dark dropdown); right = `CalendarInput` popover (evergreen, no availability data) + ember submit arrow (disabled until a cabin is picked; **dates optional**). Submit → `router.push('/cabin/{id}?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD')`, params omitted when no dates. `AvailabilityPanel` reads these params and pre-selects the range.
- `status-bar.tsx` — "● last checked Xs ago" + rec.gov link bar
- `toggle-options.tsx`, `radio-options.tsx` — form toggle primitives
- `confirmation-animations.tsx` — success state animations

### `components/alerts/` — the `/my-alerts` dashboard
- `alert-card.tsx` — a Currently Watching / Past alert (mobile + desktop blocks, collapse/expand, cancel-with-modal). `defaultExpanded` prop; expanding syncs `?alert=<id>` to the URL via `history.replaceState`.
- `alert-card-list.tsx` — renders cards, wrapping each in an `id="alert-<id>"` anchor; `targetAlertId` makes the deep-linked card start expanded.
- `notification-card.tsx` — a Needs Attention card: groups un-dismissed openings for one alert into a **swipeable "window" carousel** (responsive `33/50/100%` widths, prev/next arrows that disable at bounds, right-edge fade when a card is cut off, scroll-snap, 300px min-width). Each window: found dates + price + Book + Dismiss.
- `deep-link-scroll.tsx` — on initial load, scrolls to and briefly ember-glows the `?alert=<id>` card (`.deep-link-flash`).

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
| `docs/notifications-architecture.md` | Cron + email pipeline design (matching, dedup, dev mode) |
| `docs/admin-bookmarklet.md` | One-click operator "trigger alert" bookmarklet |
| `lib/availability.ts` | rec.gov fetch + shared availability matcher (used by panel + cron) |
| `lib/availability-mock.ts` | `EMBER_MOCK_AVAILABILITY` synthetic availability |
| `lib/notifications/check.ts` | openings checker (`checkAlerts`, `matchAlert`, `liveDeps`) |
| `lib/notifications/send.ts` | sender (`sendOpeningNotification`, `deliverEmail`, `buildEmailPayload`, `liveSendDeps`) |
| `lib/notifications/run.ts` | cron orchestration (`runNotifications`, `isCronAuthorized`) |
| `lib/supabase/service.ts` | service-role client for the cron + triggers |
| `emails/availability-alert.tsx` | React Email template (Resend) |
| `app/api/cron/check-alerts/route.ts` | the cron route (`vercel.json` schedules it daily) |
| `app/api/{dev,admin}/trigger-alert/route.ts` | on-demand send (self-serve / admin) |
| `app/api/notifications/[id]/route.ts` | dismiss a notification |

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
10. Tests: **Vitest** (`npm run test`). Pure lib logic is unit-tested — the availability matcher (`lib/availability.test.ts`), the openings checker, the sender, and the cron orchestration. Add tests alongside new pure functions.
