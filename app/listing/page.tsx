import type { Metadata } from "next";
import { Triangle, Sun, TrendingUp, Clock, Flame, Droplet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import TopNav from "@/components/landing/top-nav";
import StatusBar from "@/components/ui/status-bar";
import Sidebar from "@/components/listing/sidebar";

export const metadata: Metadata = { title: "Short Cabin Title — Ember" };

const CABIN_NAME = "Short Cabin Title";
const FOREST = "Custer Gallatin National Forest";

const quickFacts = [
  { label: "SLEEPS", value: "4 people" },
  { label: "TYPE", value: "Cabin" },
  { label: "SIGNAL", value: "Cell service" },
  { label: "PRICE", value: "$55/night" },
];

const fieldNotes: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Triangle, label: "ACCESS", value: "4WD ROAD" },
  { icon: Sun, label: "SEASON", value: "May–Sept" },
  { icon: TrendingUp, label: "ELEVATION", value: "11,200 ft" },
  { icon: Clock, label: "STAY LIMIT", value: "14 nights" },
  { icon: Flame, label: "HEAT", value: "Wood Stove" },
  { icon: Droplet, label: "WATER", value: "None on site" },
];

export default function ListingPage() {
  return (
    <div className="bg-night min-h-screen">
      <TopNav />
      <StatusBar />

      <div className="page-container py-12">
        <div className="flex gap-16 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            {/* Forest badge */}
            <div className="inline-flex border border-smoke/50 rounded px-2 py-1 mb-4">
              <span className="text-data uppercase tracking-widest text-smoke">{FOREST}</span>
            </div>

            {/* Cabin title */}
            <h1 className="text-display-fraunces text-wax mb-8">{CABIN_NAME}</h1>

            {/* Quick facts */}
            <div className="flex gap-10 mb-8">
              {quickFacts.map((fact) => (
                <div key={fact.label}>
                  <p className="text-data uppercase text-smoke">{fact.label}</p>
                  <p className="text-body text-wax mt-1">{fact.value}</p>
                </div>
              ))}
            </div>

            {/* Photo placeholder */}
            <div className="relative w-full h-80 bg-evergreen rounded-xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-data text-wax/20 uppercase tracking-wider">PHOTO</span>
              </div>
              {/* Topo gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-night/60 to-transparent" />
              {/* Ember dot */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-ember shadow-ember-sm" />
            </div>
          </div>

          {/* Right column — sidebar */}
          <div className="w-sidebar shrink-0">
            <Sidebar cabinName={CABIN_NAME} />
          </div>
        </div>

        {/* Field notes */}
        <div className="mt-16">
          <p className="text-data uppercase tracking-widest text-smoke mb-8">FIELD NOTES</p>
          <div className="grid grid-cols-3 gap-x-12 gap-y-8">
            {fieldNotes.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon size={14} className="text-smoke mt-1 shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-data uppercase text-smoke">{label}</p>
                  <p className="text-heading text-wax mt-1">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
