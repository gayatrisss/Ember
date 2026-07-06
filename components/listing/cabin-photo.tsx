import Image from "next/image";
import { cn } from "@/lib/utils";
import type { CabinImage } from "@/types/cabin";

type CabinPhotoProps = {
  images: CabinImage[];
  name: string;
  className?: string;
};

export default function CabinPhoto({ images, name, className }: CabinPhotoProps) {
  const primary = images[0] ?? null;

  return (
    <div className={cn("relative aspect-[3/2] w-full rounded-2xl overflow-hidden bg-evergreen", className)}>
      {primary ? (
        <Image
          src={primary.url}
          alt={name}
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-evergreen to-night" />
      )}
    </div>
  );
}
