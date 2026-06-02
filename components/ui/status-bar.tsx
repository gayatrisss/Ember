type StatusBarProps = {
  facilityId?: string;
};

export default function StatusBar({ facilityId }: StatusBarProps) {
  const recGovUrl = facilityId
    ? `https://www.recreation.gov/camping/campgrounds/${facilityId}`
    : "#";

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
          className="text-label text-wax hover:text-ember transition-colors"
        >
          view full details on Recreation.gov ↗
        </a>
      </div>
    </div>
  );
}
