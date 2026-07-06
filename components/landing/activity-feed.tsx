"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ActivityCard from "./activity-card";
import { IconButton } from "@/components/ui/icon-button";
import type { ActivityItem } from "@/lib/activity";

export default function ActivityFeed({
  activities,
  recentCount,
}: {
  activities: ActivityItem[];
  recentCount: number;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Track scroll position so the arrows can disable at each end. Measured after
  // paint (rAF) and on scroll/resize; defaults are safe for SSR (list starts left).
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 0);
      setAtEnd(Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth);
    };
    const raf = requestAnimationFrame(update);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Page by one full viewport so cards always land flush on a card boundary
  // (snap-mandatory does the aligning). Works at every breakpoint since it keys
  // off the visible width rather than a hard-coded card count.
  function page(direction: -1 | 1) {
    const el = listRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  return (
    <section className="page-container py-16">
      <div className="flex justify-between items-center">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-ember shadow-ember-sm" />
            <span className="text-data text-wax uppercase tracking-wider">LATELY ON EMBER</span>
          </div>
          <span className="text-data text-wax/50 uppercase tracking-wider">
            {recentCount} {recentCount === 1 ? "ACTIVITY" : "ACTIVITIES"} IN THE LAST 30 MINUTES
          </span>
        </div>
        <div className="flex gap-2">
          <IconButton
            icon={ArrowLeft}
            label="Previous activities"
            onClick={() => page(-1)}
            disabled={atStart}
          />
          <IconButton
            icon={ArrowRight}
            label="Next activities"
            onClick={() => page(1)}
            disabled={atEnd}
          />
        </div>
      </div>

      {/* Snap carousel: exactly N cards fill the row (1 → 2 at sm → 3 at lg → 4 at xl),
          so a card is never clipped and no edge-fade is needed. calc() keeps N cards
          plus the 24px (gap-6) gutters summing to exactly 100%. */}
      <div
        ref={listRef}
        className="mt-8 flex items-stretch gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {activities.map((activity, i) => (
          <div
            key={i}
            className="snap-start shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]"
          >
            <ActivityCard {...activity} />
          </div>
        ))}
      </div>
    </section>
  );
}
