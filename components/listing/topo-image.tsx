import Image from "next/image";
import type { CabinImage } from "@/types/cabin";

function TopoLines() {
  return (
    <svg
      viewBox="0 0 600 200"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="#2d4231" strokeWidth="1.5" fill="none">
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

type TopoImageProps = {
  images: CabinImage[];
  name: string;
};

export default function TopoImage({ images, name }: TopoImageProps) {
  const primary = images[0] ?? null;

  return (
    <div className="relative h-full bg-evergreen rounded-2xl overflow-hidden">
      {/* Topo strip — always visible at the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 opacity-80">
        <TopoLines />
      </div>

      {/* Cabin photo fades into topo strip */}
      {primary ? (
        <div className="absolute inset-0 topo-photo-fade">
          <Image
            src={primary.url}
            alt={name}
            fill
            unoptimized
            className="object-cover object-top"
          />
        </div>
      ) : (
        <div className="absolute inset-0 topo-photo-fade bg-gradient-to-b from-evergreen to-night" />
      )}

      {/* Ember location pin */}
      <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-ember shadow-ember-sm" />
    </div>
  );
}
