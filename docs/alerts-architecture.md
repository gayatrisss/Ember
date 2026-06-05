# Alerts — Architecture

This doc covers the data model, the server action, and the end-to-end flow for creating
and storing alerts in Ember.

---

## What an alert is

An alert is a record that says: **"notify this user when this cabin becomes bookable for
these dates."** There are two flavours:

- **Cancellation alert** (`type: "cancellation"`) — the cabin is booked. The user wants
  to know if a cancellation opens up. They can choose strict dates or a ±7-day window.
- **Reminder** (`type: "reminder"`) — the booking window isn't open yet. The user wants
  a heads-up 1 day or 1 week before the window opens.

Both are rows in the same `alerts` table. The `type` column distinguishes them.

---

## The `alerts` table

### Original schema

```sql
alerts (
  id          uuid primary key,
  user_id     uuid not null,   -- FK to auth.users
  facility_id text not null,   -- FK to cabins
  date_from   date not null,
  date_to     date not null,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
)
```

### Target schema (v2 migration)

```sql
alerts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null,          -- FK to auth.users, cascades on delete
  facility_id         text not null,          -- FK to cabins, cascades on delete
  type                text not null,          -- "cancellation" | "reminder"
  date_from           date not null,
  date_to             date not null,
  flexibility         text,                   -- "strict" | "flexible" (cancellation only)
  notify_when         text,                   -- "1day" | "1week" (reminder only)
  notification_method text not null default 'email', -- "email" | "sms"
  status              text not null default 'active', -- "active" | "triggered" | "cancelled"
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
)
```

`active` is dropped — `status` covers everything it did and more.

`cabin_name` is not denormalized here. The cabin table is 519 rows; joining on `facility_id`
when building a notification payload is trivially cheap.

### What changed and why

| Column | Change | Reason |
|---|---|---|
| `type` | Added | Distinguishes cancellation alerts from reminders. Required to know what to check and when to fire. |
| `flexibility` | Added (nullable) | For cancellation alerts: `"strict"` = exact dates, `"flexible"` = ±7 days. |
| `notify_when` | Added (nullable) | For reminders: `"1day"` or `"1week"` before the booking window opens. |
| `notification_method` | Added | `"email"` (default) or `"sms"`. All users start on email; column is in place for SMS when Twilio is added. |
| `status` | Added | Three states: `"active"` (watching), `"triggered"` (notification sent), `"cancelled"` (user cancelled). A boolean can't express "triggered". |
| `active` | Dropped | Replaced by `status`. |

### Constraints

**Unique constraint:** `(user_id, facility_id, date_from, date_to)` — prevents exact duplicate
alerts. Returns Postgres error code `23505`, which the server action handles with a friendly
"You're already watching this" message.

**Exclusion constraint (GiST):** prevents overlapping date ranges for the same user + cabin:

```sql
EXCLUDE USING gist (
  user_id     WITH =,
  facility_id WITH =,
  daterange(date_from, date_to, '[)') WITH &&
)
```

Requires the `btree_gist` extension (enabled in the migration) to mix uuid/text columns
with a range type in a single exclusion constraint. Partial overlaps return error code
`23P01` — the server action will need a handler for that when the overlap error UX is
wired up. Exact duplicates are caught by the unique constraint first (btree beats gist).

**RLS policies (already on the table):**
- Select: `auth.uid() = user_id`
- Insert: `auth.uid() = user_id`
- Update: `auth.uid() = user_id`
- Delete: `auth.uid() = user_id`

---

## How it works end to end

```
User on listing page
  │
  ├─ Picks booked dates → "Set up an alert"
  │     If not signed in → Google OAuth → returns to listing page
  │
  ├─ alert-setup view: chooses flexibility (Strict / ±7 Days)
  │
  ├─ Clicks "Confirm alert"
  │     │
  │     └─ createAlert() server action
  │           ├─ Gets user from Supabase session (server-side cookie)
  │           ├─ Inserts row into alerts table
  │           │     On 23505 (exact duplicate) → "You're already watching this cabin"
  │           │     On 23P01 (overlap) → "You already have an alert covering these dates"
  │           └─ Returns { ok: true, email } on success
  │
  └─ "confirmed" view: "We'll notify you at [email]"
```

The reminder flow is identical, just with `type: "reminder"` and `notify_when` instead
of `flexibility`.

---

## The server action

`app/actions/alerts.ts` — a single `createAlert()` server action.

**Input:**
```ts
{
  facilityId: string
  type: "cancellation" | "reminder"
  dateFrom: string        // "YYYY-MM-DD"
  dateTo: string          // "YYYY-MM-DD"
  flexibility?: "strict" | "flexible"   // cancellation only
  notifyWhen?: "1day" | "1week"         // reminder only
  notificationMethod?: "email" | "sms"  // defaults to "email"
}
```

**What it does:**
1. Creates a server-side Supabase client (reads the session cookie)
2. Calls `supabase.auth.getUser()` — if no session, returns an auth error
3. Inserts the alert row with `user_id = user.id`
4. On `23505` (exact duplicate): returns "You're already watching this cabin for those dates"
5. On `23P01` (overlapping range): returns "You already have an alert covering these dates"
6. On success: returns `{ ok: true, email: user.email }`

No API route needed. Server actions in Next.js App Router run on the server and have
direct access to the session cookie.

---

## The cron job (cancellation alerts only)

The background job queries `alerts` where `status = 'active' AND type = 'cancellation'`,
groups by `facility_id` to batch API calls, checks rec.gov availability, and fires
notifications for any open dates that match the alert window.

The user's email comes from `auth.users` (join on `user_id`) — it is not stored on the
alert row.

**Reminder processing is deferred.** Reminders are saved to the DB and sit with
`status = 'active'`, but the cron job skips `type = 'reminder'` rows for now. The blocker
is that firing a reminder requires knowing when the booking window opens for each facility,
which varies across rec.gov properties and is not currently stored. The solution (likely
storing `booking_window_opens_at` on the alert at creation time) will be designed when
the reminder notification pipeline is built.

---

## What we are NOT building yet

- **The background job** itself — stored alerts only, no polling or notification sending yet.
- **An alerts dashboard** for users to view/cancel their alerts.
- **Email sending** — alerts will be saved but no emails will fire yet.
- **Reminder processing** — see cron job section above.

The goal of this milestone is: alert is created, stored correctly, and the user sees
confirmation with their email address.

---

## Migration

`supabase/migrations/20260604180000_alerts_v2.sql`

- Enables `btree_gist`
- Adds `type`, `flexibility`, `notify_when`, `notification_method`, `status`
- Drops `active`
- Adds unique constraint on `(user_id, facility_id, date_from, date_to)`
- Adds GiST exclusion constraint for overlapping ranges
- Replaces `idx_alerts_active` with `idx_alerts_status_active`

To apply locally: `supabase db reset`
To push to production: `supabase db push`
