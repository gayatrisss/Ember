import { getRecentActivity } from "@/lib/activity";
import ActivityFeed from "./activity-feed";

// Server section: hands the curated sample activity to the client carousel. Kept thin
// per the landing-component convention.
export default function LatelyOnEmber() {
  return <ActivityFeed activities={getRecentActivity()} />;
}
