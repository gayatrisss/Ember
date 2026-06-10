"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AuthButton } from "@/components/ui/auth-button";
import { NavSearch } from "@/components/ui/nav-search";

const SCROLL_THRESHOLD = 400;
const transitionEase = [0.4, 0, 0.2, 1] as const;

export default function TopNav({ email, name }: { email: string | null; name: string | null }) {
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
          scrolled ? "bg-ash backdrop-blur-sm" : ""
        }`}
      >
        <div className="page-container relative h-20 flex items-center justify-between">
          {/* Left group: logo + desktop nav links */}
          <div className="flex items-center gap-[60px]">
            <Link href="/" className="text-display-fraunces-nav text-wax shrink-0 logo-glow-hover">
              ember.
            </Link>

            <div className="hidden md:block">
              <AnimatePresence initial={false}>
                {!scrolled && (
                  <motion.div
                    key="links"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2, ease: transitionEase }}
                    className="flex items-center gap-[60px] mt-4"
                  >
                    <a
                      href="#"
                      className="text-body text-wax uppercase hover:text-ember transition-colors"
                    >
                      Explore
                    </a>
                    <a
                      href="/my-alerts"
                      className="text-body text-wax uppercase hover:text-ember transition-colors"
                    >
                      Alerts
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Center — search bar, centered in the nav; appears when scrolled */}
          <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-nav-search">
            <AnimatePresence initial={false}>
              {scrolled && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: transitionEase }}
                >
                  <NavSearch />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right — auth always visible */}
          <div className="shrink-0">
            <AuthButton email={email} name={name} />
          </div>
        </div>
      </nav>
      {/* Offset for fixed nav */}
      <div className="h-20" aria-hidden="true" />
    </>
  );
}
