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
| Deployment | Vercel (auto-deploys on push to `main`) |
| Formatter | Prettier (`npm run format`, format-on-save in VS Code) |

---

## Database — Supabase

Project URL: `https://hbbqnptnopgrxproigux.supabase.co`

### `cabins` — 519 rows, public read
Seeded from RIDB bulk data via `scripts/ingest_ridb.py` + `scripts/seed_supabase.py`.

Primary key: `facility_id` (text) — the RIDB FacilityID, same ID used in Recreation.gov availability API and the app's `/cabin/[id]` route.

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
Columns: `id` (uuid), `user_id` (FK → auth.users), `facility_id`, `date_from`, `date_to`, `active`.
Requires Supabase Auth session — anon key cannot write.

### `notifications` — append-only log
One row per alert fired. Columns: `alert_id`, `sent_at`, `type` (email/sms/push), `availability_date`, `message`.
Users can read their own (RLS joins through `alerts`). Written server-side only.

### Supabase client
`lib/supabase.ts` — singleton using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Public tables (cabins, cabin_images) work with the anon key. Alerts require auth.

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
| `night` | `#0f1510` | Page background |
| `evergreen` | `#1a241b` | Cards, elevated surfaces |
| `ember` | `#d45a20` | Brand accent, CTAs |
| `ember-selected` | `#b24c1b` | Calendar selected dates (80% brightness) |
| `ember-range` | `#803913` | Calendar in-range / hover bg (50% brightness) |
| `smoke` | `#5f7a8a` | Muted text |
| `wax` | `#ede8dc` | Primary text |

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

### Shadows
`shadow-ember-sm` / `shadow-ember-md` / `shadow-ember-lg`

---

## Component inventory

### `components/ui/` — reusable primitives
- `field.tsx` — `<Field>` (label below input) + `<FieldControl>` (non-input variant)
- `text-input.tsx` — styled text input with underline + outline variants
- `button.tsx` — CVA button with variants (via @base-ui/react)
- `calendar-input.tsx` — date range picker. Exports `CalendarInput` + `CalendarHeader`. Props: `checkIn`, `checkOut`, `onChange`, `bookedDates?`. Root is `w-fit mx-auto`.
- `date-cell.tsx` — calendar cell primitive. States: `default`, `disabled`, `day`, `hover`, `selected`, `in-range`. Positions: `single`, `start`, `end`. Used in both CalendarInput and /design.
- `booking-panel.tsx` — shell for booking flows: `h-[600px]`, `p-9`, title + `flex-1` content + sticky CTA slot.
- `availability-panel.tsx` — full booking widget. Fetches rec.gov availability, shows calendar with disabled dates, three CTA states, alert/reminder wizard.
- `spinner.tsx` — `<Spinner size={24} />` centered loading indicator.
- `search.tsx` — search bar used in landing + search page
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

**Always check `components/ui/` before building any new element.**

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
