export type Cabin = {
  facility_id: string
  facility_name: string
  facility_type: string | null
  rec_area_id: string | null
  rec_area_name: string | null
  latitude: number | null
  longitude: number | null
  reservable: boolean | null
  stay_limit_raw: string | null
  reservation_url: string | null
  description_plain: string | null
  last_updated: string | null
  elevation_ft: number | null;      elevation_ft_conf: number | null
  sleeps: number | null;            sleeps_conf: number | null
  built_year: number | null;        built_year_conf: number | null
  heat_source: string | null;       heat_source_conf: number | null
  water_access: string | null;      water_access_conf: number | null
  restroom_type: string | null;     restroom_type_conf: number | null
  road_access: string | null;       road_access_conf: number | null
  season: string | null;            season_conf: number | null
  electricity: string | null;       electricity_conf: number | null
  firewood_provided: boolean | null; firewood_conf: number | null
  waterfront: string | null;        waterfront_conf: number | null
  fishing_nearby: boolean | null;   fishing_conf: number | null
  pets_allowed: boolean | null;     pets_conf: number | null
  ada_accessible: boolean | null;   ada_conf: number | null
  created_at: string | null
  // from CampsiteAttributes ingest
  checkin_time: string | null
  checkout_time: string | null
  num_beds: number | null
  bed_type: string | null
  nightly_rate: string | null  // Postgres numeric → JSON string
}

export type CabinImage = {
  media_id: string
  facility_id: string
  url: string
  title: string | null
  is_primary: boolean | null
  is_preview: boolean | null
  is_gallery: boolean | null
}
