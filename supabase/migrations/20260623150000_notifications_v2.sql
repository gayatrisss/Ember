-- Notifications v2 — reshape the original notifications table into the dedup ledger
-- the cancellation cron needs (see docs/notifications-architecture.md).
--
-- The original table (migration 20260604172415) modelled a single availability_date
-- + a free-text message. The matcher emits date *ranges* (a bookable stay may span
-- several nights), and dedup is per-opening, so we need found_date_from/found_date_to
-- plus a unique constraint. The table has never been written to, so these changes are
-- safe on an empty table.

-- New columns. user_id/facility_id are denormalized off the alert so dashboard and
-- "lately on ember" queries don't need a join; email_to snapshots the recipient at
-- send time; status records delivery outcome; dismissed_at drives dashboard
-- visibility only (it does NOT affect dedup).
alter table "public"."notifications"
  add column "user_id"         uuid not null,
  add column "facility_id"     text not null,
  add column "found_date_from" date not null,
  add column "found_date_to"   date not null,
  add column "email_to"        text not null,
  add column "status"          text not null default 'sent',
  add column "dismissed_at"    timestamp with time zone;

-- `type` (the delivery channel) keeps its email/sms/push check; give it a default so
-- the cron insert doesn't have to specify it for the common case.
alter table "public"."notifications"
  alter column "type" set default 'email';

-- Superseded columns: a single date can't represent a multi-night opening, and the
-- email body is rendered from a template rather than a stored string.
alter table "public"."notifications"
  drop column "availability_date",
  drop column "message";

-- Delivery-outcome check.
alter table "public"."notifications"
  add constraint "notifications_status_check"
    check (status in ('sent', 'failed'));

-- Foreign keys (match the alerts table: cascade on user / cabin deletion).
alter table "public"."notifications"
  add constraint "notifications_user_id_fkey"
    foreign key (user_id) references auth.users(id) on delete cascade,
  add constraint "notifications_facility_id_fkey"
    foreign key (facility_id) references public.cabins(facility_id) on delete cascade;

-- The dedup ledger: one row per distinct opening, ever. The cron inserts
-- ON CONFLICT DO NOTHING against this, so a re-seen opening (even one the user has
-- dismissed) never re-sends.
alter table "public"."notifications"
  add constraint "notifications_unique_alert_window"
    unique (alert_id, found_date_from, found_date_to);

-- Dashboard reads: a user's un-dismissed notifications ("Needs Attention").
create index "idx_notifications_user_active"
  on "public"."notifications" using btree (user_id)
  where (dismissed_at is null);

-- Users may dismiss (update) their own notifications. The original select policy
-- (own rows, via the alerts join) stays; add the update policy for dismiss.
create policy "users can update own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
