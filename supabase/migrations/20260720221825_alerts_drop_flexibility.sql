-- Contract step of the min_nights rework. Safe only after the flexibility-free
-- code is deployed (nothing reads or writes this column anymore).
--
-- min_nights stays NULLABLE — reminder alerts carry no minimum-nights value — but a
-- cancellation alert must always have one, enforced conditionally rather than with a
-- blanket NOT NULL (which would break reminder inserts).

alter table "public"."alerts"
  drop constraint if exists "alerts_flexibility_check";

alter table "public"."alerts"
  drop column "flexibility";

alter table "public"."alerts"
  add constraint "alerts_cancellation_has_min_nights"
    check (type <> 'cancellation' or min_nights is not null);
