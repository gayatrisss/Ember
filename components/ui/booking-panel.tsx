type BookingPanelProps = {
  title: string;
  children: React.ReactNode;
  cta?: React.ReactNode;
};

export function BookingPanel({ title, children, cta }: BookingPanelProps) {
  return (
    <div className="bg-evergreen rounded-2xl p-9 flex flex-col h-[600px]">
      {title && (
        <p className="text-data uppercase tracking-widest text-ember shrink-0">{title}</p>
      )}
      <div className="mt-12 flex-1 min-h-0">{children}</div>
      {cta != null && (
        <div className="pt-6 border-t border-wax/10 shrink-0">{cta}</div>
      )}
    </div>
  );
}
