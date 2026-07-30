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
    if (!selectedCabin || !checkIn || !checkOut) {
      router.push(`/explore`);
    } else {
      router.push(
        `/cabin/${selectedCabin.id}?checkIn=${toDateStr(checkIn)}&checkOut=${toDateStr(checkOut)}`
      );
    }
  }

  return (
    // Below lg the card is dropped entirely — the form sits directly on the page
    // glow, and .field-bare darkens its fields so they still read as inputs.
    <div className="w-full field-bare p-8 bg-ash rounded-2xl">
      <span className="text-eyebrow text-wax/70 uppercase">SET AN ALERT</span>

      <div className="mt-grouped lg:mt-8 space-y-grouped">
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
        className="mt-grouped lg:mt-8 w-full h-12 lg:h-14 bg-ember text-wax rounded-lg lg:rounded-md text-button hover:brightness-110"
      >
        Let&apos;s escape
      </button>
    </div>
  );
}
