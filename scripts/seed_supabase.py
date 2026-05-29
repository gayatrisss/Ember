#!/usr/bin/env python3
"""
Seed Supabase with cabin data from data/ember.db

Prerequisites:
  pip install supabase --break-system-packages

Env vars required (add to .env.local and export before running):
  SUPABASE_URL          — from Supabase project settings → API
  SUPABASE_SERVICE_KEY  — service_role key (not anon key)

Usage:
  export SUPABASE_URL=https://xxxx.supabase.co
  export SUPABASE_SERVICE_KEY=eyJ...
  python3 scripts/seed_supabase.py

Flags:
  --db      path to ember.db (default: data/ember.db next to this script's parent)
  --batch   rows per upsert request (default: 100)
  --images-only  skip cabins, only upsert images (useful for re-runs)
  --cabins-only  skip images
"""

import argparse
import os
import sqlite3
import sys
import time
from pathlib import Path


def get_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        print(f"ERROR: missing env var {key}")
        print("  Set it with: export {key}=...")
        sys.exit(1)
    return val


def sqlite_row_to_dict(row: sqlite3.Row) -> dict:
    """Convert a sqlite3.Row to a plain dict, dropping None values."""
    return {k: v for k, v in dict(row).items() if v is not None}


def chunks(lst: list, n: int):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def seed(db_path: Path, batch_size: int, skip_cabins: bool, skip_images: bool):
    url = get_env("SUPABASE_URL")
    key = get_env("SUPABASE_SERVICE_KEY")

    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: supabase package not installed.")
        print("  Run: pip install supabase --break-system-packages")
        sys.exit(1)

    client = create_client(url, key)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    # ── CABINS ────────────────────────────────────────────────────────────────

    if not skip_cabins:
        cabin_rows = conn.execute("SELECT * FROM CABINS").fetchall()
        cabin_dicts = []
        for row in cabin_rows:
            d = sqlite_row_to_dict(row)
            # SQLite stores booleans as 0/1; Supabase/Postgres wants true/false
            for bool_col in ("reservable", "firewood_provided", "fishing_nearby", "pets_allowed", "ada_accessible"):
                if bool_col in d:
                    d[bool_col] = bool(d[bool_col])
            cabin_dicts.append(d)

        print(f"Upserting {len(cabin_dicts)} cabins in batches of {batch_size}…")
        errors = 0
        for i, batch in enumerate(chunks(cabin_dicts, batch_size)):
            try:
                client.table("cabins").upsert(batch, on_conflict="facility_id").execute()
                print(f"  batch {i+1}/{-(-len(cabin_dicts)//batch_size)} ✓")
            except Exception as e:
                print(f"  batch {i+1} ERROR: {e}")
                errors += 1
            time.sleep(0.1)  # be polite to the API

        if errors:
            print(f"\n⚠️  {errors} cabin batch(es) failed — check output above")
        else:
            print(f"✓ All cabins upserted\n")

    # ── CABIN_IMAGES ──────────────────────────────────────────────────────────

    if not skip_images:
        image_rows = conn.execute("SELECT * FROM CABIN_IMAGES").fetchall()
        image_dicts = []
        for row in image_rows:
            d = sqlite_row_to_dict(row)
            for bool_col in ("is_primary", "is_preview", "is_gallery"):
                if bool_col in d:
                    d[bool_col] = bool(d[bool_col])
            image_dicts.append(d)

        print(f"Upserting {len(image_dicts)} images in batches of {batch_size}…")
        errors = 0
        for i, batch in enumerate(chunks(image_dicts, batch_size)):
            try:
                client.table("cabin_images").upsert(batch, on_conflict="media_id").execute()
                print(f"  batch {i+1}/{-(-len(image_dicts)//batch_size)} ✓")
            except Exception as e:
                print(f"  batch {i+1} ERROR: {e}")
                errors += 1
            time.sleep(0.05)

        if errors:
            print(f"\n⚠️  {errors} image batch(es) failed")
        else:
            print(f"✓ All images upserted\n")

    conn.close()

    # ── Verify ────────────────────────────────────────────────────────────────

    print("Verifying row counts…")
    cabin_count = client.table("cabins").select("facility_id", count="exact").execute()
    image_count = client.table("cabin_images").select("media_id", count="exact").execute()
    print(f"  cabins:       {cabin_count.count}")
    print(f"  cabin_images: {image_count.count}")
    print("\nDone ✓")


if __name__ == "__main__":
    repo_root = Path(__file__).parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--db",          default=str(repo_root / "data" / "ember.db"))
    parser.add_argument("--batch",       type=int, default=100)
    parser.add_argument("--images-only", action="store_true")
    parser.add_argument("--cabins-only", action="store_true")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: {db_path} not found. Run scripts/ingest_ridb.py first.")
        sys.exit(1)

    seed(
        db_path=db_path,
        batch_size=args.batch,
        skip_cabins=args.images_only,
        skip_images=args.cabins_only,
    )
