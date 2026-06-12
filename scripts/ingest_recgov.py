#!/usr/bin/env python3
"""
Recreation.gov enrichment — backfills `nightly_rate` and `cell_coverage`.

Recreation.gov's *search* endpoint returns, per result (keyed by the same
entity_id as our facility_id):
  - price_range {amount_min, amount_max}  → nightly_rate (amount_min)
  - aggregate_cell_coverage (0–5 average) → cell_coverage

Both come from a single request per cabin, so we fetch once and write both.
The original RIDB fee-text regex only covered ~10% of cabins; this lifts price
to ~94% and adds a signal value for ~60% (the rest have no coverage reviews).

Usage:
  export SUPABASE_URL=https://xxxx.supabase.co
  export SUPABASE_SERVICE_KEY=eyJ...
  python3 scripts/ingest_recgov.py              # refresh all cabins
  python3 scripts/ingest_recgov.py --dry-run    # fetch + report, write nothing
  python3 scripts/ingest_recgov.py --limit 20   # first N cabins (testing)
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

SEARCH_URL = "https://www.recreation.gov/api/search"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def get_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        print(f"ERROR: missing env var {key}")
        sys.exit(1)
    return val


def fetch(facility_id: str, name: str):
    """Return {'nightly_rate': float?, 'cell_coverage': float?} for the search hit
    whose entity_id matches facility_id, or None if no hit."""
    qs = urllib.parse.urlencode({"q": name, "size": 20})
    req = urllib.request.Request(f"{SEARCH_URL}?{qs}", headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.load(resp)
    except Exception as e:
        print(f"  fetch failed for {facility_id} ({name}): {type(e).__name__}: {e}")
        return None

    for res in data.get("results", []):
        if str(res.get("entity_id")) != str(facility_id):
            continue
        out: dict = {}
        pr = res.get("price_range") or {}
        if pr.get("amount_min") is not None:
            out["nightly_rate"] = float(pr["amount_min"])
        cov = res.get("aggregate_cell_coverage")
        if cov is not None:
            out["cell_coverage"] = round(float(cov), 2)
        return out
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="fetch + report, write nothing")
    parser.add_argument("--limit", type=int, default=0, help="process only the first N cabins")
    parser.add_argument("--sleep", type=float, default=0.1, help="delay between requests (seconds)")
    args = parser.parse_args()

    url = get_env("SUPABASE_URL")
    key = get_env("SUPABASE_SERVICE_KEY")

    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: supabase package not installed. Run: pip3 install supabase")
        sys.exit(1)

    client = create_client(url, key)

    cabins = (client.table("cabins").select("facility_id, facility_name").execute().data) or []
    if args.limit:
        cabins = cabins[: args.limit]
    print(f"Cabins to process: {len(cabins)}")

    updates: list[tuple[str, dict]] = []
    have_rate = have_cov = no_hit = 0

    for i, c in enumerate(cabins):
        fid, name = c["facility_id"], c["facility_name"]
        found = fetch(fid, name)
        if not found:
            no_hit += 1
        else:
            if "nightly_rate" in found:
                have_rate += 1
            if "cell_coverage" in found:
                have_cov += 1
            if found:
                updates.append((fid, found))
        if (i + 1) % 50 == 0:
            print(f"  {i + 1} / {len(cabins)}")
        time.sleep(args.sleep)

    print(f"\nnightly_rate: {have_rate}   cell_coverage: {have_cov}   no hit: {no_hit}")

    if args.dry_run:
        print("\n--dry-run: no writes performed.")
        return

    print(f"\nWriting {len(updates)} cabins…")
    errors = []
    for i, (fid, payload) in enumerate(updates):
        try:
            client.table("cabins").update(payload).eq("facility_id", fid).execute()
        except Exception as e:
            errors.append(f"{fid}: {type(e).__name__}: {e}")
        if (i + 1) % 50 == 0:
            print(f"  {i + 1} / {len(updates)}")

    if errors:
        print(f"\n⚠️  {len(errors)} update(s) failed:")
        for e in errors[:5]:
            print(f"  {e}")
    else:
        print("\n✓ Done")

    r = client.table("cabins").select("facility_name, nightly_rate, cell_coverage").eq(
        "facility_id", "234309"
    ).execute()
    if r.data:
        print(f"\nSpot-check (Trail Creek): {r.data[0]}")


if __name__ == "__main__":
    main()
