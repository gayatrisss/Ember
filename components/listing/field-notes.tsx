import { Mountain, Flame, Droplets, Signal, Leaf, Clock, Sunrise, Sunset } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { resolveFieldNotes, type FieldNoteLabel } from "@/lib/facts";
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

/** Fills two rows of the 3-column grid. A layout constraint, not a data one. */
const MAX_NOTES = 6;

// Keyed by FieldNoteLabel, so adding or renaming a note in lib/facts.ts fails the build
// here until it gets an icon, rather than silently rendering without one.
const NOTE_ICONS: Record<FieldNoteLabel, LucideIcon> = {
  Signal: Signal,
  Elevation: Mountain,
  Heat: Flame,
  Water: Droplets,
  Season: Leaf,
  "Stay Limit": Clock,
  "Check-in": Sunrise,
  "Check-out": Sunset,
};

export default function FieldNotes({ cabin }: { cabin: Cabin }) {
  const notes = resolveFieldNotes(cabin).slice(0, MAX_NOTES);

  if (notes.length === 0) return null;

  return (
    <section className="mt-10 lg:mt-12">
      <p className="text-data uppercase tracking-widest text-smoke mb-6">Field Notes</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {notes.map(({ label, value }) => (
          <FieldNoteItem key={label} icon={NOTE_ICONS[label]} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}
