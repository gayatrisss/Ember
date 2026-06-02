# Ember — Session State

> Update this file at the end of every session. Takes 30 seconds. Saves 10 minutes rebuilding context.
> Start a new session by saying: "read _state.md and pick up where we left off."

---

## Current phase
**Build phase — Week 2**
Landing page live. Supabase seeded + enriched. Listing page built. Next: polish listing page, then wizard or map page.

## Last session (2026-05-29)
- Built listing page (`app/cabin/[id]/page.tsx`) — full rewrite from scaffold
  - Server component fetching cabin + images from Supabase
  - `components/listing/cabin-header.tsx` — rec area badge, Fraunces title, 4-item facts row
  - `components/listing/topo-image.tsx` — cabin photo fading into topo contour SVG + ember pin dot
  - `components/listing/field-notes.tsx` — dynamic pool of 8 notes, shows best 6 with data
  - `components/ui/status-bar.tsx` — updated to accept optional `facilityId`, constructs rec.gov URL
  - `lib/format.ts` — `formatFacilityName`, `getCabinType`, `confident()`, `formatAccess`, `formatWater`, `formatRate`, `formatTime`
  - `types/cabin.ts` — full Cabin + CabinImage types
- Second RIDB ingest pass (`scripts/ingest_attributes.py`)
  - Pulled structured campsite attributes from RIDB export CSV files
  - New columns added to Supabase `cabins`: `checkin_time`, `checkout_time`, `num_beds`, `bed_type`, `nightly_rate`
  - Coverage: checkin/checkout 97%, sleeps (now structured) 97%, num_beds 38%, bed_type 32%, pets 34%, nightly_rate 54 cabins
  - `sleeps` updated from "Max Num of People" attribute (more reliable than regex, `sleeps_conf = 1.0`)
  - `nightly_rate` extracted via regex from `FacilityUseFeeDescription` HTML
- Field notes use a priority pool: ACCESS → ELEVATION → HEAT → WATER → SEASON → STAY LIMIT → CHECK-IN → CHECK-OUT. First 6 non-null values shown. Check-in/checkout only appear when primary fields are sparse.
- Facility name formatting: title-case + preserve 2-letter state codes e.g. "Fox Creek Cabin (MT)"
- Signal and cell coverage: only 1% of cabins have it in RIDB — shows `—`, not worth a live API call

## Next tasks (priority order)
1. **Listing page polish** — description text, image gallery, mobile layout review
2. **Wizard** — calendar + alert flow (needs rec.gov reservations endpoint for real availability)
3. **Search / Map page** — lat/lng is in Supabase, ready to drop map pins
4. **Alert flow** — Supabase Auth magic link, insert into `alerts` table

## Decisions log (stable — do not re-litigate)
- Search: Supabase + fuse.js client-side, all 519 cabins loaded on mount, opens in new tab
- Availability: live call to rec.gov's undocumented internal API (`/api/camps/availability/campground/{facilityId}/month`). Not scraping HTML — hitting the same JSON endpoint their frontend uses. **Known risk: rec.gov can change or block this endpoint at any time with no notice, which would break the wizard entirely.** Acceptable tradeoff for a portfolio demo; would need an official API or scraping fallback in production.
- Route: `/cabin/[id]` — `id` param = `facility_id` from RIDB/Supabase
- Auth: Supabase magic link, signup inside alert flow
- Facility name format: title-case + preserve parentheticals as-is (e.g. "(MT)", "(AK)")
- Signal: `—` always — only 1% RIDB coverage, not worth a live API call
- Nightly rate: from RIDB `FacilityUseFeeDescription` regex — 54/519 cabins, shows `—` otherwise
- shadcn/ui: not installed yet — add only for Calendar, Dialog, Popover, Select, Sonner, Form
- Type scale: locked — never use arbitrary `text-[Xpx]`
- Container: always `.page-container` — never manual padding

## Data sources
| Field | Source | Coverage |
|---|---|---|
| cabin metadata | RIDB bulk dump → `data/ember.db` → Supabase | 519 cabins |
| images | RIDB Media → Supabase `cabin_images` | 3,818 images |
| sleeps | CampsiteAttributes "Max Num of People" | 97% |
| checkin/checkout | CampsiteAttributes | 97% |
| heat/water/access/season | regex from description (`_conf >= 0.8`) | ~50–70% |
| nightly_rate | regex from `FacilityUseFeeDescription` | ~10% |
| signal/price | rec.gov API only — not fetched | — |

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
- Use `update()` not `upsert()` for Supabase rows that already exist (upsert requires all NOT NULL columns)
- Python < 3.10: use `Optional[X]` not `X | None` for type hints

## Build status
| Page | Design | Code | Deployed |
|---|---|---|---|
| Landing | ✅ | ✅ | ✅ |
| Search / Map | ✅ | 🔲 | 🔲 |
| Listing | ✅ | ✅ | 🔲 |
| Alert dashboard | 🔲 | 🔲 | 🔲 |
| Email templates | 🔲 | 🔲 | 🔲 |
