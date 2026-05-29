#!/usr/bin/env python3
"""
Second RIDB ingest pass — pulls structured campsite attributes for our 519 cabins.

New columns populated:
  checkin_time   — from CampsiteAttributes "Checkin Time"  (97% coverage)
  checkout_time  — from CampsiteAttributes "Checkout Time" (97% coverage)
  sleeps         — updated from "Max Num of People" where available (more reliable than regex)
  num_beds       — from "Num of Beds"                      (38% coverage)
  bed_type       — from "Bed Type"                         (32% coverage)
  pets_allowed   — updated from "Pets Allowed"             (34% coverage)
  nightly_rate   — regex-extracted from FacilityUseFeeDescription (51% coverage)

Usage:
  export SUPABASE_URL=https://xxxx.supabase.co
  export SUPABASE_SERVICE_KEY=eyJ...
  python3 scripts/ingest_attributes.py

Flags:
  --ridb  path to RIDB export directory (default: ~/Documents/Claude/Projects/Ember/ridb export)
  --db    path to ember.db              (default: data/ember.db)
"""

import argparse
import csv
import os
import re
import sqlite3
import sys
import time
from collections import defaultdict
from pathlib import Path


def get_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        print(f"ERROR: missing env var {key}")
        sys.exit(1)
    return val


def extract_nightly_rate(html: str):
    if not html:
        return None
    text = re.sub(r"<[^>]+>", " ", html)

    # "$45.00 per night" / "$25 a night" / "$45/night"
    m = re.search(r"\$\s*(\d+(?:\.\d{1,2})?)\s*(?:per\s+night|a\s+night|/night)", text, re.I)
    if m:
        return float(m.group(1))

    # "45 dollars per night"
    m = re.search(r"(\d+(?:\.\d{1,2})?)\s*dollars?\s+per\s+night", text, re.I)
    if m:
        return float(m.group(1))

    # "fee of $X" when "night" appears in the same sentence
    sentences = re.split(r"[.!?\n]", text)
    for sentence in sentences:
        if re.search(r"night", sentence, re.I):
            m = re.search(r"\$\s*(\d+(?:\.\d{1,2})?)", sentence)
            if m:
                rate = float(m.group(1))
                # Sanity-check: cabins range from ~$20–$200/night
                if 10 <= rate <= 500:
                    return rate

    return None


def main():
    repo_root = Path(__file__).parent.parent
    default_ridb = Path.home() / "Documents/Claude/Projects/Ember/ridb export"
    default_db = repo_root / "data/ember.db"

    parser = argparse.ArgumentParser()
    parser.add_argument("--ridb", default=str(default_ridb))
    parser.add_argument("--db",   default=str(default_db))
    parser.add_argument("--batch", type=int, default=100)
    args = parser.parse_args()

    ridb = Path(args.ridb)
    if not ridb.exists():
        print(f"ERROR: RIDB directory not found: {ridb}")
        sys.exit(1)

    # ── Load our 519 facility IDs ─────────────────────────────────────────────
    conn = sqlite3.connect(str(args.db))
    our_ids = {row[0] for row in conn.execute("SELECT facility_id FROM CABINS")}
    conn.close()
    print(f"Loaded {len(our_ids)} cabin IDs from {args.db}")

    # ── Map campsite → facility ───────────────────────────────────────────────
    campsite_to_facility: dict[str, str] = {}
    with open(ridb / "Campsites_API_v1.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["FacilityID"] in our_ids:
                campsite_to_facility[row["CampsiteID"]] = row["FacilityID"]

    covered = len(set(campsite_to_facility.values()))
    print(f"Campsites found for {covered} / {len(our_ids)} cabins")

    # ── Collect attributes per facility ──────────────────────────────────────
    facility_attrs: dict[str, list[tuple[str, str]]] = defaultdict(list)
    with open(ridb / "CampsiteAttributes_API_v1.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["EntityID"] in campsite_to_facility:
                fid = campsite_to_facility[row["EntityID"]]
                facility_attrs[fid].append((row["AttributeName"], row["AttributeValue"]))

    # ── Extract nightly rates from Facilities file ────────────────────────────
    facility_rates: dict[str, float] = {}
    with open(ridb / "Facilities_API_v1.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["FacilityID"] in our_ids:
                rate = extract_nightly_rate(row.get("FacilityUseFeeDescription", ""))
                if rate:
                    facility_rates[row["FacilityID"]] = rate

    print(f"Nightly rates extracted: {len(facility_rates)} cabins")

    # ── Build update payload ──────────────────────────────────────────────────
    updates: list[dict] = []
    for fid in our_ids:
        attrs = facility_attrs.get(fid, [])
        row: dict = {"facility_id": fid}

        # Checkin / checkout — consistent across campsites, take first
        checkins = [v.strip() for a, v in attrs if a == "Checkin Time" and v.strip()]
        if checkins:
            row["checkin_time"] = checkins[0]

        checkouts = [v.strip() for a, v in attrs if a == "Checkout Time" and v.strip()]
        if checkouts:
            row["checkout_time"] = checkouts[0]

        # Sleeps — max across campsites (most useful for "how many can stay")
        people = [
            int(v) for a, v in attrs
            if a == "Max Num of People" and v.strip().isdigit() and int(v) > 0
        ]
        if people:
            row["sleeps"] = max(people)
            row["sleeps_conf"] = 1.0

        # Num beds — max across campsites
        beds = [
            int(v) for a, v in attrs
            if a == "Num of Beds" and v.strip().isdigit() and int(v) > 0
        ]
        if beds:
            row["num_beds"] = max(beds)

        # Bed type — collect unique values, cap at 2
        bed_types = list(dict.fromkeys(
            v.strip() for a, v in attrs if a == "Bed Type" and v.strip()
        ))
        if bed_types:
            row["bed_type"] = ", ".join(bed_types[:2])

        # Pets — any "Yes" across campsites means permitted
        pets = [v.strip().lower() for a, v in attrs if a == "Pets Allowed" and v.strip()]
        if pets:
            row["pets_allowed"] = any(v in ("yes", "true", "y") for v in pets)
            row["pets_conf"] = 1.0

        # Nightly rate
        if fid in facility_rates:
            row["nightly_rate"] = facility_rates[fid]

        if len(row) > 1:
            updates.append(row)

    print(f"\nCabins with at least one new attribute: {len(updates)}")

    # Print a quick summary of coverage
    for field in ("checkin_time", "checkout_time", "sleeps", "num_beds", "bed_type", "pets_allowed", "nightly_rate"):
        count = sum(1 for u in updates if field in u)
        print(f"  {field:<20} {count:>3} / {len(our_ids)}")

    # ── Upsert to Supabase ────────────────────────────────────────────────────
    url = get_env("SUPABASE_URL")
    key = get_env("SUPABASE_SERVICE_KEY")

    try:
        from supabase import create_client
    except ImportError:
        print("\nERROR: supabase package not installed. Run: pip3 install supabase")
        sys.exit(1)

    client = create_client(url, key)

    print(f"\nUpdating {len(updates)} cabins…")
    errors = []
    for i, row in enumerate(updates):
        fid = row["facility_id"]
        payload = {k: v for k, v in row.items() if k != "facility_id"}
        try:
            client.table("cabins").update(payload).eq("facility_id", fid).execute()
        except Exception as e:
            errors.append(f"{fid}: {type(e).__name__}: {e}")
        if (i + 1) % 50 == 0:
            print(f"  {i + 1} / {len(updates)}")

    print(f"  {len(updates)} / {len(updates)}")

    if errors:
        print(f"\n⚠️  {len(errors)} update(s) failed:")
        for e in errors[:5]:
            print(f"  {e}")
    else:
        print("\n✓ Done")

    # ── Spot-check ────────────────────────────────────────────────────────────
    print("\nSpot-check (Lost Horse Cabin):")
    r = client.table("cabins").select(
        "facility_name, checkin_time, checkout_time, sleeps, num_beds, bed_type, nightly_rate"
    ).eq("facility_id", "10156120").execute()
    if r.data:
        for k, v in r.data[0].items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
