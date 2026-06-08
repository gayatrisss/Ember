"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCabinName, formatDateRange } from "@/lib/format";

type Props = {
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
}: Props) {
  const router = useRouter();
  const isTriggered = status === "triggered";

  // active cards: toggles full expand/collapse
  const [expanded, setExpanded] = useState(false);
  // triggered cards: toggles the metadata section (settings + location)
  const [metaVisible, setMetaVisible] = useState(true);
  const [cancelState, setCancelState] = useState<CancelState>("idle");

  const isCancelling = cancelState !== "idle";
  const displayStatus = isCancelling ? "cancelled" : status;
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
    setTimeout(() => {
      setCancelState("fading");
      setTimeout(() => router.refresh(), 700);
    }, 1500);
  }

  // Shared across both card types
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
      {/* h-40 = 160px ≈ 161px from Figma */}
      <div className="rounded-lg bg-smoke/10 h-40 flex items-center justify-center">
        <p className="text-label text-smoke">Map coming soon</p>
      </div>
    </div>
  );

  // pt-6 (24px) on top of the gap-12 (48px) that separates it from the location section
  const cancelButton = (
    <div className="flex flex-col gap-3 items-center pt-6 w-full">
      <p className="text-body text-wax-muted">
        No longer interested in {formatCabinName(cabinName)}?
      </p>
      <button
        type="button"
        onClick={handleCancel}
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

  // ─── Needs Attention (triggered) ────────────────────────────────────────────
  // Always expanded. Metadata section (settings + location) is separately togglable.
  if (isTriggered) {
    return (
      <div
        className={`transition-opacity duration-700 ${cancelState === "fading" ? "opacity-0" : "opacity-100"}`}
      >
        <div className="bg-evergreen rounded-lg overflow-hidden">
          {/* Header bar — px-6 (24px), h-alert-header (46px) */}
          <div className="bg-ash h-alert-header flex items-center justify-between px-6">
            <span className="text-data text-smoke uppercase">
              Last Checked <span className="text-wax-muted">—</span>
            </span>
          </div>

          {/* Content — px-20 (80px), pt-12 (≈46px), pb-15 (60px) */}
          <div className="px-20 pt-12 pb-15">
            {/* Cabin name (left) + dates watching (right) */}
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
                <p className="text-label text-wax-muted uppercase">
                  Dates Watching
                </p>
                <p className="text-body text-white">{dateRange}</p>
              </div>
            </div>

            {/* Notifications placeholder — pt-16 (64px gap from cabin section) */}
            <div className="pt-16">
              <p className="text-body text-smoke">
                Keep an eye out here for notifications regarding availability
              </p>
            </div>

            {/* Divider — mt-8 above */}
            <div className="mt-8 h-px bg-smoke/20" />

            {/* Metadata toggle — pt-6 below divider, gap-4 between texts */}
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
              {metaVisible ? (
                <ChevronUp size={24} className="text-wax" />
              ) : (
                <ChevronDown size={24} className="text-wax" />
              )}
            </button>

            {/* Metadata — pt-16 gap, px-10 (40px) additional indent = 120px total */}
            {metaVisible && (
              <div className="pt-16 px-10 flex flex-col gap-12">
                {settingsRows}
                {locationSection}
                {/* Cancel — placement TBD */}
                {cancelButton}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Currently Watching (active) ────────────────────────────────────────────
  // The compact row is always rendered so the image never remounts.
  // The body is conditionally rendered below it.
  const showBody = expanded && !isCancelling;
  const showChevronUp = expanded && !isCancelling;

  return (
    <div
      className={`transition-opacity duration-700 ${cancelState === "fading" ? "opacity-0" : "opacity-100"}`}
    >
      <div className="bg-evergreen rounded-lg overflow-hidden">
        {/* Compact row — always in the DOM, no image flicker on expand */}
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
            <StatusBadge status={displayStatus} />
            {showChevronUp ? (
              <ChevronUp size={24} className="text-wax" />
            ) : (
              <ChevronDown size={24} className="text-wax" />
            )}
          </div>
        </div>

        {/* Body — px-30 (120px), py-15 (60px), gap-12 (48px) between sections */}
        {showBody && (
          <div className="px-30 py-15 flex flex-col gap-12">
            {settingsRows}
            {locationSection}
            {/* Cancel — placement TBD */}
            {cancelButton}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: "border-smoke/30 text-smoke",
    triggered: "border-ember/50 text-ember",
    cancelled: "border-smoke/20 text-smoke/50",
  };
  const color = colorMap[status] ?? "border-smoke/30 text-smoke";

  return (
    <div className={`border ${color} rounded-sm px-2 py-0.5`}>
      <span className="text-data uppercase">{status}</span>
    </div>
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
