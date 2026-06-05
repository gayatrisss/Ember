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
