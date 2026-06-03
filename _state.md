# Ember — Session State

> Update this file at the end of every session. Takes 30 seconds. Saves 10 minutes rebuilding context.
> Start a new session by saying: "read _state.md and pick up where we left off."

---

## Current phase
**Build phase — Week 3**
Landing page live. Listing page live with real availability data. Next: listing page mobile polish, then search/map page.

## Last session (2026-06-02)

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

## Next tasks (priority order)
1. **Listing page polish** — mobile layout review, description text, image gallery
2. **Search / Map page** — lat/lng in Supabase, ready to drop map pins
3. **Alert flow** — Supabase Auth magic link, insert into `alerts` table

## Decisions log (stable — do not re-litigate)
- Search: Supabase + fuse.js client-side, all 519 cabins loaded on mount, opens in new tab
- Availability: live call to rec.gov's undocumented internal API. **Known risk: endpoint can vanish without notice.** Acceptable for portfolio demo.
- Route: `/cabin/[id]` — `id` param = `facility_id` from RIDB/Supabase
- Auth: Supabase magic link, signup inside alert flow
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

## Build status
| Page | Design | Code | Deployed |
|---|---|---|---|
| Landing | ✅ | ✅ | ✅ |
| Listing | ✅ | ✅ | 🔲 |
| Search / Map | ✅ | 🔲 | 🔲 |
| Alert dashboard | 🔲 | 🔲 | 🔲 |
| Email templates | 🔲 | 🔲 | 🔲 |
