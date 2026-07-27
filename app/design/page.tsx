"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Info, Mail } from "lucide-react";
import { Field } from "@/components/ui/field";
import { TextInput } from "@/components/ui/text-input";
import { ToggleOptions } from "@/components/ui/toggle-options";
import { RadioOptions } from "@/components/ui/radio-options";
import { CalendarInput } from "@/components/ui/calendar-input";
import { CalendarInputV2 } from "@/components/ui/calendar-input-v2";
import { DateField } from "@/components/ui/date-field";
import {
  DateCell,
  type DateCellState,
  type DateCellPosition,
  type DateCellTheme,
} from "@/components/ui/date-cell";
import {
  DateCellV2,
  type DateCellAvailability,
  type DateCellSelection,
  type DateCellVariant,
} from "@/components/ui/date-cell-v2";
import { ConfirmationAnimations } from "@/components/ui/confirmation-animations";
import StatusBar from "@/components/ui/status-bar";
import { Search } from "@/components/ui/search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/components/ui/toast-provider";
import { Select, type SelectOption } from "@/components/ui/select";

const DATE_CELL_STATES: { label: string; state: DateCellState; position: DateCellPosition }[] = [
  { label: "Default", state: "default", position: "single" },
  { label: "Disabled", state: "disabled", position: "single" },
  { label: "Empty", state: "empty", position: "single" },
  { label: "Day", state: "day", position: "single" },
  { label: "Hover", state: "hover", position: "single" },
  { label: "In range", state: "in-range", position: "single" },
  { label: "Start", state: "selected", position: "start" },
  { label: "End", state: "selected", position: "end" },
  { label: "Selected", state: "selected", position: "single" },
];

const DATE_CELL_THEMES: { theme: DateCellTheme; surface: string; label: string }[] = [
  { theme: "dark", surface: "bg-evergreen", label: "text-smoke/60" },
  { theme: "light", surface: "bg-wax", label: "text-night/50" },
];

// ─── V2 (Direction D) demo data ───────────────────────────────────────────────
const DATE_CELL_V2_STATES: {
  label: string;
  variant?: DateCellVariant;
  availability?: DateCellAvailability;
  alertSet?: boolean;
  selection?: DateCellSelection;
  position?: "single" | "start" | "end";
}[] = [
  { label: "Past", availability: "past" },
  { label: "Booked", availability: "booked" },
  { label: "Open", availability: "open" },
  { label: "Alert · booked", availability: "booked", alertSet: true },
  { label: "Alert · open", availability: "open", alertSet: true },
  { label: "Range", selection: "range" },
  { label: "Start", selection: "selected", position: "start" },
  { label: "End", selection: "selected", position: "end" },
  { label: "Selected", selection: "selected", position: "single" },
  { label: "Hover", selection: "hover", position: "end" },
  { label: "Day", variant: "day-label" },
  { label: "Empty", variant: "empty" },
];

function v2CellContent(variant?: DateCellVariant) {
  if (variant === "day-label") return "Mo";
  if (variant === "empty") return "";
  return "14";
}

// Current month, so real past dates render as the `past` tier. Open/alert days
// are seeded relative to today so the demo survives whatever day it's viewed on.
const V2_TODAY = new Date();
V2_TODAY.setHours(0, 0, 0, 0);
const V2_YEAR = V2_TODAY.getFullYear();
const V2_MONTH = V2_TODAY.getMonth();
const V2_MONTH_KEY = `${V2_YEAR}-${String(V2_MONTH + 1).padStart(2, "0")}`;
const V2_DAYS_IN_MONTH = new Date(V2_YEAR, V2_MONTH + 1, 0).getDate();
const V2_UPCOMING: number[] = [];
for (let d = V2_TODAY.getDate() + 1; d <= V2_DAYS_IN_MONTH; d++) V2_UPCOMING.push(d);

function v2Key(d: number) {
  return `${V2_MONTH_KEY}-${String(d).padStart(2, "0")}T00:00:00Z`;
}
function v2KeySet(days: (number | undefined)[]) {
  return new Set(days.filter((d): d is number => d !== undefined).map(v2Key));
}
const V2_FETCHED = new Set([V2_MONTH_KEY]);
// First two upcoming days = a consecutive alert run (shows the joined pill).
const V2_ALERTED = v2KeySet([V2_UPCOMING[0], V2_UPCOMING[1]]);
const V2_AVAILABLE = v2KeySet([V2_UPCOMING[2], V2_UPCOMING[3], V2_UPCOMING[5], V2_UPCOMING[6]]);

const COLORS = [
  { token: "night", bg: "bg-night", hex: "#0f1510", label: "Page background" },
  { token: "evergreen", bg: "bg-evergreen", hex: "#1a241b", label: "Cards, surfaces" },
  { token: "ember", bg: "bg-ember", hex: "#d45a20", label: "Brand accent, CTAs" },
  { token: "smoke", bg: "bg-smoke", hex: "#5f7a8a", label: "Muted text, secondary UI" },
  { token: "wax", bg: "bg-wax", hex: "#ede8dc", label: "Primary text" },
];

const TYPE_SCALE = [
  {
    cls: "text-display-fraunces",
    label: "Display Fraunces",
    meta: "Fraunces italic 700 · 40→64px",
    sample: "Find your escape",
  },
  {
    cls: "text-display-geist",
    label: "Display Geist",
    meta: "Geist 700 · 40→64px",
    sample: "Find your escape",
  },
  {
    cls: "text-display-fraunces-sm",
    label: "Display Fraunces SM",
    meta: "Fraunces italic 700 · 24px",
    sample: "Trail Creek Cabin",
  },
  { cls: "text-heading", label: "Heading", meta: "Geist 600 · 20px", sample: "How it works" },
  {
    cls: "text-body",
    label: "Body",
    meta: "Geist 400 · 16px",
    sample: "We'll text you the moment it's available.",
  },
  {
    cls: "text-label",
    label: "Label",
    meta: "Geist 500 · 12px",
    sample: "Set an alert · Badges · Disclaimers",
  },
  {
    cls: "text-data",
    label: "Data (Mono)",
    meta: "Geist Mono 400 · 10px",
    sample: "LAST CHECKED 47S AGO · UPPERCASE LABELS",
  },
];

const SHADOWS = [
  { cls: "shadow-ember-sm", label: "shadow-ember-sm", usage: "Inputs, badges" },
  { cls: "shadow-ember-md", label: "shadow-ember-md", usage: "Cards, buttons" },
  { cls: "shadow-ember-lg", label: "shadow-ember-lg", usage: "Page ambient glow" },
];

const SELECT_OPTIONS: SelectOption[] = [
  { value: "1", label: "1 night" },
  { value: "2", label: "2 nights" },
  { value: "3", label: "3 nights" },
  { value: "4", label: "4 nights" },
  { value: "5", label: "5 nights" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-data text-smoke uppercase tracking-widest mb-8">{children}</p>;
}

function VariantLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-data text-smoke/50 uppercase tracking-widest mb-4">{children}</p>;
}

// Shared control to preview button sections in their disabled state.
function DisabledToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle}>
      {on ? "Showing disabled" : "Preview disabled"}
    </Button>
  );
}

export default function DesignPage() {
  const [toggle, setToggle] = useState("email");
  const [radio, setRadio] = useState("immediate");
  const [calIn, setCalIn] = useState<Date | null>(null);
  const [calOut, setCalOut] = useState<Date | null>(null);
  const [calInV2, setCalInV2] = useState<Date | null>(null);
  const [calOutV2, setCalOutV2] = useState<Date | null>(null);
  const [modalVariant, setModalVariant] = useState<"default" | "destructive">("default");
  const [modalOpen, setModalOpen] = useState(false);
  const [showDisabled, setShowDisabled] = useState(false);
  const [dfIn, setDfIn] = useState<Date | null>(null);
  const [dfOut, setDfOut] = useState<Date | null>(null);
  const [selectValue, setSelectValue] = useState("2");
  const { toast } = useToast();

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
            <div
              key={t.cls}
              className="flex flex-col lg:flex-row lg:items-baseline gap-2 lg:gap-12"
            >
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

      {/* Badge */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Badge</SectionLabel>
        <div className="flex flex-col gap-10">
          {(["default", "accent", "error"] as const).map((type) => (
            <div key={type}>
              <VariantLabel>{type}</VariantLabel>
              <div className="flex flex-wrap items-center gap-4">
                <Badge type={type} fill="ghost">Watching</Badge>
                <Badge type={type} fill="fill">Watching</Badge>
                <Badge type={type} fill="ghost" size="small">Watching</Badge>
                <Badge type={type} fill="fill" size="small">Watching</Badge>
                <Badge type={type} fill="ghost" size="pill">Watching</Badge>
                <Badge type={type} fill="fill" size="pill">Watching</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Buttons</SectionLabel>
        <div className="mb-8">
          <DisabledToggle on={showDisabled} onToggle={() => setShowDisabled((v) => !v)} />
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-start gap-3">
            <VariantLabel>primary</VariantLabel>
            <Button variant="primary" disabled={showDisabled}>Set an alert</Button>
          </div>
          <div className="flex flex-col items-start gap-3">
            <VariantLabel>ghost</VariantLabel>
            <Button variant="ghost" disabled={showDisabled}>Keep watching</Button>
          </div>
          <div className="flex flex-col items-start gap-3">
            <VariantLabel>destructive</VariantLabel>
            <Button variant="destructive" disabled={showDisabled}>Cancel alert</Button>
          </div>
          <div className="flex flex-col items-start gap-3">
            <VariantLabel>link</VariantLabel>
            <Button variant="link" disabled={showDisabled}>View details</Button>
          </div>
          <div className="flex flex-col items-start gap-3">
            <VariantLabel>icon · ghost</VariantLabel>
            <div className="flex gap-2">
              <IconButton icon={ArrowLeft} label="Previous" disabled={showDisabled} />
              <IconButton icon={ArrowRight} label="Next" disabled={showDisabled} />
            </div>
          </div>
        </div>
      </section>

      {/* Toast */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Toast</SectionLabel>
        <VariantLabel>Fire via useToast() — top-right, auto-dismiss</VariantLabel>
        <div className="flex flex-wrap gap-4 mb-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({ intent: "info", title: "Heads up", description: "An informational message.", icon: <Info size={24} /> })
            }
          >
            Info toast
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({ intent: "success", title: "Preview sent!", description: "Check your inbox.", icon: <Info size={24} /> })
            }
          >
            Success toast
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({ intent: "error", title: "Couldn't send", description: "Something went wrong.", icon: <Info size={24} /> })
            }
          >
            Error toast
          </Button>
        </div>
        <VariantLabel>Inline visual</VariantLabel>
        <div className="flex flex-col gap-4 max-w-toast">
          <Toast
            intent="info"
            title="Heads up"
            description="An informational message for the user."
            icon={<Info size={24} />}
          />
          <Toast
            intent="success"
            title="Preview sent!"
            description="Check your inbox for the sample email."
            icon={<Info size={24} />}
          />
          <Toast
            intent="error"
            title="Couldn't send"
            description="Something went wrong. Please try again."
            icon={<Info size={24} />}
          />
        </div>
      </section>

      {/* Modal */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Modal</SectionLabel>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col items-start gap-3">
            <VariantLabel>default</VariantLabel>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setModalVariant("default"); setModalOpen(true); }}
            >
              Open modal
            </Button>
          </div>
          <div className="flex flex-col items-start gap-3">
            <VariantLabel>destructive</VariantLabel>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setModalVariant("destructive"); setModalOpen(true); }}
            >
              Open destructive modal
            </Button>
          </div>
        </div>
        <Modal
          isOpen={modalOpen}
          title={modalVariant === "destructive" ? "Cancel this alert?" : "Confirm action"}
          description={
            modalVariant === "destructive"
              ? "Once cancelled, you won't receive any more notifications for Trail Creek Cabin."
              : "Are you sure you want to proceed with this action?"
          }
          confirmLabel={modalVariant === "destructive" ? "Yes, cancel alert" : "Confirm"}
          onConfirm={() => setModalOpen(false)}
          dismissLabel="Keep watching"
          onDismiss={() => setModalOpen(false)}
          variant={modalVariant}
        />
      </section>

      {/* Fields */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Fields</SectionLabel>
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
                <TextInput
                  variant="outline"
                  icon={<Mail size={16} />}
                  placeholder="your@email.com"
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-sm">
          <VariantLabel>Date field</VariantLabel>
          <div className="bg-evergreen rounded-xl p-6">
            <DateField
              label="DATES"
              checkIn={dfIn}
              checkOut={dfOut}
              onChange={(i, o) => {
                setDfIn(i);
                setDfOut(o);
              }}
            />
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

      {/* Select */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Select</SectionLabel>
        <div className="max-w-md">
          <div className="bg-evergreen rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-2 text-body text-wax">
              <span>Alert me when at least</span>
              <Select
                value={selectValue}
                onChange={setSelectValue}
                options={SELECT_OPTIONS}
                ariaLabel="Minimum nights"
              />
              <span>{selectValue === "1" ? "opens" : "open"} up in your date range.</span>
            </div>
            <p className="text-data text-smoke mt-5">
              Selected: <span className="text-ember">{selectValue}</span>
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
                {
                  label: "Immediately",
                  value: "immediate",
                  description: "Get notified the moment a spot opens.",
                },
                {
                  label: "Daily digest",
                  value: "daily",
                  description: "One summary email each morning.",
                },
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
        <div className="flex flex-col gap-6">
          {DATE_CELL_THEMES.map(({ theme, surface, label: labelCls }) => (
            <div key={theme} className={`${surface} rounded-xl p-6`}>
              <div className="flex flex-wrap gap-8">
                {DATE_CELL_STATES.map(({ label, state, position }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <DateCell state={state} position={position} theme={theme}>
                      {state === "day" ? "Mo" : "14"}
                    </DateCell>
                    <span className={`text-data ${labelCls} uppercase tracking-widest`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CalendarInput */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>CalendarInput</SectionLabel>
        <div className="flex flex-wrap gap-6">
          <div className="bg-evergreen rounded-xl p-6 w-fit">
            <CalendarInput
              checkIn={calIn}
              checkOut={calOut}
              onChange={(i, o) => {
                setCalIn(i);
                setCalOut(o);
              }}
            />
          </div>
          <div className="bg-wax rounded-xl p-6 w-fit">
            <CalendarInput
              theme="light"
              checkIn={calIn}
              checkOut={calOut}
              onChange={(i, o) => {
                setCalIn(i);
                setCalOut(o);
              }}
            />
          </div>
        </div>
      </section>

      {/* Date Cell States V2 (Direction D) */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>Date Cell States · V2 (Direction D)</SectionLabel>
        <div className="flex flex-col gap-6">
          {DATE_CELL_THEMES.map(({ theme, surface, label: labelCls }) => (
            <div key={theme} className={`${surface} rounded-xl p-6`}>
              <div className="flex flex-wrap gap-8">
                {DATE_CELL_V2_STATES.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-2">
                    <DateCellV2
                      variant={s.variant}
                      availability={s.availability}
                      alertSet={s.alertSet}
                      selection={s.selection}
                      position={s.position}
                      theme={theme}
                    >
                      {v2CellContent(s.variant)}
                    </DateCellV2>
                    <span className={`text-data ${labelCls} uppercase tracking-widest`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CalendarInput V2 (Direction D) */}
      <section className="page-container border-b border-wax/10 py-16">
        <SectionLabel>CalendarInput · V2 (Direction D)</SectionLabel>
        <div className="flex flex-wrap gap-6">
          <div className="bg-evergreen rounded-xl p-6 w-fit">
            <CalendarInputV2
              checkIn={calInV2}
              checkOut={calOutV2}
              onChange={(i, o) => {
                setCalInV2(i);
                setCalOutV2(o);
              }}
              initialMonth={V2_MONTH}
              initialYear={V2_YEAR}
              availableDates={V2_AVAILABLE}
              fetchedMonths={V2_FETCHED}
              alertedDates={V2_ALERTED}
            />
          </div>
          <div className="bg-wax rounded-xl p-6 w-fit">
            <CalendarInputV2
              theme="light"
              checkIn={calInV2}
              checkOut={calOutV2}
              onChange={(i, o) => {
                setCalInV2(i);
                setCalOutV2(o);
              }}
              initialMonth={V2_MONTH}
              initialYear={V2_YEAR}
              availableDates={V2_AVAILABLE}
              fetchedMonths={V2_FETCHED}
              alertedDates={V2_ALERTED}
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
