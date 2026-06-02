import { formatFacilityName } from "@/lib/format";
import type { Cabin } from "@/types/cabin";

export default function CabinHeader({ cabin }: { cabin: Cabin }) {
  const name = formatFacilityName(cabin.facility_name);

  return (
    <div className="flex flex-col gap-4">
      {cabin.rec_area_name && (
        <span className="inline-flex w-fit items-center px-3 py-1 rounded-full bg-evergreen border border-smoke/20 text-label text-smoke uppercase tracking-widest">
          {cabin.rec_area_name}
        </span>
      )}

      <h1 className="text-display-fraunces text-wax">{name}</h1>
    </div>
  );
}
