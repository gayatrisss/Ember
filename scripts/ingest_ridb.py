#!/usr/bin/env python3
"""
RIDB → Ember SQLite ingestion script
Produces two tables: CABINS and CABIN_IMAGES

Each extracted metadata field has a paired _conf column (0.0–1.0).
Use conf >= 0.8 for display as a hard fact; lower values are hints only.

Usage:
  python3 scripts/ingest_ridb.py --ridb-dir <path-to-ridb-export> --out <path>

Defaults:
  --ridb-dir  ~/Documents/Claude/Projects/Ember/ridb export
  --out       ./data/ember.db
"""

import argparse
import csv
import re
import sqlite3
from html.parser import HTMLParser
from pathlib import Path


# ── HTML stripping ────────────────────────────────────────────────────────────

class HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.chunks = []

    def handle_data(self, data):
        text = data.strip()
        if text:
            self.chunks.append(text)

    def get_text(self) -> str:
        return " ".join(self.chunks)


def strip_html(html: str) -> str:
    s = HTMLStripper()
    s.feed(html or "")
    return s.get_text()


# ── Extractor return type: (value, confidence) or (None, None) ───────────────
#
# Confidence scale:
#   1.0  exact, unambiguous phrase  ("sleeps 4", "built in 1947")
#   0.9  near-direct phrasing       ("accommodates 4 people")
#   0.8  likely but slightly vague  ("up to 4 guests")
#   0.7  indirect / inferred        ("fireplace" as heat source)
#   0.6  weak signal                ("water available" – could be nearby)


def extract_elevation_ft(text: str) -> tuple[int | None, float | None]:
    patterns = [
        (r"elevation\s+of\s+([\d,]+)\s*(?:feet|ft)",           1.0),
        (r"at\s+an?\s+elevation\s+of\s+([\d,]+)",              1.0),
        (r"sits?\s+at\s+([\d,]+)\s*(?:feet|ft)",               0.95),
        (r"([\d,]+)[- ]foot\s+elevation",                       0.9),
        (r"([\d,]+)\s*(?:feet|ft)\s+(?:above|in\s+elevation|elevation)", 0.85),
    ]
    for pat, conf in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = m.group(1).replace(",", "")
            try:
                elev = int(val)
                if 100 < elev < 25000:
                    return elev, conf
            except ValueError:
                pass
    return None, None


def extract_sleeps(text: str) -> tuple[int | None, float | None]:
    patterns = [
        (r"sleeps\s+(\d+)",                                                   1.0),
        (r"maximum\s+(?:capacity|occupancy)\s+(?:of\s+)?(\d+)",               0.95),
        (r"capacity\s+(?:of\s+)?(\d+)\s+(?:people|guests|persons)",           0.9),
        (r"accommodates?\s+(\d+)\s+(?:people|guests|persons)",                0.9),
        (r"(\d+)\s+(?:people|guests)\s+(?:maximum|max)",                      0.85),
        (r"up\s+to\s+(\d+)\s+(?:people|guests|persons)",                      0.8),
    ]
    for pat, conf in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                n = int(m.group(1))
                if 1 <= n <= 100:
                    return n, conf
            except ValueError:
                pass
    return None, None


def extract_built_year(text: str) -> tuple[int | None, float | None]:
    patterns = [
        (r"built\s+in\s+(\d{4})",        1.0),
        (r"constructed\s+in\s+(\d{4})",  1.0),
        (r"built\s+circa\s+(\d{4})",     0.8),
        (r"built\s+(\d{4})",             0.9),
    ]
    for pat, conf in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                yr = int(m.group(1))
                if 1850 <= yr <= 2024:
                    return yr, conf
            except ValueError:
                pass
    return None, None


# (pattern, label, confidence)
HEAT_PATTERNS = [
    (r"\bwood\s+stove\b",                    "wood stove",   1.0),
    (r"\bpropane\s+(?:heat|heater|stove)\b", "propane",      1.0),
    (r"\belectric\s+heat",                   "electric",     1.0),
    (r"\boil\s+(?:heat|heater|stove)\b",     "oil",          1.0),
    (r"\bnatural\s+gas\b",                   "natural gas",  1.0),
    (r"\bwood\s+heat\b",                     "wood stove",   0.95),
    (r"\bno\s+(?:heat|heating)\b",           "none",         1.0),
    # fireplace is lower confidence — may be decorative or secondary
    (r"\bfireplace\b",                       "fireplace",    0.7),
]

def extract_heat_source(text: str) -> tuple[str | None, float | None]:
    for pat, label, conf in HEAT_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return label, conf
    return None, None


WATER_PATTERNS = [
    (r"\bno\s+(?:running\s+)?water\b|\bno\s+piped\s+water\b", "none",              1.0),
    (r"\bwater\s+(?:must\s+be\s+)?(?:packed|hauled|carried)\s+in\b", "pack-in only", 1.0),
    (r"\brunning\s+water\b",                                   "running water",     0.95),
    (r"\bpotable\s+water\b",                                   "potable water",     0.95),
    (r"\btreated\s+water\b",                                   "treated water",     0.95),
    (r"\bhand\s+pump\b",                                       "hand pump",         0.95),
    (r"\bspring\s+water\b|\bnatural\s+spring\b",               "spring",            0.9),
    (r"\bcreek\s+water\b",                                     "creek (untreated)", 0.9),
    # "water available" is vague — could mean nearby source, not in-cabin
    (r"\bwater\s+(?:is\s+)?available\b",                       "available",         0.6),
]

def extract_water_access(text: str) -> tuple[str | None, float | None]:
    for pat, label, conf in WATER_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return label, conf
    return None, None


RESTROOM_PATTERNS = [
    (r"\bflush\s+toilet\b|\bflushable\s+(?:restroom|toilet)\b", "flush toilet",       1.0),
    (r"\bcompost(?:ing)?\s+toilet\b",                           "composting toilet",  1.0),
    (r"\bvault\s+toilet\b",                                     "vault toilet",       1.0),
    (r"\bpit\s+toilet\b",                                       "pit toilet",         1.0),
    (r"\bouthouse\b",                                           "outhouse",           1.0),
    (r"\bportable\s+toilet\b|\bport[- ]a[- ]potty\b",          "portable toilet",    1.0),
    (r"\bno\s+(?:toilet|restroom|outhouse)\b",                  "none",               1.0),
]

def extract_restroom(text: str) -> tuple[str | None, float | None]:
    for pat, label, conf in RESTROOM_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return label, conf
    return None, None


ROAD_PATTERNS = [
    # Most restrictive / unusual access types win
    (r"\bfly[- ]in\b|\bfloatplane\b|\bfloat\s+plane\b|\bair\s+access\b",  "fly-in only",              1.0),
    (r"\bhike[- ]in\b|\bwalk[- ]in\b|\bfoot\s+only\b|\bno\s+road\s+access\b", "hike-in only",         1.0),
    (r"\bboat[- ]in\b|\bwater\s+access\s+only\b",                          "boat-in only",             1.0),
    (r"\bsnowmobile\b.*?\bonly\b|\bwinter\s+access\s+only\b",             "winter access only",        0.95),
    (r"\bfour[- ]wheel\s+drive\s+(?:is\s+)?required\b|\b4WD\s+required\b", "4WD required",            1.0),
    (r"\bfour[- ]wheel\s+drive\b|\b4WD\b|\b4x4\b",                        "4WD recommended",          0.85),
    (r"\bhigh[- ]clearance\s+(?:vehicle\s+)?required\b",                   "high clearance required",  1.0),
    (r"\bhigh[- ]clearance\b",                                             "high clearance",            0.85),
    (r"\ball[- ]wheel\s+drive\b|\bAWD\b",                                  "AWD recommended",          0.8),
    (r"\bpaved\s+road\b",                                                  "paved road",                0.95),
    (r"\bgravel\s+road\b|\bdirt\s+road\b|\bforest\s+road\b|\bFS\s+[Rr]oad\b", "gravel/dirt road",     0.85),
]

def extract_road_access(text: str) -> tuple[str | None, float | None]:
    for pat, label, conf in ROAD_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return label, conf
    return None, None


def extract_season(text: str) -> tuple[str | None, float | None]:
    if re.search(r"\byear[- ]round\b", text, re.IGNORECASE):
        return "year-round", 1.0

    month = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"

    # "open from May 1 through October 31" — most explicit
    pat = rf"(?:open|available|accessible)\s+(?:from\s+)?({month}\s+\d+\s+(?:to|through|–|-)\s+{month}\s+\d+)"
    m = re.search(pat, text, re.IGNORECASE)
    if m:
        return m.group(1).strip(), 0.95

    # "open May through October" — month names, no day numbers
    pat2 = rf"(?:open|available|accessible)\s+(?:from\s+)?({month}[^.{{}}]{{0,40}}?{month})"
    m2 = re.search(pat2, text, re.IGNORECASE)
    if m2:
        return m2.group(1).strip(), 0.9

    # "mid-April to mid-November"
    pat3 = rf"(mid[- ]{month}\s+(?:to|through|–|-)\s+mid[- ]{month})"
    m3 = re.search(pat3, text, re.IGNORECASE)
    if m3:
        return m3.group(1).strip(), 0.9

    # bare "May through October" with no "open" prefix
    pat4 = rf"({month}\s+(?:\d+\s+)?(?:to|through|–|-)\s+{month}(?:\s+\d+)?)"
    m4 = re.search(pat4, text, re.IGNORECASE)
    if m4:
        return m4.group(1).strip(), 0.75

    return None, None


def extract_electricity(text: str) -> tuple[str | None, float | None]:
    patterns = [
        (r"\bno\s+electricity\b|\bno\s+electric\b|\bno\s+power\b",                "none",      1.0),
        (r"\bsolar\s+(?:power|panel|electric)\b",                                 "solar",     1.0),
        (r"\bgenerator\b",                                                         "generator", 0.85),
        (r"\belectricity\s+(?:is\s+)?(?:available|provided|included)\b",          "available", 1.0),
        (r"\belectric(?:ity)?\b",                                                  "available", 0.75),
        (r"\bpropane\s+lights?\b|\bkerosene\s+lamp\b|\bcoleman\s+lantern\b|\bgas\s+lamp\b", "lantern only", 0.9),
    ]
    for pat, label, conf in patterns:
        if re.search(pat, text, re.IGNORECASE):
            return label, conf
    return None, None


def extract_firewood(text: str) -> tuple[int | None, float | None]:
    """Returns (1=provided, 0=not provided, None=unknown) with confidence."""
    if re.search(
        r"\bfirewood\s+(?:is\s+)?(?:provided|available|supplied|included)\b"
        r"|\bsplit\s+wood\s+(?:is\s+)?(?:provided|available|supplied)\b",
        text, re.IGNORECASE
    ):
        return 1, 0.95
    if re.search(
        r"\bbring\s+(?:your\s+own\s+)?firewood\b"
        r"|\bno\s+firewood\s+(?:is\s+)?(?:provided|available)\b",
        text, re.IGNORECASE
    ):
        return 0, 0.95
    return None, None


def extract_waterfront(text: str) -> tuple[str | None, float | None]:
    patterns = [
        (r"\bbeachfront\b|\bon\s+the\s+(?:ocean\s+)?beach\b",                    "beachfront",  1.0),
        (r"\bocean(?:front)?\s+view\b|\bcoastal\b",                              "ocean/coast", 0.9),
        (r"\bwaterfront\b",                                                       "waterfront",  0.95),
        (r"\bon\s+(?:the\s+)?(?:lake|river|creek|pond|shore)\b",                 "waterfront",  0.85),
        (r"\blake\s+(?:front|access|view|shore)\b|\briverfront\b",               "waterfront",  0.9),
    ]
    for pat, label, conf in patterns:
        if re.search(pat, text, re.IGNORECASE):
            return label, conf
    return None, None


def extract_fishing(text: str) -> tuple[int | None, float | None]:
    """1 if fishing is mentioned nearby, else None. High confidence — fishing mentions are direct."""
    if re.search(r"\bfishing\b", text, re.IGNORECASE):
        return 1, 0.85
    return None, None


def extract_pets_allowed(text: str) -> tuple[int | None, float | None]:
    if re.search(r"\bnot\s+allowed\b.*\bpet|\bno\s+pets\b|\bno\s+dogs\b|\bpets?\s+(?:are\s+)?not\s+allowed\b", text, re.IGNORECASE):
        return 0, 1.0
    if re.search(r"\bpets?\s+(?:are\s+)?allowed\b|\bpets?\s+welcome\b|\bdogs?\s+(?:are\s+)?(?:welcome|allowed)\b", text, re.IGNORECASE):
        return 1, 1.0
    return None, None


def extract_ada(text: str, ada_col: str) -> tuple[int | None, float | None]:
    """ADA from description text only — FacilityAdaAccess is 'N'/'' for all cabins."""
    # Specific ADA phrases → high confidence
    if re.search(r"\bADA[- ]compliant\b|\bwheelchair[- ]accessible\b|\bhandicap[- ]accessible\b", text, re.IGNORECASE):
        return 1, 0.95
    # Explicit wheelchair mention
    if re.search(r"\bwheelchair\b", text, re.IGNORECASE):
        return 1, 0.9
    # Bare "ADA" — could be parking, restroom, etc. — medium confidence
    if re.search(r"\bADA\b", text, re.IGNORECASE):
        return 1, 0.75
    return None, None


# ── Main ingestion ────────────────────────────────────────────────────────────

CABIN_KEYWORDS = ["cabin", "lookout", "yurt", "hut"]


def load_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def build_db(ridb_dir: Path, out_path: Path):
    print("Loading CSVs…")
    facilities    = load_csv(ridb_dir / "Facilities_API_v1.csv")
    rec_areas     = load_csv(ridb_dir / "RecAreas_API_v1.csv")
    rec_area_facs = load_csv(ridb_dir / "RecAreaFacilities_API_v1.csv")
    media         = load_csv(ridb_dir / "Media_API_v1.csv")

    print(f"  Facilities:      {len(facilities):,}")
    print(f"  RecAreas:        {len(rec_areas):,}")
    print(f"  RecAreaFacility: {len(rec_area_facs):,}")
    print(f"  Media:           {len(media):,}")

    # ── Lookup maps ───────────────────────────────────────────────────────────

    fac_to_recarea: dict[str, str] = {}
    for row in rec_area_facs:
        fid = row["FacilityID"]
        if fid not in fac_to_recarea:
            fac_to_recarea[fid] = row["RecAreaID"]

    recarea_name: dict[str, str] = {r["RecAreaID"]: r["RecAreaName"] for r in rec_areas}

    fac_images: dict[str, list[dict]] = {}
    for row in media:
        if row["EntityType"] == "Asset" and row["MediaType"] == "Image":
            fac_images.setdefault(row["EntityID"], []).append(row)

    # ── Filter to cabins ──────────────────────────────────────────────────────

    cabins = [
        r for r in facilities
        if any(kw in r["FacilityName"].lower() for kw in CABIN_KEYWORDS)
        and r.get("Reservable", "").lower() == "true"
        and r.get("Enabled", "").lower() == "true"
    ]
    print(f"\nCabin-like reservable facilities: {len(cabins):,}")

    # ── Schema ────────────────────────────────────────────────────────────────

    out_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(out_path))
    cur = conn.cursor()

    cur.execute("DROP TABLE IF EXISTS CABIN_IMAGES")
    cur.execute("DROP TABLE IF EXISTS CABINS")

    cur.execute("""
        CREATE TABLE CABINS (
            -- identity
            facility_id         TEXT PRIMARY KEY,
            legacy_facility_id  TEXT,
            org_facility_id     TEXT,
            facility_name       TEXT NOT NULL,
            facility_type       TEXT,
            rec_area_id         TEXT,
            rec_area_name       TEXT,
            latitude            REAL,
            longitude           REAL,
            reservable          INTEGER,
            stay_limit_raw      TEXT,
            reservation_url     TEXT,
            description_plain   TEXT,
            last_updated        TEXT,

            -- extracted metadata + confidence (0.0–1.0; NULL = not extracted)
            -- display a field as a hard fact only when conf >= 0.8
            elevation_ft        INTEGER,  elevation_ft_conf  REAL,
            sleeps              INTEGER,  sleeps_conf        REAL,
            built_year          INTEGER,  built_year_conf    REAL,
            heat_source         TEXT,     heat_source_conf   REAL,
            water_access        TEXT,     water_access_conf  REAL,
            restroom_type       TEXT,     restroom_type_conf REAL,
            road_access         TEXT,     road_access_conf   REAL,
            season              TEXT,     season_conf        REAL,
            electricity         TEXT,     electricity_conf   REAL,
            firewood_provided   INTEGER,  firewood_conf      REAL,
            waterfront          TEXT,     waterfront_conf    REAL,
            fishing_nearby      INTEGER,  fishing_conf       REAL,
            pets_allowed        INTEGER,  pets_conf          REAL,
            ada_accessible      INTEGER,  ada_conf           REAL
        )
    """)

    cur.execute("""
        CREATE TABLE CABIN_IMAGES (
            media_id        TEXT PRIMARY KEY,
            facility_id     TEXT NOT NULL REFERENCES CABINS(facility_id),
            url             TEXT NOT NULL,
            title           TEXT,
            is_primary      INTEGER,
            is_preview      INTEGER,
            is_gallery      INTEGER
        )
    """)

    cur.execute("CREATE INDEX idx_cabins_rec_area  ON CABINS(rec_area_id)")
    cur.execute("CREATE INDEX idx_images_facility  ON CABIN_IMAGES(facility_id)")
    conn.commit()

    # ── Build rows ────────────────────────────────────────────────────────────

    cabin_rows = []
    image_rows = []

    for r in cabins:
        fid      = r["FacilityID"]
        plain    = strip_html(r.get("FacilityDescription", "") or "")
        dir_text = strip_html(r.get("FacilityDirections", "") or "")
        text     = plain + " " + dir_text   # combined for extraction

        try:
            lat = float(r["FacilityLatitude"])  if r.get("FacilityLatitude")  else None
        except ValueError:
            lat = None
        try:
            lon = float(r["FacilityLongitude"]) if r.get("FacilityLongitude") else None
        except ValueError:
            lon = None

        recarea_id = fac_to_recarea.get(fid)
        recarea_nm = recarea_name.get(recarea_id) if recarea_id else None

        elev,    elev_c    = extract_elevation_ft(text)
        sleeps,  sleeps_c  = extract_sleeps(text)
        byear,   byear_c   = extract_built_year(text)
        heat,    heat_c    = extract_heat_source(text)
        water,   water_c   = extract_water_access(text)
        rstm,    rstm_c    = extract_restroom(text)
        road,    road_c    = extract_road_access(text)
        season,  season_c  = extract_season(text)
        elec,    elec_c    = extract_electricity(text)
        firewood,fw_c      = extract_firewood(text)
        wfront,  wfront_c  = extract_waterfront(text)
        fishing, fish_c    = extract_fishing(text)
        pets,    pets_c    = extract_pets_allowed(text)
        ada,     ada_c     = extract_ada(text, r.get("FacilityAdaAccess", ""))

        cabin_rows.append((
            fid,
            r.get("LegacyFacilityID") or None,
            r.get("OrgFacilityID") or None,
            r["FacilityName"],
            r.get("FacilityTypeDescription") or None,
            recarea_id,
            recarea_nm,
            lat, lon,
            1 if r.get("Reservable", "").lower() == "true" else 0,
            r.get("StayLimit", "").strip() or None,
            r.get("FacilityReservationURL") or None,
            plain or None,
            r.get("LastUpdatedDate") or None,
            # metadata + confidence pairs
            elev,    elev_c,
            sleeps,  sleeps_c,
            byear,   byear_c,
            heat,    heat_c,
            water,   water_c,
            rstm,    rstm_c,
            road,    road_c,
            season,  season_c,
            elec,    elec_c,
            firewood, fw_c,
            wfront,  wfront_c,
            fishing, fish_c,
            pets,    pets_c,
            ada,     ada_c,
        ))

        for img in fac_images.get(fid, []):
            image_rows.append((
                img["MediaID"],
                fid,
                img["URL"],
                img.get("Title") or None,
                1 if img.get("IsPrimary", "").lower() == "true" else 0,
                1 if img.get("IsPreview", "").lower() == "true" else 0,
                1 if img.get("IsGallery", "").lower() == "true" else 0,
            ))

    placeholders = ",".join(["?"] * len(cabin_rows[0]))
    cur.executemany(f"INSERT OR IGNORE INTO CABINS VALUES ({placeholders})", cabin_rows)

    cur.executemany(
        "INSERT OR IGNORE INTO CABIN_IMAGES VALUES (?,?,?,?,?,?,?)",
        image_rows,
    )
    conn.commit()

    # ── Summary ───────────────────────────────────────────────────────────────

    def count(col): return cur.execute(f"SELECT COUNT(*) FROM CABINS WHERE {col} IS NOT NULL").fetchone()[0]
    def conf_breakdown(col):
        hi  = cur.execute(f"SELECT COUNT(*) FROM CABINS WHERE {col}_conf >= 0.8").fetchone()[0]
        lo  = cur.execute(f"SELECT COUNT(*) FROM CABINS WHERE {col}_conf < 0.8 AND {col}_conf IS NOT NULL").fetchone()[0]
        return hi, lo

    n = cur.execute("SELECT COUNT(*) FROM CABINS").fetchone()[0]
    ni = cur.execute("SELECT COUNT(*) FROM CABIN_IMAGES").fetchone()[0]
    nwi = cur.execute("SELECT COUNT(DISTINCT facility_id) FROM CABIN_IMAGES").fetchone()[0]

    conn.close()

    print(f"\n✓  {out_path}  ({out_path.stat().st_size // 1024} KB)")
    print(f"\n   CABINS:       {n:,}")
    print(f"   CABIN_IMAGES: {ni:,}  (across {nwi} cabins)")
    print()
    print(f"   {'Field':<22} {'set':>5}  {'conf≥0.8':>8}  {'conf<0.8':>8}")
    print(f"   {'-'*50}")
    fields = [
        "elevation_ft", "sleeps", "built_year", "heat_source",
        "water_access", "restroom_type", "road_access", "season",
        "electricity", "firewood_provided", "waterfront", "fishing_nearby",
        "pets_allowed", "ada_accessible",
    ]
    conf_fields = {
        "firewood_provided": "firewood",
        "fishing_nearby":    "fishing",
        "pets_allowed":      "pets",
        "ada_accessible":    "ada",
    }
    for f in fields:
        conf_col = conf_fields.get(f, f)
        total = cur.execute(f"SELECT COUNT(*) FROM CABINS WHERE {f} IS NOT NULL").fetchone()[0] if False else None
        # reopen for summary queries
        conn2 = sqlite3.connect(str(out_path))
        c2 = conn2.cursor()
        total = c2.execute(f"SELECT COUNT(*) FROM CABINS WHERE {f} IS NOT NULL").fetchone()[0]
        hi = c2.execute(f"SELECT COUNT(*) FROM CABINS WHERE {conf_col}_conf >= 0.8").fetchone()[0]
        lo = c2.execute(f"SELECT COUNT(*) FROM CABINS WHERE {conf_col}_conf < 0.8 AND {conf_col}_conf IS NOT NULL").fetchone()[0]
        conn2.close()
        print(f"   {f:<22} {total:>5}  {hi:>8}  {lo:>8}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest RIDB → Ember SQLite DB")
    parser.add_argument(
        "--ridb-dir",
        default=str(Path.home() / "Documents/Claude/Projects/Ember/ridb export"),
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).parent.parent / "data" / "ember.db"),
    )
    args = parser.parse_args()
    build_db(Path(args.ridb_dir), Path(args.out))
