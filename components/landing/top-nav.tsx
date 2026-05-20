import { Map, Bell } from "lucide-react";

export default function TopNav() {
  return (
    <nav className="w-full py-8">
      <div className="page-container flex justify-between items-center">
        <span className="text-display-fraunces-nav text-wax">
          ember.
        </span>
        <div className="flex items-center gap-8">
          <a href="#" className="text-body text-wax hover:text-ember flex items-center gap-2">
            <Map size={18} />
            Explore
          </a>
          <a href="#" className="text-body text-wax hover:text-ember flex items-center gap-2">
            <Bell size={18} />
            Alerts
          </a>
          <button className="bg-ember text-wax rounded-lg px-6 py-3 text-body hover:brightness-110">
            Log in
          </button>
        </div>
      </div>
    </nav>
  );
}
