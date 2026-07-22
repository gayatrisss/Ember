/**
 * Display resolution for cabin facts.
 *
 * Rec.gov gives us several fields that partially answer the same user question, each
 * with different coverage and different meaning. Deciding which one to show, and what to
 * call it, is a judgement that must be identical everywhere a cabin is rendered —
 * otherwise the explore card and the cabin page can disagree about the same cabin.
 * These resolvers are that single source of truth.
 *
 * The rule that makes this more than a fallback chain: **the label travels with the
 * value.** A resolver returns the caption alongside the number, so a value can never be
 * displayed under a caption that belongs to a different field. That is exactly the bug
 * this module exists to prevent (see resolveCapacity).
 */

import { confident, formatSignal, formatTime, formatWater } from "@/lib/format";
import type { Cabin } from "@/types/cabin";

/** A resolved, display-ready fact. `null` from a resolver means "we don't know". */
export type Fact = { label: string; value: string };

type CapacityInput = {
  num_beds: number | null;
  sleeps: number | null;
};

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${pluralForm}`;
}

/**
 * How many people fit, resolved across two fields that are NOT interchangeable:
 *
 * - `num_beds` (RIDB "Num of Beds", 37% coverage) is actual sleeping capacity.
 * - `sleeps` (RIDB "Max Num of People", 97% coverage) is the permitted occupancy cap,
 *   not a bed count. It is why Garnet Mountain Fire Lookout — one room on a summit —
 *   reports 15, and why 51 cabins report more than twice their bed count.
 *
 * Prefer the bed count, fall back to the cap, and change the label when the source
 * changes. Showing an occupancy cap under a "Sleeps" caption is a factual claim we
 * cannot support, so that combination must be unrepresentable.
 *
 * Note we deliberately do not gate on `sleeps_conf`: every row hardcodes it to 1.0 in
 * scripts/ingest_attributes.py, so it carries no information for this field.
 */
export function resolveCapacity({ num_beds, sleeps }: CapacityInput): Fact | null {
  if (num_beds !== null && num_beds > 0) {
    return { label: "Beds", value: plural(num_beds, "bed", "beds") };
  }
  if (sleeps !== null && sleeps > 0) {
    return { label: "Occupancy", value: plural(sleeps, "person", "people") };
  }
  return null;
}

/* ── Field notes ─────────────────────────────────────────────────────────────── */

/**
 * Every field note we know how to render, in display-priority order. Check-in and
 * check-out sit last deliberately: they are fillers that surface only when the more
 * interesting fields are missing enough data to leave room.
 */
export const FIELD_NOTE_LABELS = [
  "Signal",
  "Elevation",
  "Heat",
  "Water",
  "Season",
  "Stay Limit",
  "Check-in",
  "Check-out",
] as const;

export type FieldNoteLabel = (typeof FIELD_NOTE_LABELS)[number];

/** A field note is a Fact whose label is one of the known set, so icon maps stay exhaustive. */
export type FieldNote = { label: FieldNoteLabel; value: string };

type FieldNotesInput = Pick<
  Cabin,
  | "cell_coverage"
  | "season"
  | "season_conf"
  | "elevation_ft"
  | "elevation_ft_conf"
  | "heat_source"
  | "heat_source_conf"
  | "water_access"
  | "water_access_conf"
  | "stay_limit_raw"
  | "checkin_time"
  | "checkout_time"
>;

/** Title-cases a raw enum-ish value from the ingest ("wood stove" → "Wood Stove"). */
function titleCase(raw: string): string {
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves every field note for a cabin, in priority order, dropping the ones we have no
 * confident value for. Callers decide how many to render — the count is a layout
 * constraint, not a data one.
 *
 * Unlike resolveCapacity these are single-source, so each is a confidence gate plus a
 * formatter rather than a preference chain. They live here anyway so that "which facts
 * exist, what they are called, and in what order" has one answer.
 */
export function resolveFieldNotes(cabin: FieldNotesInput): FieldNote[] {
  const elevation = confident(cabin.elevation_ft, cabin.elevation_ft_conf);
  const heat = confident(cabin.heat_source, cabin.heat_source_conf);
  const water = confident(cabin.water_access, cabin.water_access_conf);

  const pool: { label: FieldNoteLabel; value: string | null }[] = [
    { label: "Signal", value: formatSignal(cabin.cell_coverage) },
    { label: "Elevation", value: elevation ? `${elevation.toLocaleString()} ft` : null },
    { label: "Heat", value: heat ? titleCase(heat) : null },
    { label: "Water", value: water ? formatWater(water) : null },
    { label: "Season", value: confident(cabin.season, cabin.season_conf) },
    { label: "Stay Limit", value: cabin.stay_limit_raw ?? null },
    { label: "Check-in", value: formatTime(cabin.checkin_time) },
    { label: "Check-out", value: formatTime(cabin.checkout_time) },
  ];

  return pool.filter((n): n is FieldNote => n.value !== null);
}
