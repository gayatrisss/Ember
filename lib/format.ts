export const CONF_THRESHOLD = 0.8

// Title-cases the name, preserves 2-letter state codes in parens: "(MT)" not "(Mt)"
export function formatFacilityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\(([A-Za-z]{2})\)/g, (_, code) => `(${code.toUpperCase()})`)
}

export function formatCabinName(name: string): string {
  return formatFacilityName(name)
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
