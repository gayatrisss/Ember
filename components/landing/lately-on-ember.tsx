import { getRecentActivity } from "@/lib/activity";
import ActivityFeed from "./activity-feed";

// Server section: fetches the hybrid real+seed activity feed and hands it to the
// client carousel. Kept thin per the landing-component convention.
export default async function LatelyOnEmber() {
  const { activities, recentCount } = await getRecentActivity();
  return <ActivityFeed activities={activities} recentCount={recentCount} />;
}
