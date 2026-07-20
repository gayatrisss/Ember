"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCabinName, formatDateRange } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

export type AlertCardProps = {
  alertId: string;
  facilityId: string;
  cabinName: string;
  recAreaName: string | null;
  dateFrom: string;
  dateTo: string;
  imageUrl: string | null;
  status: string;
  flexibility: string | null;
  minNights: number | null;
};

type CancelState = "idle" | "loading" | "cancelled" | "fading";

const expandEase = [0.4, 0, 0.2, 1] as const;

export function AlertCard({
  alertId,
  facilityId,
  cabinName,
  recAreaName,
  dateFrom,
  dateTo,
  imageUrl,
  status,
  flexibility,
  minNights,
  defaultExpanded = false,
}: AlertCardProps & { defaultExpanded?: boolean }) {
  const router = useRouter();

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [cancelState, setCancelState] = useState<CancelState>("idle");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isCancelling = cancelState !== "idle";
  const displayStatus = isCancelling ? "cancelled" : status;

  // Toggle expansion and keep the URL's ?alert param in sync (shareable deep links).
  // history.replaceState avoids a Next navigation / server refetch.
  function toggleExpanded() {
    if (isCancelling) return;
    const next = !expanded;
    setExpanded(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("alert", alertId);
    else if (url.searchParams.get("alert") === alertId) url.searchParams.delete("alert");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const badgeTypeMap: Record<string, "default" | "accent" | "error"> = {
    active: "default",
    cancelled: "error",
  };
  const badgeLabelMap: Record<string, string> = {
    active: "Watching",
    cancelled: "Cancelled",
  };
  const badgeType = badgeTypeMap[displayStatus] ?? "default";
  const badgeLabel = badgeLabelMap[displayStatus] ?? displayStatus;
  const dateRange = formatDateRange(dateFrom, dateTo);
  const flexLabel = flexibility === "flexible" ? "± 7 days" : "Strict";

  async function handleCancel() {
    setCancelState("loading");
    setExpanded(false);

    const res = await fetch(`/api/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    if (!res.ok) {
      setCancelState("idle");
      return;
    }

    setCancelState("cancelled");
    setTimeout(() => setCancelState("fading"), 1500);
  }

  const settingsRows = (
    <div className="flex flex-col gap-2">
      <SettingRow label="Dates Watching" value={dateRange} />
      {minNights != null ? (
        <SettingRow
          label="Minimum Stay"
          value={`${minNights} ${minNights === 1 ? "night" : "nights"}`}
        />
      ) : (
        <SettingRow label="Date Flexibility" value={flexLabel} />
      )}
      <SettingRow label="Notify Me Via" value="Email" />
    </div>
  );

  const locationSection = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-label text-wax-muted uppercase">Map</p>
        <a
          href={`https://www.recreation.gov/camping/campgrounds/${facilityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:opacity-70 transition-opacity"
        >
          <span className="text-label text-wax-muted uppercase underline underline-offset-2">
            Recreation.gov
          </span>
          <ArrowUpRight size={16} className="text-wax-muted" />
        </a>
      </div>
      <div className="rounded-lg bg-smoke/10 h-24 lg:h-40 flex items-center justify-center">
        <p className="text-label text-smoke">Map coming soon</p>
      </div>
    </div>
  );

  const cancelButton = (
    <button
      type="button"
      onClick={() => setShowCancelModal(true)}
      disabled={cancelState === "loading"}
      className="flex items-center gap-2 justify-center w-full hover:opacity-70 transition-opacity disabled:opacity-50"
    >
      <span className="text-label text-ember-selected uppercase underline underline-offset-2 tracking-wider">
        Cancel alert
      </span>
      <Trash2 size={16} className="text-ember-selected" />
    </button>
  );

  const thumbnail = imageUrl ? (
    <Image
      src={imageUrl}
      alt={cabinName}
      width={106}
      height={71}
      className="w-full h-full object-cover"
    />
  ) : null;

  const cancelModal = (
    <Modal
      isOpen={showCancelModal}
      title="Cancel this alert?"
      description={`Once cancelled, you won't receive any more notifications for ${formatCabinName(cabinName)}.`}
      confirmLabel="Yes, cancel alert"
      onConfirm={() => {
        setShowCancelModal(false);
        handleCancel();
      }}
      dismissLabel="Keep watching"
      onDismiss={() => setShowCancelModal(false)}
      variant="destructive"
    />
  );

  // ─── Currently Watching / Past Alerts (active | cancelled) ──────────────────
  const showBody = expanded && !isCancelling;

  // Mobile overlay badge: always fill for visibility against the photo
  const mobileBadgeTypeMap: Record<string, "accent" | "error"> = {
    active: "accent",
    cancelled: "error",
  };
  const mobileBadgeType = mobileBadgeTypeMap[displayStatus] ?? "accent";

  return (
    <>
      <motion.div
        animate={{ opacity: cancelState === "fading" ? 0 : 1 }}
        transition={{ duration: 0.35 }}
        onAnimationComplete={() => {
          if (cancelState === "fading") router.refresh();
        }}
      >
        {/* ── Mobile card ── */}
        <div className="lg:hidden bg-evergreen rounded-lg overflow-hidden">
          {/* Photo header */}
          <div className="relative w-full aspect-[3/2] overflow-hidden">
            {imageUrl && (
              <Image src={imageUrl} alt={cabinName} fill sizes="100vw" className="object-cover" />
            )}
            <div className="absolute top-4 left-4">
              <Badge type={mobileBadgeType} fill="fill">
                {badgeLabel}
              </Badge>
            </div>
          </div>

          {/* Card body */}
          <div className="p-4">
            {/* Name + location + dates */}
            <div className="flex flex-col gap-2">
              {recAreaName && <p className="text-data text-wax-muted uppercase">{recAreaName}</p>}
              <Link
                href={`/cabin/${facilityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-display-fraunces-sm text-wax hover:opacity-80 transition-opacity"
              >
                {formatCabinName(cabinName)}
              </Link>
              <p className="text-body text-wax-muted">{dateRange}</p>
            </div>

            {/* Expanded content */}
            <AnimatePresence initial={false}>
              {showBody && (
                <motion.div
                  key="mobile-body"
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: expandEase }}
                >
                  <div className="flex flex-col gap-12 mt-12">
                    {settingsRows}
                    {status !== "cancelled" && cancelButton}
                    {locationSection}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* See / Hide toggle — always visible */}
            <div className="mt-8 border-t border-wax-muted/20">
              <button
                type="button"
                onClick={toggleExpanded}
                disabled={isCancelling}
                className="w-full pt-4 flex items-center justify-center gap-2"
              >
                <span className="text-label text-wax-muted uppercase">
                  {showBody ? "Hide Alert Details" : "See Alert Details"}
                </span>
                <motion.div
                  animate={{ rotate: showBody ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: expandEase }}
                >
                  <ChevronDown size={16} className="text-wax-muted" />
                </motion.div>
              </button>
            </div>
          </div>
        </div>

        {/* ── Desktop card ── */}
        <div
          className={`hidden lg:block bg-evergreen rounded-lg overflow-hidden ${!isCancelling ? "cursor-pointer" : "cursor-default"}`}
          onClick={toggleExpanded}
        >
          <div className="flex p-5 items-center justify-between">
            <Link
              href={`/cabin/${facilityId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-6 hover:opacity-80 transition-opacity"
            >
              <div className="w-alert-thumb h-alert-thumb rounded shrink-0 overflow-hidden bg-smoke/20">
                {thumbnail}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-display-fraunces-sm text-white">{formatCabinName(cabinName)}</p>
                <p className="text-body text-wax-muted">
                  {recAreaName ? `${recAreaName} · ${dateRange}` : dateRange}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3 shrink-0">
              <Badge type={badgeType}>{badgeLabel}</Badge>
              <motion.div
                animate={{ rotate: showBody ? 180 : 0 }}
                transition={{ duration: 0.3, ease: expandEase }}
              >
                <ChevronDown size={24} className="text-wax" />
              </motion.div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showBody && (
              <motion.div
                key="desktop-body"
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: expandEase }}
              >
                <div className="px-30 py-15 flex flex-col gap-12">
                  {settingsRows}
                  {locationSection}
                  {status !== "cancelled" && cancelButton}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      {cancelModal}
    </>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <p className="text-label text-wax-muted uppercase">{label}</p>
      <div className="flex items-center gap-3">
        <p className="text-body text-wax">{value}</p>
        <Pencil size={16} className="text-wax" />
      </div>
    </div>
  );
}
