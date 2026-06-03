# Ember — Session State

> Update this file at the end of every session. Takes 30 seconds. Saves 10 minutes rebuilding context.
> Start a new session by saying: "read _state.md and pick up where we left off."

---

## Current phase
**Build phase — Week 3**
Landing page live. Listing page live with real availability data. Google OAuth auth fully wired. Next: alert save to Supabase.

## Last session (2026-06-03)

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

## Next tasks (priority order)
1. **Alert save** — wire "Confirm alert/reminder" to a server action that inserts into Supabase `alerts` table. Needs schema first (see planning notes).
2. **Listing page polish** — mobile layout review, description text, image gallery
3. **Search / Map page** — lat/lng in Supabase, ready to drop map pins

## Alert system — planning notes (2026-06-03)

### Constraints to design around
1. **No auth yet.** Alerts are user-agnostic for the initial build. When auth is added later we'll run a migration to add a `user_id` column to `alerts` and associate records with a starter/anonymous user. Schema should be designed with this migration in mind — don't make `user_id` NOT NULL yet.

2. **Deduplication.** The same person shouldn't be able to create duplicate alerts for the same cabin + date range. Need a uniqueness strategy — likely a unique constraint on `(contact, facility_id, date_from, date_to)` or similar.

3. **Contact collection.** The alert form collects phone number (SMS) and/or email. These are the only identity signals we have pre-auth. `contact` on the alert row should store whichever was provided.

4. **Testing strategy.** Entering higher-stakes territory than UI work. Need a plan for: unit testing the alert insert logic, integration testing the dedup constraint, and a way to verify SMS/email actually fires. Don't want to ship a broken alert product to users.

### Three CTA states (all UI already built)
1. **Available** → "Book on Recreation.gov →" (external link, nothing saved)
2. **Booked** → "Set up an alert →" → alert-setup view (flexibility toggle + notify method) → "Confirm alert"
3. **Not open** → "Set a reminder →" → reminder-setup view (notify-when toggle + notify method) → "Confirm reminder"

### Alert vs Reminder distinction
- **Alert** (`type: "cancellation"`): cabin is booked, user wants to know if a cancellation opens up. Has `flexibility` field (strict / ±7 days).
- **Reminder** (`type: "reminder"`): booking window not open yet, user wants a heads-up before it opens. Has `notify_when` field (1 day / 1 week before open date).

### Decisions made
- **SMS dropped.** Email only. No Twilio, no phone OTP.
- **Auth before alert flow.** Google OAuth via Supabase gives us a verified email, so the
  "How should we notify you?" step on the alert panel is removed entirely.
- **Contact input step removed.** Email comes from `auth.users.email` post-sign-in.

### Open questions (tackle piece by piece)
- Supabase function vs Next.js server action for the alert insert?
- What testing tools/approach fits this stack?
- Deduplication: unique constraint on `(user_id, facility_id, date_from, date_to)`?

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
