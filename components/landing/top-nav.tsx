"use client";

import { useEffect, useState } from "react";
import { Map, Bell, Search, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AuthButton } from "@/components/ui/auth-button";

const SCROLL_THRESHOLD = 400;
const transitionEase = [0.4, 0, 0.2, 1] as const;

export default function TopNav({ email }: { email: string | null }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          scrolled ? "bg-night/95 backdrop-blur-sm border-b border-wax/5" : ""
        }`}
      >
        <div className="page-container h-20 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="text-display-fraunces-nav text-wax shrink-0 logo-glow-hover">
            ember.
          </Link>

          {/* Center — desktop only: nav links or inline search */}
          <div className="hidden md:flex flex-1 justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {scrolled ? (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: transitionEase }}
                  className="w-full max-w-[520px]"
                >
                  <NavSearchBar />
                </motion.div>
              ) : (
                <motion.div
                  key="links"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease: transitionEase }}
                  className="flex items-center gap-12"
                >
                  <a
                    href="#"
                    className="flex items-center gap-2 text-body text-wax hover:text-ember transition-colors"
                  >
                    <Map size={24} />
                    Explore
                  </a>
                  <a
                    href="/my-alerts"
                    className="flex items-center gap-2 text-body text-wax hover:text-ember transition-colors"
                  >
                    <Bell size={24} />
                    Alerts
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right — auth always visible */}
          <div className="shrink-0">
            <AuthButton email={email} />
          </div>
        </div>
      </nav>
      {/* Offset for fixed nav */}
      <div className="h-20" aria-hidden="true" />
    </>
  );
}

function NavSearchBar() {
  return (
    <button
      type="button"
      className="w-full bg-wax rounded-xl pl-6 pr-3 py-3 flex items-center justify-between gap-4 hover:brightness-[0.97] transition-[filter]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Search size={24} className="text-smoke shrink-0" />
        <span className="text-body text-smoke truncate">Where to?</span>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="border-l border-wax-muted pl-4 flex items-center gap-3">
          <Calendar size={24} className="text-smoke shrink-0" />
          <span className="text-body text-smoke whitespace-nowrap">Any dates</span>
        </div>
        <div className="bg-ember w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
          <ArrowRight size={18} className="text-wax" />
        </div>
      </div>
    </button>
  );
}
