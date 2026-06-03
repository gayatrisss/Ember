import { Map, Bell } from "lucide-react";
import { AuthButton } from "@/components/ui/auth-button";

export default function TopNav() {
  return (
    <nav className="w-full py-8">
      <div className="page-container flex justify-between items-center">
        <span className="text-display-fraunces-nav text-wax">ember.</span>
        <div className="flex items-center gap-8">
          <a
            href="#"
            className="hidden md:flex text-body text-wax hover:text-ember items-center gap-2"
          >
            <Map size={18} />
            Explore
          </a>
          <a
            href="#"
            className="hidden md:flex text-body text-wax hover:text-ember items-center gap-2"
          >
            <Bell size={18} />
            Alerts
          </a>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
