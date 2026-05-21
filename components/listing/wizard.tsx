"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { TextInput } from "@/components/ui/text-input";
import { ToggleOptions } from "@/components/ui/toggle-options";
import { ConfirmationAnimations } from "@/components/ui/confirmation-animations";

type WizardProps = { cabinName: string };

export default function Wizard({ cabinName }: WizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState("email");

  return (
    <div>
      {step === 1 && (
        <div>
          <p className="text-data uppercase tracking-widest text-ember">
            SELECT YOUR TRAVEL DAYS
          </p>
          <div className="flex gap-6 mt-6">
            <Field label="CHECK IN">
              <TextInput type="text" placeholder="mm / dd / yyyy" />
            </Field>
            <Field label="CHECK OUT">
              <TextInput type="text" placeholder="mm / dd / yyyy" />
            </Field>
          </div>
          <button
            onClick={() => setStep(2)}
            className="mt-8 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-data uppercase tracking-widest text-ember">
            SET UP YOUR ALERT
          </p>
          <div className="mt-6">
            <ToggleOptions
              options={[
                { label: "Email", value: "email" },
                { label: "SMS", value: "sms" },
              ]}
              value={method}
              onChange={setMethod}
            />
          </div>
          <div className="mt-6">
            <Field label="EMAIL ADDRESS">
              <TextInput type="email" placeholder="your@email.com" />
            </Field>
          </div>
          <button
            onClick={() => setStep(3)}
            className="mt-8 w-full bg-ember text-wax text-body px-6 py-3 rounded-lg hover:brightness-110"
          >
            Continue
          </button>
        </div>
      )}

      {step === 3 && <ConfirmationAnimations cabinName={cabinName} />}
    </div>
  );
}
