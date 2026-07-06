import { Flame } from "lucide-react";

type Props = {
  name: string;
  location: string;
  state: "OPEN" | "WATCH";
  meta: string;
  ago: string;
};

// One card in the "Lately on Ember" feed. OPEN is the "lit" state (Figma 3557-4124):
// ember gradient + full ember border + ember meta. WATCH is the unlit counterpart.
export default function ActivityCard({ name, location, state, meta, ago }: Props) {
  const isOpen = state === "OPEN";

  return (
    <div
      className={`w-full h-full flex flex-col gap-3.5 rounded-xl px-5 py-4 border ${
        isOpen ? "bg-card-open border-ember" : "bg-night border-smoke-deep"
      }`}
    >
      {/* State badge + relative time */}
      <div className="flex items-center justify-between w-full">
        {isOpen ? (
          <span className="flex items-center justify-center gap-1 bg-ember rounded-sm px-2 py-0.5">
            <Flame size={12} className="text-wax" />
            <span className="text-data text-wax uppercase">OPEN</span>
          </span>
        ) : (
          <span className="flex items-center justify-center rounded-sm border border-smoke-deep px-2 py-0.5">
            <span className="text-data text-smoke uppercase">WATCH</span>
          </span>
        )}
        <span className="text-data text-wax-muted uppercase">{ago}</span>
      </div>

      {/* Name + location */}
      <div className="flex flex-col gap-2">
        <p className="text-display-fraunces-sm text-white">{name}</p>
        <p className="text-body text-wax-muted">{location}</p>
      </div>

      {/* Dates / status meta — pinned to the bottom so equal-height cards align */}
      <p className={`text-data uppercase mt-auto ${isOpen ? "text-ember" : "text-wax-muted"}`}>{meta}</p>
    </div>
  );
}
