import { Mountain, Flame, Droplets, Signal, Leaf, Clock, Sunrise, Sunset } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { confident, formatSignal, formatWater, formatTime } from "@/lib/format";
import type { Cabin } from "@/types/cabin";

function FieldNoteItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-smoke">
        <Icon size={12} strokeWidth={1.5} />
        <span className="text-data uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-heading text-wax">{value}</span>
    </div>
  );
}

const MAX_NOTES = 6;

export default function FieldNotes({ cabin }: { cabin: Cabin }) {
  const signal = formatSignal(cabin.cell_coverage);
  const season = confident(cabin.season, cabin.season_conf);
  const elevation = confident(cabin.elevation_ft, cabin.elevation_ft_conf);
  const heat = confident(cabin.heat_source, cabin.heat_source_conf);
  const water = confident(cabin.water_access, cabin.water_access_conf);

  // Pool ordered by display priority. Check-in/checkout are fillers — they
  // only appear when primary fields don't have enough data to fill the grid.
  const pool: { icon: LucideIcon; label: string; value: string | null }[] = [
    { icon: Signal, label: "Signal", value: signal },
    {
      icon: Mountain,
      label: "Elevation",
      value: elevation ? `${elevation.toLocaleString()} ft` : null,
    },
    {
      icon: Flame,
      label: "Heat",
      value: heat ? heat.replace(/\b\w/g, (c) => c.toUpperCase()) : null,
    },
    { icon: Droplets, label: "Water", value: water ? formatWater(water) : null },
    { icon: Leaf, label: "Season", value: season },
    { icon: Clock, label: "Stay Limit", value: cabin.stay_limit_raw ?? null },
    { icon: Sunrise, label: "Check-in", value: formatTime(cabin.checkin_time) },
    { icon: Sunset, label: "Check-out", value: formatTime(cabin.checkout_time) },
  ];

  const notes = pool.filter((n) => n.value !== null).slice(0, MAX_NOTES);

  if (notes.length === 0) return null;

  return (
    <section className="mt-10 lg:mt-12">
      <p className="text-data uppercase tracking-widest text-smoke mb-6">Field Notes</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {notes.map(({ icon, label, value }) => (
          <FieldNoteItem key={label} icon={icon} label={label} value={value!} />
        ))}
      </div>
    </section>
  );
}
