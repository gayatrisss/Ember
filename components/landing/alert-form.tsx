import { Calendar } from "lucide-react";
import { Field, FieldControl } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function AlertForm() {
  return (
    <div className="w-full p-8 bg-evergreen rounded-2xl shadow-ember-lg">
      <span className="text-data text-wax/70 uppercase tracking-wider">SET AN ALERT</span>

      <div className="mt-8 space-y-6">
        <Field label="WHERE">
          <Input type="text" autoFocus />
        </Field>

        <Field label="WHEN">
          <FieldControl className="flex items-center gap-3">
            <Calendar size={16} className="text-smoke" />
            <span className="text-body text-wax/85">July 9th – July 12th</span>
          </FieldControl>
        </Field>
      </div>

      <button className="mt-8 w-full h-14 bg-ember text-wax rounded-md text-body hover:brightness-110">
        Let&apos;s escape
      </button>
    </div>
  );
}
