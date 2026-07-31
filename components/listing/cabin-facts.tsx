type Fact = { label: string; value: string };

export function CabinFacts({ facts }: { facts: Fact[] }) {
  return (
    // 2x2 below lg: four across gives each fact ~88px at 353, which wraps
    // "4WD only" and "$75 / night" badly.
    <div className="grid grid-cols-2 gap-x-4 gap-y-bonded lg:flex lg:justify-between lg:p-9">
      {facts.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">

          <span className="text-label text-smoke uppercase">{label}</span>
          <span className="text-body text-wax">{value}</span>
        </div>
      ))}
    </div>
  );
}
