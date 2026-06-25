# Notifications — Architecture

How Ember polls Recreation.gov for cancellations and emails users when their watched
dates open up. This is the second half of the alerts feature — `docs/alerts-architecture.md`
covers how alerts are *created and stored*; this doc covers how they *fire*.

---

## The pipeline

```
Vercel Cron  (schedule in vercel.json)
   │  Authorization: Bearer $CRON_SECRET
   ▼
GET /api/cron/check-alerts          ← service-role Supabase client (bypasses RLS,
   │                                    reads across all users + auth.users for email)
   │
   1. SELECT alerts WHERE status='active' AND type='cancellation'
   2. group by facility_id  → fetch the UNION of months every alert needs (one fetch
      per month, deduped across the facility's alerts), merge into one date-keyed cache
   3. for each alert: run the matcher (lib/availability.ts)
        strict   → entire [date_from, date_to] one available block?      (0 or 1 opening)
        flexible → every maximal available run within [from-7, to+7]      (0..N openings)
   4. for each opening found:
        - INSERT notifications row  ON CONFLICT (alert_id, found_from, found_to) DO NOTHING
        - row inserted? → send the email (Resend)
        - conflict?     → already notified for this exact opening → skip
   (the alert stays 'active' — it keeps watching for more openings)
```

### Dedup: the notifications table is the ledger

An alert is a **standing subscription** over a window, and one window can surface **many
distinct openings over time** (each weekend, etc.). So dedup is **per-opening, not
per-alert** — flipping the alert to a `triggered` state would wrongly silence every opening
after the first.

The ledger is the `notifications` table with a **unique constraint on
`(alert_id, found_date_from, found_date_to)`**. The cron inserts `ON CONFLICT DO NOTHING`:
**row inserted → send; conflict → already notified, stay silent.** Atomic and race-safe
across overlapping cron runs.

- **Alerts stay `active`** for the life of the subscription (until cancelled or the window
  passes). They never go to `triggered`.
- **Dismissal is a separate `dismissed_at` column and does NOT affect dedup.** A dismissed
  July 8–9 row still exists, so the cron still conflicts on it and never re-notifies — even
  though it sees the opening every 15 minutes. `dismissed_at` only controls dashboard
  visibility.

> **Dashboard impact** — this overrides the earlier "Needs Attention = `status='triggered'`"
> decision (`_state.md` / `docs/alerts-architecture.md`). A multi-opening watch can't be a
> single flag. New split: **Currently Watching** = active alerts; **Needs Attention** =
> un-dismissed `notifications` rows (the actual openings, each with a book link + dismiss).
> Two different entities — `/my-alerts` query needs reworking.

**v1 assumptions:** no minimum-nights floor (a single open night in a flexible range is an
opening); a found block is deduped by exact `(from, to)`, so a run that later splits into
shorter runs yields new openings — acceptable noise.

### Separation of concerns: checker vs. sender

The two halves are deliberately split so each can be exercised independently:

- **Checker** (`lib/notifications/check.ts`) — "should we notify this alert, and for which
  dates?" Pure-ish: takes an alert + a facility's availability JSON, returns a match or null.
- **Sender** (`lib/notifications/send.ts`) — "deliver this notification." Takes a resolved
  payload (cabin, found dates, recipient), records it, sends the email.

The cron wires them together. **Demo and tests each tap a different point** (see below).

---

## Availability matching — shared with the UI

The "is this range available?" judgment must be **identical** to what the booking panel
shows, or the cron will email about dates the UI calls booked (or vice versa). So the pure
matching functions live in `lib/availability.ts` (next to the fetch) and are imported by
**both** `availability-panel.tsx` and the cron. One source of truth — no drift.

Extracted from the panel:
- `dateKey(date)` — `"YYYY-MM-DDT00:00:00Z"`, the rec.gov quantity-key format
- `extractAvailableDates(monthCache)` — every date with `quantity === 1` on any campsite
- `parseStatus(campsites, checkIn, checkOut)` — `"available" | "booked" | "not-open"`
- `getMonthKeys(checkIn, checkOut)` — `"YYYY-MM"` keys spanning a range

New for the cron:
- `mergeCampsites(monthJsons[])` — merges many months' campsite-quantity maps into one
  object keyed by absolute date (already done inline in the panel; extract it).
- `findAvailableWindows(mergedCampsites, searchFrom, searchTo)` — returns **every maximal
  contiguous run of available nights** in the window as `{ from, to }[]`. Used by the
  `flexible` path (cron pads the window ±7 before calling). The `strict` path doesn't need
  this — it just reuses `parseStatus(merged, date_from, date_to) === "available"`.

### Multi-month spanning is transparent

The matcher never reasons about months — availability is keyed by **absolute date**
(`"2026-07-08T00:00:00Z"`), so the night-by-night walk just looks up each night's key and
crosses month boundaries invisibly. The only requirement is that the merged cache contains
**every month the window touches**. The cron guarantees this by computing
`getMonthKeys(date_from − pad, date_to + pad)` per alert, unioning across the facility's
alerts, fetching each month once, and `mergeCampsites`-ing them. An all-summer alert is
just three month fetches merged before matching — no special-casing.

---

## The `notifications` table

One row per notification fired. Feeds the email payload, the "Needs Attention" section,
and (later) real "Lately on Ember" data.

A `notifications` table already existed (from the original schema) with a single
`availability_date` + free-text `message`. Migration `20260623150000_notifications_v2.sql`
reshapes it (it had never been written to) — a single date can't represent a multi-night
opening, so it's replaced with a `found_date_from`/`found_date_to` range plus the dedup
constraint. Resulting shape:

```sql
notifications (
  id               uuid primary key default uuid_generate_v4(),
  alert_id         uuid not null references alerts(id) on delete cascade,
  user_id          uuid not null,        -- denormalized for cheap dashboard queries
  facility_id      text not null,        -- FK -> cabins, cascade on delete
  found_date_from  date not null,        -- the opening we found (may differ from the alert
  found_date_to    date not null,        --   range under flexibility = 'flexible')
  email_to         text not null,        -- snapshot of recipient at send time
  type             text not null default 'email',  -- delivery channel: email | sms | push
  status           text not null default 'sent',   -- delivery outcome: sent | failed
  dismissed_at     timestamptz,          -- null = un-dismissed (shows in Needs Attention)
  sent_at          timestamptz default now(),

  -- dedup ledger: one row per distinct opening, ever. cron inserts ON CONFLICT DO NOTHING.
  unique (alert_id, found_date_from, found_date_to)
)
```

`dismissed_at` controls **dashboard visibility only** — it does not affect dedup (a
dismissed row still blocks re-notification via the unique constraint).

RLS: select + update (for dismiss) where `auth.uid() = user_id`. Inserts happen only via the
service-role cron, which bypasses RLS.

---

## Persistence: what we store, what we don't

We persist **openings** (the `notifications` rows), **not raw rec.gov availability**.

- **rec.gov stays the live source of truth.** The booking panel always fetches live, so it
  can never show a stale "available" for a site that's since been booked — the worst bug
  class for something users book against. A snapshot table would be stale up to a full cron
  interval (~15 min).
- **The notifications ledger is our memory.** Newness/dedup is answered by "have we already
  told this user about this exact opening?" (the unique constraint) — never by diffing
  today's grid against yesterday's. So we don't need to store the grid.
- **"Lately on Ember" reads the ledger too** — recent openings are `notifications` rows, not
  raw availability.
- **Politeness to rec.gov is caching, not persistence.** `fetchMonthAvailability` already
  uses `next: { revalidate: 300 }`, so cron batch-fetches and panel fetches dedupe through
  Vercel's Data Cache. If that's ever insufficient, Vercel's Runtime Cache (ephemeral,
  tag-invalidated) is the next step — still not a durable snapshot.

**When this flips:** only if we add a feature the live model can't serve — time-series
*trend/history* ("this cabin cancels often," availability sparklines). That needs snapshots,
but it's a new feature, not infrastructure the cron requires. Deferred.

---

## Email — Resend + React Email

- **Provider:** Resend. Vercel-native, generous free tier, `RESEND_API_KEY` in env.
- **Template:** `emails/availability-alert.tsx` — a React Email component built from the
  Figma email design. Brand colors as **inline styles** (email clients can't take Tailwind
  utility classes reliably). Payload: cabin name, found date range, rec.gov book link.
- **Dev sending:** Resend sends from `onboarding@resend.dev` to your own verified address
  with zero setup. Sending to *other* testers requires a verified domain.

---

## Dev mode & demo (portfolio-critical)

Vercel Hobby cron fires only **once per day**, so you can never wait for the real cron in a
live demo. Three tools cover testing, local dev, and demos:

1. **Mock-availability flag** — `EMBER_MOCK_AVAILABILITY=1` makes the fetch layer return
   synthetic "available" JSON for watched facilities. Runs the **real pipeline end to end**
   (the checker genuinely decides "available" on fake data → sender fires). Best for testing
   the actual matching logic without rec.gov cooperating.

2. **Force-trigger endpoint** — `POST /api/dev/trigger-alert { alertId }`. Gated to non-prod
   (or behind a secret). **Skips the checker**, calls the sender directly with synthetic match
   dates. The demo button: set an alert, tap, email lands in seconds.

3. **"Send me a test alert" affordance** — a dev/demo-only button on the confirmed view /
   `/my-alerts` that calls #2, so someone trying the product *feels the payoff* immediately.

| Tool | Checker runs? | rec.gov needed? | Use |
|---|---|---|---|
| Mock-availability flag | ✅ real | ❌ mocked | test the logic |
| Force-trigger endpoint | ❌ skipped | ❌ | local dev / demo |
| UI button | ❌ skipped | ❌ | live portfolio demo |

---

## Reminders still parked

The cron processes `type='cancellation'` only. `type='reminder'` rows stay `'active'` and are
skipped — firing them needs `booking_window_opens_at` per facility, which isn't stored yet.
See `docs/alerts-architecture.md`.

---

## Schedule

`vercel.json` runs `/api/cron/check-alerts` **daily** (`0 13 * * *`). The Vercel **Hobby**
plan caps crons at once per day and rejects sub-daily schedules; on **Pro** this would be
`*/15 * * * *`. Daily is fine for the portfolio because the cron's correctness is covered by
tests and live demos use the force-trigger button — neither depends on real polling cadence.
For genuinely frequent free polling, an external scheduler (Upstash QStash, GitHub Actions)
can hit the `CRON_SECRET`-guarded route without app changes.

---

## Env vars

| Key | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend auth |
| `CRON_SECRET` | Vercel sets `Authorization: Bearer` on cron calls; route rejects mismatches |
| `EMBER_MOCK_AVAILABILITY` | `1` to short-circuit the fetch layer with synthetic availability |
| `EMBER_FROM_EMAIL` | sender address (defaults to `onboarding@resend.dev` in dev) |
| `NEXT_PUBLIC_SITE_URL` | base URL for email links + the wordmark image (prod domain; localhost in dev) |
