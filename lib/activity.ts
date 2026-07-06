import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCabinName, timeAgo } from "@/lib/format";

// The public "Lately on Ember" activity feed. Hybrid by design: real events (alerts
// started + openings found, across all users) are merged on top of a seeded backdrop
// so the section always looks alive while genuinely reflecting activity as it grows.
// A freshly created alert / a real opening floats to the top by recency.
//
// This is server-only and selects NO user PII (no user_id, no email) — just cabin name,
// rec area, dates, and timestamps — so it is safe to surface publicly.

export type ActivityItem = {
  name: string;
  location: string;
  state: "OPEN" | "WATCH";
  meta: string;
  ago: string;
};

type Scored = ActivityItem & { ts: number };

type AlertActivityRow = {
  facility_id: string;
  date_from: string;
  created_at: string;
  cabins: { facility_name: string; rec_area_name: string | null } | null;
};

type NotifActivityRow = {
  facility_id: string;
  found_date_from: string;
  found_date_to: string;
  sent_at: string;
  cabins: { facility_name: string; rec_area_name: string | null } | null;
};

const MINUTE = 60_000;
const WINDOW_MIN = 30;
const MAX_CARDS = 12;

type Seed = { name: string; location: string; state: "OPEN" | "WATCH"; meta: string; minutesAgo: number };

// Seeded, representative activity so the feed never looks dead. All within the last
// ~30 min so they read as "live." Real events merge on top and push these down.
const SEEDS: Seed[] = [
  { name: "Fivemile Butte Lookout", location: "Mount Hood National Forest", state: "OPEN", meta: "2 nights · Aug 3", minutesAgo: 1 },
  { name: "Green Mountain Lookout", location: "Mt. Baker-Snoqualmie National Forest", state: "WATCH", meta: "Watching · Jul 18", minutesAgo: 3 },
  { name: "Warner Mountain Lookout", location: "Willamette National Forest", state: "OPEN", meta: "3 nights · Jul 24", minutesAgo: 5 },
  { name: "Hornet Guard Station", location: "Umpqua National Forest", state: "WATCH", meta: "Watching · Aug 9", minutesAgo: 7 },
  { name: "Black Butte Lookout", location: "Deschutes National Forest", state: "OPEN", meta: "2 nights · Aug 15", minutesAgo: 9 },
  { name: "Deer Creek Cabin", location: "Bitterroot National Forest", state: "WATCH", meta: "Watching · Jul 20", minutesAgo: 11 },
  { name: "Gold Butte Lookout", location: "Willamette National Forest", state: "OPEN", meta: "1 night · Jul 30", minutesAgo: 13 },
  { name: "Aldrich Mountain Guard Station", location: "Malheur National Forest", state: "WATCH", meta: "Watching · Sep 2", minutesAgo: 15 },
  { name: "Big Creek Cabin", location: "Payette National Forest", state: "OPEN", meta: "4 nights · Aug 22", minutesAgo: 18 },
  { name: "Clear Lake Cabin", location: "Fremont-Winema National Forest", state: "WATCH", meta: "Watching · Aug 5", minutesAgo: 20 },
  { name: "Bull Prairie Guard Station", location: "Ochoco National Forest", state: "OPEN", meta: "2 nights · Jul 28", minutesAgo: 22 },
  { name: "Ludlow Guard Station", location: "Beaverhead-Deerlodge National Forest", state: "WATCH", meta: "Watching · Sep 10", minutesAgo: 24 },
  { name: "Whitewater Cabin", location: "Boise National Forest", state: "OPEN", meta: "3 nights · Aug 1", minutesAgo: 26 },
  { name: "Pierce Guard Station", location: "Nez Perce-Clearwater National Forest", state: "WATCH", meta: "Watching · Aug 18", minutesAgo: 28 },
];

// "2026-07-12" -> "Jul 12" (the card CSS upppercases it).
function shortDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleString("en-US", { month: "short", day: "numeric" });
}

function nightsBetween(from: string, to: string): number {
  const nights = Math.round((Date.parse(to) - Date.parse(from)) / (24 * 60 * MINUTE));
  return Math.max(1, nights);
}

async function loadRealEvents(): Promise<Scored[]> {
  try {
    const supabase = createServiceClient();
    const [alerts, notifs] = await Promise.all([
      supabase
        .from("alerts")
        .select("facility_id, date_from, created_at, cabins(facility_name, rec_area_name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<AlertActivityRow[]>(),
      supabase
        .from("notifications")
        .select("facility_id, found_date_from, found_date_to, sent_at, cabins(facility_name, rec_area_name)")
        .order("sent_at", { ascending: false })
        .limit(10)
        .returns<NotifActivityRow[]>(),
    ]);

    const watch: Scored[] = (alerts.data ?? []).map((a) => ({
      name: formatCabinName(a.cabins?.facility_name ?? a.facility_id),
      location: a.cabins?.rec_area_name ?? "National Forest",
      state: "WATCH",
      meta: `Watching · ${shortDate(a.date_from)}`,
      ago: timeAgo(a.created_at),
      ts: Date.parse(a.created_at),
    }));

    const open: Scored[] = (notifs.data ?? []).map((n) => {
      const nights = nightsBetween(n.found_date_from, n.found_date_to);
      return {
        name: formatCabinName(n.cabins?.facility_name ?? n.facility_id),
        location: n.cabins?.rec_area_name ?? "National Forest",
        state: "OPEN",
        meta: `${nights} night${nights === 1 ? "" : "s"} · ${shortDate(n.found_date_from)}`,
        ago: timeAgo(n.sent_at),
        ts: Date.parse(n.sent_at),
      };
    });

    return [...watch, ...open];
  } catch (err) {
    // Never let a feed hiccup break the landing page — fall back to seeds only.
    console.log("[ember] getRecentActivity: real feed unavailable, seeds only", err);
    return [];
  }
}

export async function getRecentActivity(): Promise<{ activities: ActivityItem[]; recentCount: number }> {
  const now = Date.now();

  const seeded: Scored[] = SEEDS.map((s) => {
    const ts = now - s.minutesAgo * MINUTE;
    return {
      name: s.name,
      location: s.location,
      state: s.state,
      meta: s.meta,
      ago: timeAgo(new Date(ts).toISOString()),
      ts,
    };
  });

  const merged = [...(await loadRealEvents()), ...seeded].sort((a, b) => b.ts - a.ts);
  const recentCount = merged.filter((a) => a.ts > now - WINDOW_MIN * MINUTE).length;
  const activities: ActivityItem[] = merged.slice(0, MAX_CARDS).map((a) => ({
    name: a.name,
    location: a.location,
    state: a.state,
    meta: a.meta,
    ago: a.ago,
  }));

  return { activities, recentCount };
}
