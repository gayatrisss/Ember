import { ArrowUpRight } from "lucide-react";
import { recGovUrl as buildRecGovUrl } from "@/lib/recgov";

type StatusBarProps = {
  facilityId?: string;
  /** Stored cabins.reservation_url — type-aware, preferred over the derived fallback. */
  reservationUrl?: string | null;
};

export default function StatusBar({ facilityId, reservationUrl }: StatusBarProps) {
  const recGovUrl = facilityId ? buildRecGovUrl(facilityId, reservationUrl) : "#";

  return (
    <div className="w-full bg-evergreen">
      <div className="page-container flex justify-between items-center py-3">
        <div className="flex items-center gap-2 text-data text-wax">
          <div className="w-2 h-2 rounded-full bg-ember shadow-ember-sm shrink-0" />
          last checked 47s ago
        </div>
        <a
          href={recGovUrl}
          target={facilityId ? "_blank" : undefined}
          rel={facilityId ? "noopener noreferrer" : undefined}
          className="text-label text-wax hover:text-ember transition-colors underline lg:no-underline shrink-0 inline-flex items-center gap-1"
        >
          {/* Shortened below lg so the row stays on one line at 353px. */}
          <span className="lg:hidden">Recreation.gov</span>
          <span className="hidden lg:inline">view full details on Recreation.gov</span>
          <ArrowUpRight size={16} className="shrink-0" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
