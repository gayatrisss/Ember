"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ActivityCard from "./activity-card";
import { IconButton } from "@/components/ui/icon-button";
import type { ActivityItem } from "@/lib/activity";

export default function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
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

  // Page by a whole number of cards. Scrolling by clientWidth alone is short by one
  // gap per press (a card occupies cardWidth + gap), which accumulates into cards
  // sitting progressively off-gutter — snap-mandatory doesn't reliably recover from
  // a programmatic scroll on iOS. Targeting an absolute offset rather than a delta
  // also stops any residual error compounding. Still keys off measured geometry, so
  // it holds at every breakpoint without a hard-coded card count.
  function page(direction: -1 | 1) {
    const el = listRef.current;
    const first = el?.firstElementChild;
    if (!el || !first) return;

    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = first.getBoundingClientRect().width + gap;
    if (step <= 0) return;

    const perPage = Math.max(1, Math.round(el.clientWidth / step));
    const currentIndex = Math.round(el.scrollLeft / step);
    const lastIndex = Math.max(0, el.children.length - perPage);
    const nextIndex = Math.min(lastIndex, Math.max(0, currentIndex + direction * perPage));

    el.scrollTo({ left: nextIndex * step, behavior: "smooth" });
  }

  return (
    <section className="page-container pt-section lg:py-16">
      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 min-w-0">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-3 h-3 rounded-full bg-ember shadow-ember-sm shrink-0" />
            <span className="text-eyebrow text-wax uppercase">LATELY ON EMBER</span>
          </div>
          {/* The section's one honesty marker: the activity below is illustrative.
              Kept subtle and stated once here rather than repeated on every card. */}
          <span className="text-data text-wax/40 uppercase tracking-wider">
            SAMPLE ACTIVITY · CABINS ARE REAL
          </span>
        </div>
        <div className="flex gap-3 shrink-0">
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
        className="mt-bonded lg:mt-bonded-lg flex items-stretch gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="snap-start shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]"
          >
            <ActivityCard {...activity} />
          </div>
        ))}
      </div>
    </section>
  );
}
