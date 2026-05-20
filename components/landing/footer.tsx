export default function Footer() {
  return (
    <footer className="bg-wax text-night">
      <div className="page-container py-20">
        <div>
          <p className="text-display-fraunces-sm text-smoke">ember.</p>
          <p className="text-display-geist-sm text-smoke">
            refresh less, camp more.
          </p>
        </div>
        <div className="mt-32 flex justify-between items-end">
          <p className="text-label text-night/80">
            Not affiliated with Recreation.gov, the National Parks Service, or the Bureau of Land Management.
          </p>
          <p className="text-data text-night/80 uppercase tracking-wider">
            © 2026 EMBER
          </p>
        </div>
      </div>
    </footer>
  );
}
