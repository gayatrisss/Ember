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
}: AlertCardProps) {
  const router = useRouter();
  const isTriggered = status === "triggered";

  const [expanded, setExpanded] = useState(false);
  const [metaVisible, setMetaVisible] = useState(true);
  const [cancelState, setCancelState] = useState<CancelState>("idle");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isCancelling = cancelState !== "idle";
  const displayStatus = isCancelling ? "cancelled" : status;

  const badgeVariantMap: Record<string, "default" | "accent" | "error"> = {
    active: "default",
    triggered: "accent",
    cancelled: "error",
  };
  const badgeLabelMap: Record<string, string> = {
    active: "Watching",
    triggered: "Available",
    cancelled: "Cancelled",
  };
  const badgeVariant = badgeVariantMap[displayStatus] ?? "default";
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
      <SettingRow label="Date Flexibility" value={flexLabel} />
      <SettingRow label="Notify Me Via" value="Email" />
    </div>
  );

  const locationSection = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-data text-smoke uppercase">Location</p>
        <a
          href={`https://www.recreation.gov/camping/campgrounds/${facilityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:opacity-70 transition-opacity"
        >
          <span className="text-label text-wax-muted uppercase underline underline-offset-2">
            View on Recreation.gov
          </span>
          <ArrowUpRight size={16} className="text-wax-muted" />
        </a>
      </div>
      <div className="rounded-lg bg-smoke/10 h-40 flex items-center justify-center">
        <p className="text-label text-smoke">Map coming soon</p>
      </div>
    </div>
  );

  const cancelButton = (
    <div className="flex flex-col gap-3 items-center pt-6 w-full">
      <p className="text-body text-wax-muted">
        No longer interested in {formatCabinName(cabinName)}?
      </p>
      <button
        type="button"
        onClick={() => setShowCancelModal(true)}
        disabled={cancelState === "loading"}
        className="flex items-center gap-1 justify-center w-full hover:opacity-70 transition-opacity disabled:opacity-50"
      >
        <span className="text-label text-ember-selected uppercase underline underline-offset-2 tracking-wider">
          Cancel alert
        </span>
        <Trash2 size={16} className="text-ember-selected" />
      </button>
    </div>
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
      onConfirm={() => { setShowCancelModal(false); handleCancel(); }}
      dismissLabel="Keep watching"
      onDismiss={() => setShowCancelModal(false)}
      variant="destructive"
    />
  );

  // ─── Needs Attention (triggered) ────────────────────────────────────────────
  if (isTriggered) {
    return (
      <>
        <motion.div
          animate={{ opacity: cancelState === "fading" ? 0 : 1 }}
          transition={{ duration: 0.35 }}
          onAnimationComplete={() => { if (cancelState === "fading") router.refresh(); }}
        >
          <div className="bg-evergreen rounded-lg overflow-hidden">
            <div className="bg-ash h-alert-header flex items-center justify-between px-6">
              <span className="text-data text-smoke uppercase">
                Last Checked <span className="text-wax-muted">—</span>
              </span>
            </div>

            <div className="px-20 pt-12 pb-15">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/cabin/${facilityId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-display-fraunces-sm text-white hover:opacity-80 transition-opacity"
                  >
                    {formatCabinName(cabinName)}
                  </Link>
                  {recAreaName && (
                    <p className="text-body text-wax-muted">{recAreaName}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <p className="text-label text-wax-muted uppercase">Dates Watching</p>
                  <p className="text-body text-white">{dateRange}</p>
                </div>
              </div>

              <div className="pt-16">
                <p className="text-body text-smoke">
                  Keep an eye out here for notifications regarding availability
                </p>
              </div>

              <div className="mt-8 h-px bg-smoke/20" />

              <button
                type="button"
                className="w-full pt-6 flex items-center justify-between hover:opacity-80 transition-opacity"
                onClick={() => setMetaVisible(!metaVisible)}
              >
                <div className="flex gap-4 items-center">
                  <span className="text-body text-wax">
                    {metaVisible ? "Hide" : "Show"} alert details
                  </span>
                  <span className="text-body text-wax-muted">
                    settings, history, and more
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: metaVisible ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: expandEase }}
                >
                  <ChevronDown size={24} className="text-wax" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {metaVisible && (
                  <motion.div
                    key="meta"
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: expandEase }}
                  >
                    <div className="pt-16 px-10 flex flex-col gap-12">
                      {settingsRows}
                      {locationSection}
                      {cancelButton}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
        {cancelModal}
      </>
    );
  }

  // ─── Currently Watching / Past Alerts (active | cancelled) ──────────────────
  const showBody = expanded && !isCancelling;

  return (
    <>
      <motion.div
        animate={{ opacity: cancelState === "fading" ? 0 : 1 }}
        transition={{ duration: 0.35 }}
        onAnimationComplete={() => { if (cancelState === "fading") router.refresh(); }}
      >
        <div className="bg-evergreen rounded-lg overflow-hidden">
          <div
            className={`p-5 flex items-center justify-between ${!isCancelling ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => !isCancelling && setExpanded(!expanded)}
          >
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
                <p className="text-display-fraunces-sm text-white">
                  {formatCabinName(cabinName)}
                </p>
                <p className="text-body text-wax-muted">
                  {recAreaName ? `${recAreaName} · ${dateRange}` : dateRange}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={badgeVariant}>{badgeLabel}</Badge>
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
                key="body"
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
        <Pencil size={16} className="text-smoke/60" />
      </div>
    </div>
  );
}
