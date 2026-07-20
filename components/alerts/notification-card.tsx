"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCabinName } from "@/lib/format";
import { Modal } from "@/components/ui/modal";

export type OpeningWindow = {
  notificationId: string;
  dates: string; // "July 4th-7th"
  sentAgo: string; // "4 hrs ago"
};

export type NotificationCardProps = {
  alertId: string;
  facilityId: string;
  cabinName: string;
  recAreaName: string | null;
  price: string | null; // "$50/night" or null
  watchDates: string; // the alert's watched range, "July 1st-31st"
  minNights: number | null;
  lastChecked: string; // we don't track this yet -> "—"
  notifiedAgo: string; // most recent opening, "4 hrs ago"
  windows: OpeningWindow[];
};

const expandEase = [0.4, 0, 0.2, 1] as const;
const bookUrl = (facilityId: string) =>
  `https://www.recreation.gov/camping/campgrounds/${facilityId}`;

export function NotificationCard({
  alertId,
  facilityId,
  cabinName,
  recAreaName,
  price,
  watchDates,
  minNights,
  lastChecked,
  notifiedAgo,
  windows,
}: NotificationCardProps) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [rightFade, setRightFade] = useState(false);

  // Arrows disable at the bounds; fades show only when a card is actually bisected by an
  // edge (i.e. partly hidden) — not when cards line up flush to the edge.
  function updateEdges(el: HTMLDivElement) {
    setCanScroll(el.scrollWidth > el.clientWidth + 1);
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);

    const box = el.getBoundingClientRect();
    let right = false;
    for (const child of Array.from(el.children) as HTMLElement[]) {
      const c = child.getBoundingClientRect();
      if (c.left < box.right - 1 && c.right > box.right + 1) right = true;
    }
    setRightFade(right);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges(el);
    const onResize = () => updateEdges(el);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll the carousel by one card width (+ the gap-6 24px gutter).
  function scrollByCard(dir: number) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const amount = (card?.clientWidth ?? el.clientWidth) + 24;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  async function cancelAlert() {
    setCancelling(true);
    const res = await fetch(`/api/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) router.refresh();
    else setCancelling(false);
  }

  return (
    <>
      <div className="bg-evergreen rounded-lg overflow-hidden">
        {/* Status bar */}
        <div className="bg-ash h-alert-header flex items-center justify-between px-6">
          <span className="flex items-center gap-2 text-data text-smoke uppercase">
            <span className="size-3 rounded-full border-2 border-ember" />
            Last Checked <span className="text-wax-muted">{lastChecked}</span>
          </span>
          <span className="text-data text-smoke uppercase">
            Notified <span className="text-wax-muted">{notifiedAgo}</span>
          </span>
        </div>

        <div className="px-6 lg:px-20 pt-12 pb-15">
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-2">
              <Link
                href={`/cabin/${facilityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-display-fraunces-sm text-white hover:opacity-80 transition-opacity"
              >
                {formatCabinName(cabinName)}
              </Link>
              {recAreaName && <p className="text-body text-wax-muted">{recAreaName}</p>}
            </div>
            <div className="flex flex-col gap-2 items-end shrink-0">
              <p className="text-label text-wax-muted uppercase">Dates Watching</p>
              <p className="text-body text-white">{watchDates}</p>
            </div>
          </div>

          {/* Opening windows — swipeable carousel (like "Lately on Ember") */}
          <div className="mt-12">
            {canScroll && (
              <div className="flex justify-end gap-2 mb-4">
                <button
                  type="button"
                  aria-label="Previous opening"
                  onClick={() => scrollByCard(-1)}
                  disabled={atStart}
                  className="h-9 w-9 rounded-full border border-wax/30 flex items-center justify-center text-wax hover:border-ember hover:text-ember transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Next opening"
                  onClick={() => scrollByCard(1)}
                  disabled={atEnd}
                  className="h-9 w-9 rounded-full border border-wax/30 flex items-center justify-center text-wax hover:border-ember hover:text-ember transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            <div className="relative">
              <div
                ref={trackRef}
                onScroll={(e) => updateEdges(e.currentTarget)}
                className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory"
              >
                {windows.map((w) => (
                  <div
                    key={w.notificationId}
                    className="w-full md:w-1/2 lg:w-1/3 shrink-0 min-w-[var(--width-opening-card)] snap-start"
                  >
                    <NotificationWindow window={w} price={price} facilityId={facilityId} />
                  </div>
                ))}
              </div>
              {rightFade && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 hidden md:block bg-gradient-to-l from-evergreen to-transparent" />
              )}
            </div>
          </div>

          <p className="mt-6 text-body text-ember">
            ⚡ These cabins re-book in minutes. Have your Recreation.gov login ready.
          </p>

          <div className="mt-8 h-px bg-smoke/20" />

          {/* Details expander */}
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-full pt-6 flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex gap-4 items-center">
              <span className="text-body text-wax">{detailsOpen ? "Hide" : "Show"} alert details</span>
              <span className="text-body text-wax-muted">settings, history, and more</span>
            </div>
            <motion.div animate={{ rotate: detailsOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: expandEase }}>
              <ChevronDown size={24} className="text-wax" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {detailsOpen && (
              <motion.div
                key="details"
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: expandEase }}
              >
                <div className="pt-8 flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <SettingRow label="Dates Watching" value={watchDates} />
                    {minNights != null && (
                      <SettingRow
                        label="Minimum Stay"
                        value={`${minNights} ${minNights === 1 ? "night" : "nights"}`}
                      />
                    )}
                    <SettingRow label="Notify Me Via" value="Email" />
                  </div>
                  <a
                    href={bookUrl(facilityId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-label text-wax-muted uppercase underline underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    View on Recreation.gov
                    <ArrowUpRight size={16} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    disabled={cancelling}
                    className="flex items-center gap-2 justify-center w-full hover:opacity-70 transition-opacity disabled:opacity-50"
                  >
                    <span className="text-label text-ember-selected uppercase underline underline-offset-2 tracking-wider">
                      Cancel alert
                    </span>
                    <Trash2 size={16} className="text-ember-selected" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal
        isOpen={showCancelModal}
        title="Cancel this alert?"
        description={`Once cancelled, you won't receive any more notifications for ${formatCabinName(cabinName)}.`}
        confirmLabel="Yes, cancel alert"
        onConfirm={() => {
          setShowCancelModal(false);
          cancelAlert();
        }}
        dismissLabel="Keep watching"
        onDismiss={() => setShowCancelModal(false)}
        variant="destructive"
      />
    </>
  );
}

function NotificationWindow({
  window,
  price,
  facilityId,
}: {
  window: OpeningWindow;
  price: string | null;
  facilityId: string;
}) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);

  async function dismiss() {
    setDismissing(true);
    const res = await fetch(`/api/notifications/${window.notificationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    });
    if (res.ok) router.refresh();
    else setDismissing(false);
  }

  return (
    <div className="bg-night/40 border border-smoke/15 rounded-lg p-5 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <WindowRow label="Dates" value={window.dates} />
        {price && <WindowRow label="Price" value={price} />}
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={bookUrl(facilityId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-ember text-wax text-body px-4 py-3 rounded-lg hover:brightness-110 transition-all"
        >
          Book on Recreation.gov
          <ArrowUpRight size={16} />
        </a>
        <button
          type="button"
          onClick={dismiss}
          disabled={dismissing}
          className="flex items-center justify-center gap-2 border border-ember text-ember text-body px-4 py-3 rounded-lg hover:bg-ember/10 transition-colors disabled:opacity-50"
        >
          Dismiss this window
          <X size={16} />
        </button>
      </div>

      <p className="text-center text-data text-smoke uppercase">{window.sentAgo}</p>
    </div>
  );
}

function WindowRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-data text-smoke uppercase">{label}</span>
      <span className="text-body text-white">{value}</span>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <p className="text-label text-wax-muted uppercase">{label}</p>
      <p className="text-body text-wax">{value}</p>
    </div>
  );
}
