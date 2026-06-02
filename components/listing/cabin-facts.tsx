type Fact = { label: string; value: string };

export function CabinFacts({ facts }: { facts: Fact[] }) {
  return (
    <div className="p-9 flex justify-between">
      {facts.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-label text-smoke uppercase">{label}</span>
          <span className="text-body text-wax">{value}</span>
        </div>
      ))}
    </div>
  );
}
