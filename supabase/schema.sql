-- Ember — Supabase schema
-- Run this in the Supabase SQL editor (supabase.com → project → SQL editor)
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS

-- ── Extensions ────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";


-- ── CABINS ────────────────────────────────────────────────────────────────────
-- Seeded from RIDB bulk data via scripts/seed_supabase.py
-- facility_id is the RIDB FacilityID (text, not uuid)

create table if not exists cabins (
  -- identity
  facility_id         text primary key,
  legacy_facility_id  text,
  org_facility_id     text,
  facility_name       text not null,
  facility_type       text,
  rec_area_id         text,
  rec_area_name       text,
  latitude            float,
  longitude           float,
  reservable          boolean default true,
  stay_limit_raw      text,
  reservation_url     text,
  description_plain   text,
  last_updated        text,

  -- extracted metadata — only display as a hard fact when _conf >= 0.8
  elevation_ft        integer,  elevation_ft_conf  float,
  sleeps              integer,  sleeps_conf        float,
  built_year          integer,  built_year_conf    float,
  heat_source         text,     heat_source_conf   float,
  water_access        text,     water_access_conf  float,
  restroom_type       text,     restroom_type_conf float,
  road_access         text,     road_access_conf   float,
  season              text,     season_conf        float,
  electricity         text,     electricity_conf   float,
  firewood_provided   boolean,  firewood_conf      float,
  waterfront          text,     waterfront_conf    float,
  fishing_nearby      boolean,  fishing_conf       float,
  pets_allowed        boolean,  pets_conf          float,
  ada_accessible      boolean,  ada_conf           float,

  created_at          timestamptz default now()
);

create index if not exists idx_cabins_rec_area   on cabins(rec_area_id);
create index if not exists idx_cabins_location   on cabins(latitude, longitude)
  where latitude is not null and longitude is not null;
create index if not exists idx_cabins_sleeps     on cabins(sleeps) where sleeps is not null;
create index if not exists idx_cabins_elevation  on cabins(elevation_ft) where elevation_ft is not null;


-- ── CABIN_IMAGES ──────────────────────────────────────────────────────────────

create table if not exists cabin_images (
  media_id        text primary key,
  facility_id     text not null references cabins(facility_id) on delete cascade,
  url             text not null,
  title           text,
  is_primary      boolean default false,
  is_preview      boolean default false,
  is_gallery      boolean default false
);

create index if not exists idx_images_facility on cabin_images(facility_id);


-- ── ALERTS ───────────────────────────────────────────────────────────────────
-- One alert = one user watching one cabin for a date range

create table if not exists alerts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  facility_id     text not null references cabins(facility_id) on delete cascade,
  date_from       date not null,
  date_to         date not null,
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_alerts_user      on alerts(user_id);
create index if not exists idx_alerts_facility  on alerts(facility_id);
create index if not exists idx_alerts_active    on alerts(active) where active = true;


-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
-- Log of every notification fired for an alert

create table if not exists notifications (
  id              uuid primary key default uuid_generate_v4(),
  alert_id        uuid not null references alerts(id) on delete cascade,
  sent_at         timestamptz default now(),
  type            text not null check (type in ('email', 'sms', 'push')),
  availability_date date,   -- the specific date that opened up
  message         text
);

create index if not exists idx_notifications_alert on notifications(alert_id);


-- ── Row Level Security ────────────────────────────────────────────────────────
-- cabins + cabin_images: public read, no writes from client
-- alerts + notifications: users can only see/modify their own rows

alter table cabins          enable row level security;
alter table cabin_images    enable row level security;
alter table alerts          enable row level security;
alter table notifications   enable row level security;

-- Cabin data is public
create policy "cabins are publicly readable"
  on cabins for select using (true);

create policy "cabin_images are publicly readable"
  on cabin_images for select using (true);

-- Users own their alerts
create policy "users can read own alerts"
  on alerts for select using (auth.uid() = user_id);

create policy "users can insert own alerts"
  on alerts for insert with check (auth.uid() = user_id);

create policy "users can update own alerts"
  on alerts for update using (auth.uid() = user_id);

create policy "users can delete own alerts"
  on alerts for delete using (auth.uid() = user_id);

-- Users can read notifications for their own alerts
create policy "users can read own notifications"
  on notifications for select
  using (
    exists (
      select 1 from alerts
      where alerts.id = notifications.alert_id
        and alerts.user_id = auth.uid()
    )
  );
