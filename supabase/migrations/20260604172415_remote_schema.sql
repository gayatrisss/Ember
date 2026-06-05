drop extension if exists "pg_net";


  create table "public"."alerts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "facility_id" text not null,
    "date_from" date not null,
    "date_to" date not null,
    "active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."alerts" enable row level security;


  create table "public"."cabin_images" (
    "media_id" text not null,
    "facility_id" text not null,
    "url" text not null,
    "title" text,
    "is_primary" boolean default false,
    "is_preview" boolean default false,
    "is_gallery" boolean default false
      );


alter table "public"."cabin_images" enable row level security;


  create table "public"."cabins" (
    "facility_id" text not null,
    "legacy_facility_id" text,
    "org_facility_id" text,
    "facility_name" text not null,
    "facility_type" text,
    "rec_area_id" text,
    "rec_area_name" text,
    "latitude" double precision,
    "longitude" double precision,
    "reservable" boolean default true,
    "stay_limit_raw" text,
    "reservation_url" text,
    "description_plain" text,
    "last_updated" text,
    "elevation_ft" integer,
    "elevation_ft_conf" double precision,
    "sleeps" integer,
    "sleeps_conf" double precision,
    "built_year" integer,
    "built_year_conf" double precision,
    "heat_source" text,
    "heat_source_conf" double precision,
    "water_access" text,
    "water_access_conf" double precision,
    "restroom_type" text,
    "restroom_type_conf" double precision,
    "road_access" text,
    "road_access_conf" double precision,
    "season" text,
    "season_conf" double precision,
    "electricity" text,
    "electricity_conf" double precision,
    "firewood_provided" boolean,
    "firewood_conf" double precision,
    "waterfront" text,
    "waterfront_conf" double precision,
    "fishing_nearby" boolean,
    "fishing_conf" double precision,
    "pets_allowed" boolean,
    "pets_conf" double precision,
    "ada_accessible" boolean,
    "ada_conf" double precision,
    "created_at" timestamp with time zone default now(),
    "checkin_time" text,
    "checkout_time" text,
    "num_beds" integer,
    "bed_type" text,
    "nightly_rate" numeric
      );


alter table "public"."cabins" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "alert_id" uuid not null,
    "sent_at" timestamp with time zone default now(),
    "type" text not null,
    "availability_date" date,
    "message" text
      );


alter table "public"."notifications" enable row level security;

CREATE UNIQUE INDEX alerts_pkey ON public.alerts USING btree (id);

CREATE UNIQUE INDEX cabin_images_pkey ON public.cabin_images USING btree (media_id);

CREATE UNIQUE INDEX cabins_pkey ON public.cabins USING btree (facility_id);

CREATE INDEX idx_alerts_active ON public.alerts USING btree (active) WHERE (active = true);

CREATE INDEX idx_alerts_facility ON public.alerts USING btree (facility_id);

CREATE INDEX idx_alerts_user ON public.alerts USING btree (user_id);

CREATE INDEX idx_cabins_elevation ON public.cabins USING btree (elevation_ft) WHERE (elevation_ft IS NOT NULL);

CREATE INDEX idx_cabins_location ON public.cabins USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));

CREATE INDEX idx_cabins_rec_area ON public.cabins USING btree (rec_area_id);

CREATE INDEX idx_cabins_sleeps ON public.cabins USING btree (sleeps) WHERE (sleeps IS NOT NULL);

CREATE INDEX idx_images_facility ON public.cabin_images USING btree (facility_id);

CREATE INDEX idx_notifications_alert ON public.notifications USING btree (alert_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

alter table "public"."alerts" add constraint "alerts_pkey" PRIMARY KEY using index "alerts_pkey";

alter table "public"."cabin_images" add constraint "cabin_images_pkey" PRIMARY KEY using index "cabin_images_pkey";

alter table "public"."cabins" add constraint "cabins_pkey" PRIMARY KEY using index "cabins_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."alerts" add constraint "alerts_facility_id_fkey" FOREIGN KEY (facility_id) REFERENCES public.cabins(facility_id) ON DELETE CASCADE not valid;

alter table "public"."alerts" validate constraint "alerts_facility_id_fkey";

alter table "public"."alerts" add constraint "alerts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."alerts" validate constraint "alerts_user_id_fkey";

alter table "public"."cabin_images" add constraint "cabin_images_facility_id_fkey" FOREIGN KEY (facility_id) REFERENCES public.cabins(facility_id) ON DELETE CASCADE not valid;

alter table "public"."cabin_images" validate constraint "cabin_images_facility_id_fkey";

alter table "public"."notifications" add constraint "notifications_alert_id_fkey" FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_alert_id_fkey";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

grant delete on table "public"."alerts" to "anon";

grant insert on table "public"."alerts" to "anon";

grant references on table "public"."alerts" to "anon";

grant select on table "public"."alerts" to "anon";

grant trigger on table "public"."alerts" to "anon";

grant truncate on table "public"."alerts" to "anon";

grant update on table "public"."alerts" to "anon";

grant delete on table "public"."alerts" to "authenticated";

grant insert on table "public"."alerts" to "authenticated";

grant references on table "public"."alerts" to "authenticated";

grant select on table "public"."alerts" to "authenticated";

grant trigger on table "public"."alerts" to "authenticated";

grant truncate on table "public"."alerts" to "authenticated";

grant update on table "public"."alerts" to "authenticated";

grant delete on table "public"."alerts" to "service_role";

grant insert on table "public"."alerts" to "service_role";

grant references on table "public"."alerts" to "service_role";

grant select on table "public"."alerts" to "service_role";

grant trigger on table "public"."alerts" to "service_role";

grant truncate on table "public"."alerts" to "service_role";

grant update on table "public"."alerts" to "service_role";

grant delete on table "public"."cabin_images" to "anon";

grant insert on table "public"."cabin_images" to "anon";

grant references on table "public"."cabin_images" to "anon";

grant select on table "public"."cabin_images" to "anon";

grant trigger on table "public"."cabin_images" to "anon";

grant truncate on table "public"."cabin_images" to "anon";

grant update on table "public"."cabin_images" to "anon";

grant delete on table "public"."cabin_images" to "authenticated";

grant insert on table "public"."cabin_images" to "authenticated";

grant references on table "public"."cabin_images" to "authenticated";

grant select on table "public"."cabin_images" to "authenticated";

grant trigger on table "public"."cabin_images" to "authenticated";

grant truncate on table "public"."cabin_images" to "authenticated";

grant update on table "public"."cabin_images" to "authenticated";

grant delete on table "public"."cabin_images" to "service_role";

grant insert on table "public"."cabin_images" to "service_role";

grant references on table "public"."cabin_images" to "service_role";

grant select on table "public"."cabin_images" to "service_role";

grant trigger on table "public"."cabin_images" to "service_role";

grant truncate on table "public"."cabin_images" to "service_role";

grant update on table "public"."cabin_images" to "service_role";

grant delete on table "public"."cabins" to "anon";

grant insert on table "public"."cabins" to "anon";

grant references on table "public"."cabins" to "anon";

grant select on table "public"."cabins" to "anon";

grant trigger on table "public"."cabins" to "anon";

grant truncate on table "public"."cabins" to "anon";

grant update on table "public"."cabins" to "anon";

grant delete on table "public"."cabins" to "authenticated";

grant insert on table "public"."cabins" to "authenticated";

grant references on table "public"."cabins" to "authenticated";

grant select on table "public"."cabins" to "authenticated";

grant trigger on table "public"."cabins" to "authenticated";

grant truncate on table "public"."cabins" to "authenticated";

grant update on table "public"."cabins" to "authenticated";

grant delete on table "public"."cabins" to "service_role";

grant insert on table "public"."cabins" to "service_role";

grant references on table "public"."cabins" to "service_role";

grant select on table "public"."cabins" to "service_role";

grant trigger on table "public"."cabins" to "service_role";

grant truncate on table "public"."cabins" to "service_role";

grant update on table "public"."cabins" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";


  create policy "users can delete own alerts"
  on "public"."alerts"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "users can insert own alerts"
  on "public"."alerts"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "users can read own alerts"
  on "public"."alerts"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "users can update own alerts"
  on "public"."alerts"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "cabin_images are publicly readable"
  on "public"."cabin_images"
  as permissive
  for select
  to public
using (true);



  create policy "cabins are publicly readable"
  on "public"."cabins"
  as permissive
  for select
  to public
using (true);



  create policy "users can read own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.alerts
  WHERE ((alerts.id = notifications.alert_id) AND (alerts.user_id = auth.uid())))));



