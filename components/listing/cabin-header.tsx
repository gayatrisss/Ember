import { confident, formatFacilityName, getCabinType, formatRate } from "@/lib/format";
import type { Cabin } from "@/types/cabin";

function FactItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-data uppercase tracking-widest text-smoke">{label}</span>
      <span className="text-body text-wax">{value}</span>
    </div>
  );
}

export default function CabinHeader({ cabin }: { cabin: Cabin }) {
  const name = formatFacilityName(cabin.facility_name);
  const sleeps = confident(cabin.sleeps, cabin.sleeps_conf);

  return (
    <div className="flex flex-col gap-4">
      {cabin.rec_area_name && (
        <span className="inline-flex w-fit items-center px-3 py-1 rounded-full bg-evergreen border border-smoke/20 text-label text-smoke uppercase tracking-widest">
          {cabin.rec_area_name}
        </span>
      )}

      <h1 className="text-display-fraunces text-wax">{name}</h1>

      <div className="flex flex-wrap gap-6 pt-1">
        <FactItem label="Sleeps" value={sleeps ? `${sleeps} people` : "—"} />
        <FactItem label="Type" value={getCabinType(cabin.facility_name)} />
        <FactItem label="Signal" value="—" />
        <FactItem label="Price" value={formatRate(cabin.nightly_rate) ?? "—"} />
      </div>
    </div>
  );
}
