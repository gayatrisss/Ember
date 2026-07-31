export const CONF_THRESHOLD = 0.8

// rec.gov stores facility names in whatever case the ranger district typed them:
// "TRAIL CREEK CABIN", "Fure's Cabin", "MCCART LOOKOUT". Everything below turns that
// into one display convention — title case — so the name reads the same everywhere.

// Lowercased inside a title, never at the start or the end of the name.
const MINOR_WORDS = new Set([
  "a", "an", "and", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "vs",
])

// Stay all-caps: agency and facility abbreviations that a title-caser would ruin.
// "Mt."/"Mtn." are deliberately absent — those are abbreviations, not acronyms.
const ACRONYMS = new Set(["nf", "nfs", "usfs", "blm", "nwr", "nra", "np", "us", "usa", "rv", "atv"])

// prettier-ignore
const STATE_CODES = new Set([
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks",
  "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny",
  "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv",
  "wi", "wy", "dc", "pr",
])

// Whitespace-delimited token, and the segments inside it: a hyphen or slash starts a new
// word for casing purposes, so "a-frame" gets both halves cased.
const TOKEN = /\S+/g
const SEGMENT = /[^\-/]+/g

// Strips punctuation so "(mt)" and "or," can be matched against the sets above.
function bareWord(word: string): string {
  return word.replace(/[^\p{L}\p{N}]/gu, "")
}

// Capitalise the letters of one segment. The segment may carry punctuation ("cabin.",
// "(west)") and may contain an apostrophe, which is where the rule earns its keep:
// "tom's" must not become "Tom'S" and "mestaa’ėhehe" must be left alone, but "o'brien"
// must become "O'Brien". So a run after an apostrophe is only capitalised when the run
// before it was a single letter — the Irish/French prefix shape.
function capitalise(segment: string): string {
  let previousRun: string | null = null
  return segment.replace(/\p{L}+/gu, (run) => {
    const isPrefixed = previousRun !== null && previousRun.length > 1
    previousRun = run
    if (isPrefixed) return run
    return run[0].toUpperCase() + run.slice(1)
  })
}

function caseSegment(segment: string): string {
  const bare = bareWord(segment)
  if (ACRONYMS.has(bare)) return segment.replace(bare, bare.toUpperCase())
  // Scottish/Irish prefixes: rec.gov shouts these, so the inner capital is lost.
  // The length guard handles "mcgee" while leaving "mac" and "machine" alone.
  if (/^mc\p{L}{2,}/u.test(bare)) {
    return capitalise(segment).replace(/^Mc(\p{L})/u, (_, c: string) => `Mc${c.toUpperCase()}`)
  }
  return capitalise(segment)
}

/**
 * Canonical display form for a cabin name. Use this at every point a cabin name is
 * rendered — heading, card, alert summary, email, alt text. It is idempotent, so it is
 * safe to call on a name that was already formatted upstream.
 *
 *   "TRAIL CREEK CABIN"                  → "Trail Creek Cabin"
 *   "LAKE OF THE WOODS LOOKOUT"          → "Lake of the Woods Lookout"
 *   "MCCART LOOKOUT"                     → "McCart Lookout"
 *   "TOM'S LAKE CABIN"                   → "Tom's Lake Cabin"
 *   "Cold Springs Cabin - Ochoco NF (or)" → "Cold Springs Cabin - Ochoco NF (OR)"
 */
export function formatCabinName(name: string): string {
  const lowered = name.trim().toLowerCase()
  const tokens = lowered.match(TOKEN) ?? []

  const titled = tokens.map((token, i) => {
    // Minor words are judged whole-token, so the "a" in "a-frame" is not one.
    const isEdge = i === 0 || i === tokens.length - 1
    if (!isEdge && MINOR_WORDS.has(bareWord(token))) return token
    return token.replace(SEGMENT, caseSegment)
  })

  // State codes only get shouted at the tail of a parenthetical — "(MT)",
  // "(Beaverhead-Deerlodge National Forest, MT)" — so a bare "or"/"in" elsewhere in a
  // parenthetical phrase stays a word. The leading group keeps the "ma" ending
  // "(Alabama)" from being read as a state code.
  return titled.join(" ").replace(
    /(^|[^\p{L}])(\p{L}{2})(\s*\))/gu,
    (match, lead: string, code: string, tail: string) => {
      if (!STATE_CODES.has(code.toLowerCase())) return match
      return lead + code.toUpperCase() + tail
    }
  )
}

export function formatDateRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const f = new Date(fy, fm - 1, fd)
  const t = new Date(ty, tm - 1, td)
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
  return `${fmt.format(f)} – ${fmt.format(t)}`
}

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`
}

// "2026-07-09","2026-07-12" -> "July 9th-12th" (or "July 30th - August 2nd" across
// months). Used in the availability email and the notification cards.
export function formatLongDateRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const fromDate = new Date(fy, fm - 1, fd)
  const toDate = new Date(ty, tm - 1, td)
  const monthName = (d: Date) => d.toLocaleString("en-US", { month: "long" })
  const fromPart = `${monthName(fromDate)} ${ordinal(fd)}`
  if (fy === ty && fm === tm) return `${fromPart}-${ordinal(td)}`
  return `${fromPart} - ${monthName(toDate)} ${ordinal(td)}`
}

// A short relative time like "12s ago", "4 hrs ago", "3 days ago". Computed once
// (e.g. server-side) and passed as a string so it doesn't cause hydration drift.
export function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export function getCabinType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("lookout")) return "Lookout"
  if (n.includes("yurt")) return "Yurt"
  if (n.includes("hut")) return "Hut"
  return "Cabin"
}

// Returns value only when confidence meets threshold, otherwise null
export function confident<T>(value: T | null, conf: number | null): T | null {
  if (value === null || value === undefined) return null
  if (conf === null || conf === undefined || conf < CONF_THRESHOLD) return null
  return value
}

const ACCESS_MAP: Record<string, string> = {
  "gravel/dirt road": "Gravel Road",
  "4wd required": "4WD Road",
  "4wd recommended": "4WD Road",
  "high clearance required": "High Clearance",
  "high clearance": "High Clearance",
  "fly-in only": "Fly-in Only",
  "hike-in only": "Hike-in Only",
  "boat-in only": "Boat-in Only",
  "paved road": "Paved Road",
  "awd recommended": "AWD / SUV",
  "winter access only": "Winter Access",
}

const WATER_MAP: Record<string, string> = {
  "none": "None on site",
  "pack-in only": "Pack-in only",
  "running water": "Running water",
  "potable water": "Potable water",
  "treated water": "Treated water",
  "spring": "Natural spring",
  "creek (untreated)": "Creek (untreated)",
  "hand pump": "Hand pump",
  "available": "Available",
}

export function formatRate(raw: string | null): string | null {
  if (!raw) return null
  const n = parseFloat(raw)
  if (isNaN(n)) return null
  return `$${n % 1 === 0 ? n : n.toFixed(2)}/night`
}

// Maps rec.gov's aggregate_cell_coverage (0–5 average) to a coverage label.
// null/unparseable → null (caller shows "—" for "no data").
export function formatSignal(raw: string | null): string | null {
  if (!raw) return null
  const n = parseFloat(raw)
  if (isNaN(n)) return null
  if (n < 1) return "No service"
  if (n < 2) return "Weak"
  if (n < 3) return "Moderate"
  return "Strong"
}

// "02:00 PM" → "2:00 PM"
export function formatTime(raw: string | null): string | null {
  if (!raw) return null
  return raw.replace(/^0(\d)/, "$1").trim()
}

export function formatAccess(raw: string): string {
  return ACCESS_MAP[raw.toLowerCase()] ?? raw
}

export function formatWater(raw: string): string {
  return WATER_MAP[raw.toLowerCase()] ?? raw
}
