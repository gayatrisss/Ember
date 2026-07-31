type BookingPanelProps = {
  title: string;
  children: React.ReactNode;
  cta?: React.ReactNode;
};

export function BookingPanel({ title, children, cta }: BookingPanelProps) {
  return (
    // Below lg the drawer supplies the surface, the padding and the height, so
    // the panel drops its card chrome and simply fills whatever it's given. The
    // content area scrolls there because the six panel states differ wildly in
    // height and the drawer is a fixed frame; desktop keeps its 680px card.
    <div className="flex flex-col h-full lg:h-[680px] lg:bg-evergreen lg:rounded-2xl lg:p-9">
      {title && (
        <p className="text-data uppercase tracking-widest text-ember shrink-0">{title}</p>
      )}
      <div className="mt-grouped lg:mt-12 flex-1 min-h-0 overflow-y-auto lg:overflow-y-visible">
        {children}
      </div>
      {cta != null && (
        <div className="pt-6 border-t border-wax/10 shrink-0">{cta}</div>
      )}
    </div>
  );
}
