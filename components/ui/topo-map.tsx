import Image from "next/image";
import { cn } from "@/lib/utils";
import { staticTopoMapUrl } from "@/lib/mapbox";

// Decorative fallback contour lines, shown when a cabin has no coordinates.
function TopoLines() {
  return (
    <svg
      viewBox="0 0 600 200"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="#232d33" strokeWidth="1.5" fill="none">
        <path d="M-10,18 C80,6 160,26 260,10 S390,0 610,16" />
        <path d="M-10,44 C70,30 170,50 270,34 S395,20 610,40" />
        <path d="M-10,72 C60,58 165,76 275,60 S400,46 610,68" />
        <path d="M-10,102 C75,86 175,106 280,88 S405,74 610,98" />
        <path d="M-10,134 C85,118 180,138 290,118 S408,104 610,128" />
        <path d="M-10,168 C90,152 185,172 295,152 S410,138 610,162" />
        <path d="M-10,198 C95,184 188,200 302,184 S412,170 610,194" />
      </g>
    </svg>
  );
}

type TopoMapProps = {
  lat: number | null;
  lng: number | null;
  name: string;
  className?: string;
};

export default function TopoMap({ lat, lng, name, className }: TopoMapProps) {
  const url = lat != null && lng != null ? staticTopoMapUrl({ lat, lng }) : null;

  return (
    <div className={cn("relative h-full w-full rounded-2xl overflow-hidden bg-evergreen", className)}>
      {url ? (
        <>
          <Image
            src={url}
            alt={`Map showing the location of ${name}`}
            fill
            unoptimized
            className="object-cover"
          />
          {/* Centered on the cabin, so the center pin marks it exactly */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-ember shadow-ember-sm ring-2 ring-night/50" />
        </>
      ) : (
        <div className="absolute inset-0 opacity-80">
          <TopoLines />
        </div>
      )}
    </div>
  );
}
