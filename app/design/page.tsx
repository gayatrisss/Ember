"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Field } from "@/components/ui/field";
import { TextInput } from "@/components/ui/text-input";
import { ToggleOptions } from "@/components/ui/toggle-options";
import { RadioOptions } from "@/components/ui/radio-options";
import { CalendarInput } from "@/components/ui/calendar-input";
import { DateCell, type DateCellState, type DateCellPosition } from "@/components/ui/date-cell";
import { ConfirmationAnimations } from "@/components/ui/confirmation-animations";
import StatusBar from "@/components/ui/status-bar";
import { Search } from "@/components/ui/search";

const COLORS = [
  { token: "night", bg: "bg-night", hex: "#0f1510", label: "Page background" },
  { token: "evergreen", bg: "bg-evergreen", hex: "#1a241b", label: "Cards, surfaces" },
  { token: "ember", bg: "bg-ember", hex: "#d45a20", label: "Brand accent, CTAs" },
  { token: "smoke", bg: "bg-smoke", hex: "#5f7a8a", label: "Muted text, secondary UI" },
  { token: "wax", bg: "bg-wax", hex: "#ede8dc", label: "Primary text" },
];

const TYPE_SCALE = [
  { cls: "text-display-fraunces", label: "Display Fraunces", meta: "Fraunces italic 700 · 40→64px", sample: "Find your escape" },
  { cls: "text-display-geist", label: "Display Geist", meta: "Geist 700 · 40→64px", sample: "Find your escape" },
  { cls: "text-display-fraunces-sm", label: "Display Fraunces SM", meta: "Fraunces italic 700 · 24px", sample: "Trail Creek Cabin" },
  { cls: "text-heading", label: "Heading", meta: "Geist 600 · 20px", sample: "How it works" },
  { cls: "text-body", label: "Body", meta: "Geist 400 · 16px", sample: "We'll text you the moment it's available." },
  { cls: "text-label", label: "Label", meta: "Geist 500 · 12px", sample: "Set an alert · Badges · Disclaimers" },
  { cls: "text-data", label: "Data (Mono)", meta: "Geist Mono 400 · 10px", sample: "LAST CHECKED 47S AGO · UPPERCASE LABELS" },
];

const SHADOWS = [
  { cls: "shadow-ember-sm", label: "shadow-ember-sm", usage: "Inputs, badges" },
  { cls: "shadow-ember-md", label: "shadow-ember-md", usage: "Cards, buttons" },
  { cls: "shadow-ember-lg", label: "shadow-ember-lg", usage: "Page ambient glow" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-data text-smoke uppercase tracking-widest mb-8">{children}</p>;
}

function VariantLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-data text-smoke/50 uppercase tracking-widest mb-4">{children}</p>;
}

export default function DesignPage() {
  const [toggle, setToggle] = useState("email");
  const [radio, setRadio] = useState("immediate");
  const [calIn, setCalIn] = useState<Date | null>(null);
  const [calOut, setCalOut] = useState<Date | null>(null);

  return (
    <div className="min-h-screen bg-night">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-wax/10 bg-night/95 backdrop-blur-sm">
        <div className="page-container flex items-center justify-between h-14">
          <span className="text-display-fraunces-sm text-ember">Ember</span>
          <span className="text-data text-smoke uppercase tracking-widest">Design System</span>
        </div>
      </header>

      {/* Colors */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Colors</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {COLORS.map((c) => (
            <div key={c.token}>
              <div className={`${c.bg} h-16 rounded-lg border border-wax/10 mb-3`} />
              <p className="text-body text-wax">{c.token}</p>
              <p className="text-data text-smoke mt-1">{c.hex}</p>
              <p className="text-data text-smoke/60 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Typography</SectionLabel>
        <div className="space-y-10">
          {TYPE_SCALE.map((t) => (
            <div key={t.cls} className="flex flex-col lg:flex-row lg:items-baseline gap-2 lg:gap-12">
              <div className="lg:w-48 shrink-0">
                <p className="text-data text-smoke uppercase tracking-widest">{t.label}</p>
                <p className="text-data text-smoke/50 mt-1">{t.meta}</p>
              </div>
              <p className={`${t.cls} text-wax`}>{t.sample}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Shadows</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SHADOWS.map((s) => (
            <div key={s.cls} className={`bg-evergreen rounded-xl p-8 ${s.cls}`}>
              <p className="text-body text-wax">{s.label}</p>
              <p className="text-data text-smoke mt-2">{s.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Field + TextInput */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Field + TextInput</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <VariantLabel>Underline (default)</VariantLabel>
            <div className="space-y-6 bg-evergreen rounded-xl p-6">
              <Field label="PLACEHOLDER STATE">
                <TextInput placeholder="your@email.com" />
              </Field>
              <Field label="FILLED STATE">
                <TextInput defaultValue="hello@ember.app" />
              </Field>
              <Field label="WITH ICON">
                <TextInput icon={<Mail size={16} />} placeholder="your@email.com" />
              </Field>
            </div>
          </div>
          <div>
            <VariantLabel>Outline variant</VariantLabel>
            <div className="space-y-6 bg-evergreen rounded-xl p-6">
              <Field label="PLACEHOLDER STATE">
                <TextInput variant="outline" placeholder="your@email.com" />
              </Field>
              <Field label="FILLED STATE">
                <TextInput variant="outline" defaultValue="hello@ember.app" />
              </Field>
              <Field label="WITH ICON">
                <TextInput variant="outline" icon={<Mail size={16} />} placeholder="your@email.com" />
              </Field>
            </div>
          </div>
        </div>
      </section>

      {/* ToggleOptions */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>ToggleOptions</SectionLabel>
        <div className="max-w-xs">
          <div className="bg-evergreen rounded-xl p-6">
            <ToggleOptions
              options={[
                { label: "Email", value: "email" },
                { label: "SMS", value: "sms" },
                { label: "Both", value: "both" },
              ]}
              value={toggle}
              onChange={setToggle}
            />
            <p className="text-data text-smoke mt-5">
              Selected: <span className="text-ember">{toggle}</span>
            </p>
          </div>
        </div>
      </section>

      {/* RadioOptions */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>RadioOptions</SectionLabel>
        <div className="max-w-sm">
          <div className="bg-evergreen rounded-xl p-6">
            <RadioOptions
              name="notification-timing"
              options={[
                { label: "Immediately", value: "immediate", description: "Get notified the moment a spot opens." },
                { label: "Daily digest", value: "daily", description: "One summary email each morning." },
                { label: "Weekly", value: "weekly" },
              ]}
              value={radio}
              onChange={setRadio}
            />
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Search</SectionLabel>
        <div className="max-w-sm">
          <div className="bg-evergreen rounded-xl p-6">
            <Search />
          </div>
        </div>
      </section>

      {/* Date Cell States */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Date Cell States</SectionLabel>
        <div className="bg-evergreen rounded-xl p-6">
          <div className="flex flex-wrap gap-8">
            {(
              [
                { label: "Default",  state: "default",   position: "single" },
                { label: "Disabled", state: "disabled",  position: "single" },
                { label: "Day",      state: "day",        position: "single" },
                { label: "Hover",    state: "hover",      position: "single" },
                { label: "In range", state: "in-range",   position: "single" },
                { label: "Start",    state: "selected",   position: "start"  },
                { label: "End",      state: "selected",   position: "end"    },
                { label: "Selected", state: "selected",   position: "single" },
              ] as { label: string; state: DateCellState; position: DateCellPosition }[]
            ).map(({ label, state, position }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <DateCell state={state} position={position}>
                  {state === "day" ? "Mo" : "14"}
                </DateCell>
                <span className="text-data text-smoke/60 uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CalendarInput */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>CalendarInput</SectionLabel>
        <div className="w-fit">
          <div className="bg-evergreen rounded-xl p-6">
            <CalendarInput
              checkIn={calIn}
              checkOut={calOut}
              onChange={(i, o) => { setCalIn(i); setCalOut(o); }}
            />
          </div>
        </div>
      </section>

      {/* ConfirmationAnimations */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>ConfirmationAnimations</SectionLabel>
        <div className="max-w-xs">
          <div className="bg-evergreen rounded-xl overflow-hidden">
            <ConfirmationAnimations cabinName="Trail Creek Cabin" />
          </div>
        </div>
      </section>

      {/* StatusBar — rendered outside page-container for true full-width */}
      <section className="py-16 pb-24">
        <div className="page-container mb-8">
          <SectionLabel>StatusBar</SectionLabel>
        </div>
        <StatusBar />
      </section>
    </div>
  );
}
