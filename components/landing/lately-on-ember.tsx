import { ArrowLeft, ArrowRight } from "lucide-react";
import ActivityCard from "./activity-card";

const activities = [
  { name: "Sperry Chalet", location: "Glacier National Park", state: "OPEN" as const, meta: "2 NIGHTS · JUL 12", ago: "2 MIN AGO" },
  { name: "Maxey Cabin", location: "Custer Gallatin National Forest", state: "WATCH" as const, meta: "WATCHING · JUL 12", ago: "2 MIN AGO" },
  { name: "Sperry Chalet", location: "Glacier National Park", state: "OPEN" as const, meta: "2 NIGHTS · JUL 12", ago: "2 MIN AGO" },
  { name: "Sperry Chalet", location: "Glacier National Park", state: "WATCH" as const, meta: "WATCHING · JUL 12", ago: "2 MIN AGO" },
];

export default function LatelyOnEmber() {
  return (
    <section className="page-container py-16">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-ember shadow-ember-sm" />
          <span className="text-data text-wax uppercase tracking-wider">LATELY ON EMBER</span>
          <span className="text-data text-wax/50 uppercase tracking-wider">16 ACTIVITIES IN THE LAST 30 MINUTES</span>
        </div>
        <div className="flex gap-2">
          <button className="h-10 w-10 rounded-full border border-wax/30 flex items-center justify-center hover:border-ember hover:text-ember transition-colors">
            <ArrowLeft size={16} />
          </button>
          <button className="h-10 w-10 rounded-full border border-wax/30 flex items-center justify-center hover:border-ember hover:text-ember transition-colors">
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mt-8">
        {activities.map((activity, i) => (
          <ActivityCard key={i} {...activity} />
        ))}
      </div>
    </section>
  );
}
