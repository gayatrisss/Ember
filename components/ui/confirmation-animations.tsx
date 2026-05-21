import { Check } from "lucide-react";

type ConfirmationAnimationsProps = {
  cabinName: string;
};

export function ConfirmationAnimations({ cabinName }: ConfirmationAnimationsProps) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full bg-ember/10 animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-evergreen border border-ember/50 flex items-center justify-center shadow-ember-md">
          <Check size={24} className="text-ember" />
        </div>
      </div>
      <p className="text-display-fraunces-sm text-wax mt-8">{cabinName}</p>
      <p className="text-body text-wax/70 mt-4">
        We&apos;ll text you the moment it&apos;s available.
      </p>
    </div>
  );
}
