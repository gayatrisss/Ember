"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Globe, LogOut, User, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Mobile-only bottom navigation. Below lg the top nav is hidden entirely, so this
// carries everything it used to: the section links and the auth action. Fixed, with
// page content padded by .pb-tab-bar so nothing ever sits underneath it.
export default function MobileTabBar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          window.location.pathname
        )}`,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <nav
      aria-label="Primary"
      data-tab-bar
      // z-40 keeps the bar under field popovers (z-50). Without this the bar wins
      // on paint order alone, since it renders after the page content.
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-evergreen pb-safe"
    >
      <div className="flex items-stretch">
        <Tab
          href="/explore"
          icon={Globe}
          label="Explore"
          active={pathname.startsWith("/explore")}
        />
        <Tab
          href="/my-alerts"
          icon={Bell}
          label="Alerts"
          active={pathname.startsWith("/my-alerts")}
        />
        {email ? (
          <Tab icon={LogOut} label="Log out" onClick={signOut} />
        ) : (
          <Tab icon={User} label="Log in" onClick={signIn} />
        )}
      </div>
    </nav>
  );
}

type TabProps = {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

function Tab({ icon: Icon, label, href, onClick, active = false }: TabProps) {
  const tone = active ? "text-ember" : "text-wax";
  const inner = (
    <>
      <Icon size={24} />
      <span className="text-label uppercase tracking-wider truncate max-w-full">{label}</span>
    </>
  );
  const className = `flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-3 transition-colors hover:text-ember ${tone}`;

  if (href) {
    return (
      <Link href={href} className={className} aria-current={active ? "page" : undefined}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
