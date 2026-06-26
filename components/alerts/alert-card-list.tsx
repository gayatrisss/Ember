"use client";

import { AlertCard, type AlertCardProps } from "@/components/alerts/alert-card";

export function AlertCardList({
  alerts,
  targetAlertId,
}: {
  alerts: AlertCardProps[];
  // Deep-link target (from ?alert=<id>): this card gets the id anchor's scroll/glow
  // and starts expanded.
  targetAlertId?: string;
}) {
  return (
    <div className="mt-section-content flex flex-col gap-6">
      {alerts.map((alert) => (
        <div
          key={alert.alertId}
          id={`alert-${alert.alertId}`}
          className="rounded-lg transition-shadow duration-700"
        >
          <AlertCard {...alert} defaultExpanded={alert.alertId === targetAlertId} />
        </div>
      ))}
    </div>
  );
}
