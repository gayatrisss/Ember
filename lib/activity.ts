import { timeAgo } from "@/lib/format";

// The "Lately on Ember" activity feed.
//
// This section is SAMPLE DATA, and the section header says so — see ActivityFeed.
// Real user activity can't be manufactured honestly, and the genuine rec.gov openings
// we can observe are mostly obscure cabins with thin pages, which makes for a poor
// first impression and a dead-end click.
//
// So the feed is curated instead: every card points at one of the 20 best-documented
// cabin pages in the catalog (most photos, most filled-in facts, real descriptions).
// The activity is illustrative; the cabins, the links, and the destinations are real.
// Labelled once at the section level rather than per card, so the row stays clean.
//
// No database access: the section must render identically everywhere and never depend
// on which Supabase instance is behind it. Facility ids are verified present in both
// the local and hosted catalogs.

export type ActivityItem = {
  id: string;
  name: string;
  location: string;
  state: "OPEN" | "WATCH";
  meta: string;
  ago: string;
};

const MINUTE = 60_000;

type Seed = {
  id: string;
  name: string;
  location: string;
  state: "OPEN" | "WATCH";
  meta: string;
  minutesAgo: number;
};

// Curated from the catalog by documentation completeness (photo count, non-null fact
// fields, description length), then spread across regions so the row doesn't read as
// four cabins from the same forest. Ordered as displayed: a mix of states, timescales,
// trip lengths, and geography — Cascades, Rockies, Sierra, Southwest, Alaska.
const SEEDS: Seed[] = [
  { id: "234248", name: "Fivemile Butte Lookout", location: "Mt. Hood National Forest", state: "OPEN", meta: "2 nights · Aug 3", minutesAgo: 2 },
  { id: "234288", name: "Woods Cabin", location: "Bitterroot National Forest", state: "WATCH", meta: "Watching · Aug 14", minutesAgo: 9 },
  { id: "10132083", name: "Steliko Lookout", location: "Okanogan-Wenatchee National Forest", state: "OPEN", meta: "1 night · Jul 29", minutesAgo: 17 },
  { id: "234375", name: "Douglas Creek Cabin", location: "Beaverhead-Deerlodge National Forest", state: "OPEN", meta: "3 nights · Aug 21", minutesAgo: 34 },
  { id: "234149", name: "Pickett Butte Lookout", location: "Umpqua National Forest", state: "WATCH", meta: "Watching · Sep 5", minutesAgo: 51 },
  { id: "233348", name: "Redfish Cabin", location: "Sawtooth National Forest", state: "OPEN", meta: "2 nights · Aug 8", minutesAgo: 78 },
  { id: "234084", name: "Sandstone Cabin", location: "Medicine Bow-Routt National Forest", state: "WATCH", meta: "Watching · Oct 2", minutesAgo: 96 },
  { id: "234271", name: "Clearwater Lookout Cabin", location: "Umatilla National Forest", state: "OPEN", meta: "4 nights · Sep 12", minutesAgo: 143 },
  { id: "233077", name: "Virginia Lake Cabin", location: "Tongass National Forest", state: "OPEN", meta: "1 night · Aug 1", minutesAgo: 185 },
  { id: "234178", name: "Evergreen Mountain Lookout", location: "Mt. Baker-Snoqualmie National Forest", state: "WATCH", meta: "Watching · Aug 30", minutesAgo: 240 },
  { id: "234456", name: "Kendrick Cabin", location: "Coconino National Forest", state: "OPEN", meta: "2 nights · Sep 19", minutesAgo: 320 },
  { id: "234388", name: "Upper Ford Cabin", location: "Kootenai National Forest", state: "WATCH", meta: "Watching · Sep 26", minutesAgo: 415 },
  { id: "234600", name: "Pine Mountain Lookout", location: "Mendocino National Forest", state: "OPEN", meta: "3 nights · Oct 10", minutesAgo: 540 },
  { id: "232402", name: "Stolle Meadows Cabin", location: "Boise National Forest", state: "OPEN", meta: "5 nights · Sep 3", minutesAgo: 720 },
  { id: "233726", name: "Louella Cabin", location: "Olympic National Forest", state: "WATCH", meta: "Watching · Nov 14", minutesAgo: 1010 },
  { id: "234659", name: "Crandall Creek Cabin", location: "Custer Gallatin National Forest", state: "OPEN", meta: "2 nights · Oct 24", minutesAgo: 1440 },
  { id: "250041", name: "Pole Creek Cabin", location: "Bighorn National Forest", state: "WATCH", meta: "Watching · Dec 6", minutesAgo: 1980 },
  { id: "234337", name: "Ford Cabin", location: "Flathead National Forest", state: "OPEN", meta: "1 night · Nov 2", minutesAgo: 2600 },
  { id: "234213", name: "Antlers Guard Station", location: "Wallowa-Whitman National Forest", state: "OPEN", meta: "3 nights · Oct 17", minutesAgo: 3400 },
  { id: "234174", name: "Fish Lake Remount Depot", location: "Willamette National Forest", state: "WATCH", meta: "Watching · Jan 9", minutesAgo: 4300 },
];

// Relative times are rendered through the same timeAgo() the rest of the app uses, so
// the sample row phrases them exactly the way a real feed would.
export function getRecentActivity(): ActivityItem[] {
  const now = Date.now();
  return SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    location: s.location,
    state: s.state,
    meta: s.meta,
    ago: timeAgo(new Date(now - s.minutesAgo * MINUTE).toISOString()),
  }));
}
