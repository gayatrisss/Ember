-- Enable btree_gist so we can mix uuid/text columns with daterange
-- in a single exclusion constraint
create extension if not exists btree_gist;

-- Add new columns
alter table "public"."alerts"
  add column "type"                text not null default 'cancellation',
  add column "flexibility"         text,
  add column "notify_when"         text,
  add column "notification_method" text not null default 'email',
  add column "status"              text not null default 'active';

-- Drop active — status replaces it with three states instead of two
alter table "public"."alerts" drop column "active";

-- Drop the old index that filtered on active (column is gone)
drop index if exists "public"."idx_alerts_active";

-- Value-list checks
alter table "public"."alerts"
  add constraint "alerts_type_check"
    check (type in ('cancellation', 'reminder')),
  add constraint "alerts_flexibility_check"
    check (flexibility in ('strict', 'flexible')),
  add constraint "alerts_notify_when_check"
    check (notify_when in ('1day', '1week')),
  add constraint "alerts_notification_method_check"
    check (notification_method in ('email', 'sms')),
  add constraint "alerts_status_check"
    check (status in ('active', 'triggered', 'cancelled'));

-- Unique constraint for exact duplicates — gives error code 23505 which
-- the server action already handles with a friendly message
alter table "public"."alerts"
  add constraint "alerts_unique_user_cabin_dates"
    unique (user_id, facility_id, date_from, date_to);

-- Exclusion constraint to prevent overlapping date ranges for the same
-- user + cabin. Exact duplicates are also caught here, but the unique
-- constraint above fires first (btree beats gist) and returns 23505.
-- Partial overlaps return 23P01 — the server action will need to handle
-- that separately when overlap UX is wired up.
alter table "public"."alerts"
  add constraint "alerts_no_overlap"
    exclude using gist (
      user_id    with =,
      facility_id with =,
      daterange(date_from, date_to, '[)') with &&
    );

-- Replaces idx_alerts_active — used by the cron job to fetch rows to process
create index "idx_alerts_status_active"
  on "public"."alerts" using btree (status)
  where (status = 'active');
