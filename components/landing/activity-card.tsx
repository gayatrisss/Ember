import { Flame } from "lucide-react";

type Props = {
  name: string;
  location: string;
  state: "OPEN" | "WATCH";
  meta: string;
  ago: string;
};

export default function ActivityCard({ name, location, state, meta, ago }: Props) {
  const isOpen = state === "OPEN";

  return (
    <div
      className={`bg-evergreen rounded-xl p-6 border ${
        isOpen ? "border-ember/50 shadow-ember-md" : "border-evergreen"
      }`}
    >
      <div className="flex justify-between items-center">
        {isOpen ? (
          <span className="bg-ember text-wax px-2 py-1 rounded text-label uppercase flex items-center gap-1">
            <Flame size={12} />
            OPEN
          </span>
        ) : (
          <span className="border border-wax/30 text-wax/70 px-2 py-1 rounded text-label uppercase">
            WATCH
          </span>
        )}
        <span className="text-data text-wax/50 uppercase">{ago}</span>
      </div>

      <p className="text-display-fraunces-sm text-wax mt-6">{name}</p>
      <p className="text-body text-wax/70 mt-1">{location}</p>
      <p className={`text-data uppercase tracking-wider mt-6 ${isOpen ? "text-ember" : "text-wax/40"}`}>
        {meta}
      </p>
    </div>
  );
}
