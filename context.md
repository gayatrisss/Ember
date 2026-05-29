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

Availability is **never stored** — it's always a live call to the rec.gov availability endpoint using `facility_id` as the campground ID. For the demo it's mocked.

---

## Design system

All tokens in `app/theme.css` inside `@theme {}`. Use as Tailwind utilities.

### Colors
| Token | Hex | Usage |
|---|---|---|
| `night` | `#0f1510` | Page background |
| `evergreen` | `#1a241b` | Cards, elevated surfaces |
| `ember` | `#d45a20` | Brand accent, CTAs |
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

### Layout
- `.page-container` — always use this for full-width sections. Responsive: 24px mobile → 48px tablet → 120px desktop, max-width 1280px.
- Never apply `px-gutter` or `px-[120px]` manually.
- Grids always start `grid-cols-1`, add breakpoint columns on top.
- Fixed widths always have a `w-full` base: `w-full lg:w-sidebar`.

### Shadows
`shadow-ember-sm` / `shadow-ember-md` / `shadow-ember-lg`

---

## Component inventory

### `components/ui/` — reusable primitives
- `input.tsx` — styled `<input>`
- `field.tsx` — `<Field>` (label below input) + `<FieldControl>` (non-input variant)
- `button.tsx` — CVA button with variants
- `calendar-input.tsx` — date range picker, Mon–Sun grid, ember selection colors
- `search.tsx` — search bar used in landing + search page
- `status-bar.tsx` — "● last checked Xs ago" + rec.gov link bar
- `toggle-options.tsx`, `radio-options.tsx`, `input-group.tsx` — form primitives
- `dialog.tsx`, `command.tsx` — modal/command palette
- `confirmation-animations.tsx` — success state animations
- `text-input.tsx`, `textarea.tsx` — text form controls

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
