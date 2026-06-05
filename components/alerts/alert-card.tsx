import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { formatCabinName, formatDateRange } from "@/lib/format";

type Props = {
  cabinName: string;
  recAreaName: string | null;
  dateFrom: string;
  dateTo: string;
  imageUrl: string | null;
  status: string;
};

export function AlertCard({ cabinName, recAreaName, dateFrom, dateTo, imageUrl, status }: Props) {
  return (
    <div className="bg-evergreen rounded-lg p-5 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="w-alert-thumb h-alert-thumb rounded shrink-0 overflow-hidden bg-smoke/20">
          {imageUrl && (
            <Image src={imageUrl} alt={cabinName} width={106} height={71} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-display-fraunces-sm text-white">{formatCabinName(cabinName)}</p>
          <p className="text-body text-wax-muted">
            {recAreaName ? `${recAreaName} · ${formatDateRange(dateFrom, dateTo)}` : formatDateRange(dateFrom, dateTo)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="border border-smoke/30 rounded-sm px-2 py-0.5">
          <span className="text-data text-smoke uppercase">{status}</span>
        </div>
        <ChevronDown size={24} className="text-wax" />
      </div>
    </div>
  );
}
