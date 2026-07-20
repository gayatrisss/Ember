-- min_nights: the minimum number of consecutive available nights that should
-- trigger a cancellation alert. Replaces the strict/flexible model — a value
-- equal to the watch-window length reproduces "strict" (the whole stay must
-- open), while 1 means "alert me on any single open night in the window".
--
-- Expand step only: the column is nullable for now so existing inserts that do
-- not yet send min_nights keep working. A later migration sets NOT NULL and
-- drops the flexibility column once the matcher + API no longer read it.
alter table "public"."alerts"
  add column "min_nights" integer;

-- Backfill existing rows from flexibility:
--   flexible      -> 1              (any opening)
--   strict / null -> window length  (the whole requested stay)
update "public"."alerts"
set "min_nights" = case
    when "flexibility" = 'flexible' then 1
    else greatest("date_to" - "date_from", 1)
  end
where "min_nights" is null;

-- At least one night, and never more than the watch window itself.
-- (NULL passes, which is intentional during the expand step.)
alter table "public"."alerts"
  add constraint "alerts_min_nights_valid"
    check (
      "min_nights" is null
      or ("min_nights" >= 1 and "min_nights" <= ("date_to" - "date_from"))
    );
