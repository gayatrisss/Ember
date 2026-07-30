// Two-row grid rather than two nested flex rows, because the copyright changes
// partner between breakpoints: on mobile it sits beside the wordmark, on desktop it
// pairs with the disclaimer. Grid placement moves it without duplicating the node.
export default function Footer() {
  return (
    <footer className="bg-wax text-night">
      <div className="page-container py-5 lg:py-20">
        <div className="grid grid-cols-2 items-center lg:items-end gap-y-bonded lg:gap-y-32">
          <div className="lg:col-span-2">
            <p className="text-display-fraunces-sm text-smoke">ember.</p>
            <p className="text-display-fraunces-xs text-smoke">refresh less, camp more.</p>
          </div>
          <p className="order-last lg:order-none col-span-2 lg:col-span-1 text-label text-night/80">
            Not affiliated with Recreation.gov, the National Parks Service, or the Bureau of Land
            Management.
          </p>
          <p className="justify-self-end text-data text-night/80 uppercase tracking-wider">
            © 2026 EMBER
          </p>
        </div>
      </div>
    </footer>
  );
}
