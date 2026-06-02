type Option = { label: string; value: string; description?: string };

type RadioOptionsProps = {
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export function RadioOptions({ name, options, value, onChange }: RadioOptionsProps) {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className="flex items-start gap-3 w-full text-left group"
        >
          <div
            className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              value === opt.value ? "border-ember" : "border-wax/30 group-hover:border-wax/60"
            }`}
          >
            {value === opt.value && <div className="w-2 h-2 rounded-full bg-ember" />}
          </div>
          <div>
            <p className="text-body text-wax">{opt.label}</p>
            {opt.description && <p className="text-label text-wax/60 mt-1">{opt.description}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}
