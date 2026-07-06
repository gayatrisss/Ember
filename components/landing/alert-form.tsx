"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "@/components/ui/search";
import { DateField } from "@/components/ui/date-field";
import { type Cabin } from "@/components/ui/use-cabin-search";

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AlertForm() {
  const router = useRouter();
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  // Picking a cabin fills the search input (handled in Search) and immediately
  // opens the calendar so the user is pushed to choose dates next.
  function handleCabinSelect(cabin: Cabin) {
    setSelectedCabin(cabin);
    setCalOpen(true);
  }

  function handleSubmit() {
    if (!selectedCabin || !checkIn || !checkOut) return;
    router.push(
      `/cabin/${selectedCabin.id}?checkIn=${toDateStr(checkIn)}&checkOut=${toDateStr(checkOut)}`
    );
  }

  const canSubmit = !!selectedCabin && !!checkIn && !!checkOut;

  return (
    <div className="w-full p-8 bg-evergreen rounded-2xl shadow-ember-lg">
      <span className="text-data text-wax/70 uppercase tracking-wider">SET AN ALERT</span>

      <div className="mt-8 space-y-6">
        <Search onSelect={handleCabinSelect} />

        <DateField
          label="WHEN"
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(i, o) => {
            setCheckIn(i);
            setCheckOut(o);
          }}
          open={calOpen}
          onOpenChange={setCalOpen}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-8 w-full h-14 bg-ember text-wax rounded-md text-body hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
      >
        Let&apos;s escape
      </button>
    </div>
  );
}
