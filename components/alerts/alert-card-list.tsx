"use client";

import { AlertCard, type AlertCardProps } from "@/components/alerts/alert-card";

export function AlertCardList({ alerts }: { alerts: AlertCardProps[] }) {
  return (
    <div className="mt-section-content flex flex-col gap-6">
      {alerts.map((alert) => (
        <AlertCard key={alert.alertId} {...alert} />
      ))}
    </div>
  );
}
